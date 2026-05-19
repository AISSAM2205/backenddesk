package ma.attijariwafa.desk_international.service;

import com.opencsv.CSVReader;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import ma.attijariwafa.desk_international.entity.*;
import ma.attijariwafa.desk_international.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

import static java.math.BigDecimal.ZERO;

/**
 * CsvImportService — importe le Blotter Excel (converti en CSV) dans la base de données.
 *
 * Chaque ligne du CSV = 1 trade (achat ou vente).
 * Il y a deux types de trades :
 *   - Bond (obligation) : on calcule le WAP et le P&L réalisé
 *   - Future          : on calcule le MtM PnL (Mark-to-Market)
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CsvImportService {

    // ── Repositories injectés automatiquement par Spring ────────────────────
    private final TradeRepository        tradeRepo;   // pour sauvegarder les trades
    private final InstrumentRepository   instrRepo;   // pour chercher un bond par ISIN
    private final CsvUploadLogRepository logRepo;     // pour logger l'import
    private final WapCalculatorService   wapService;  // pour calculer WAP et P&L

    // Format de date utilisé dans le CSV (ex: "15/03/2024")
    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    /**
     * Table de correspondance : description du bond dans le CSV → son code ISIN.
     * Nécessaire car la colonne AE du Blotter contient la description,
     * pas l'ISIN directement.
     */
    private static final Map<String, String> DESC_TO_ISIN = Map.ofEntries(
            Map.entry("MOROC 5.95 03/08/28",  "XS2595028452"),
            Map.entry("MOROC 2 3/8 12/15/27", "XS2270576619"),
            Map.entry("MOROC 1 3/8 03/30/26", "XS2239830222"),
            Map.entry("MOROC 2 09/30/30",     "XS2239829216"),
            Map.entry("MOROC 1 1/2 11/27/31", "XS2080771806"),
            Map.entry("MOROC 3 12/15/32",     "XS2270576965"),
            Map.entry("MOROC 6 1/2 09/08/33", "XS2595028700"),
            Map.entry("MOROC 4 3/4 04/02/35", "XS3041322051"),
            Map.entry("MOROC 3 7/8 04/02/29", "XS3041270664"),
            Map.entry("OCPMR 3 3/4 06/23/31", "XS2355149316"),
            Map.entry("OCPMR 6 3/4 05/02/34", "XS2810168737"),
            Map.entry("OCPMR 6.1 04/30/30",   "XS3040572979")
    );

    // ════════════════════════════════════════════════════════════════════════
    // MÉTHODE PRINCIPALE : appelée par TradeController.uploadCsv()
    // ════════════════════════════════════════════════════════════════════════

    /**
     * Lit le fichier CSV ligne par ligne et sauvegarde chaque trade en base.
     *
     * @param file     le fichier .csv envoyé par Postman / le frontend
     * @param username le nom de l'utilisateur qui fait l'import (pour le log)
     * @return un résumé de l'import (nb lignes importées, nb erreurs, durée)
     */
    @Transactional
    public CsvUploadLog ingestCsv(MultipartFile file, String username) {

        long startTime = System.currentTimeMillis();

        // 1. Créer un log d'import en base (statut PROCESSING au départ)
        CsvUploadLog uploadLog = creerLogImport(file.getOriginalFilename(), username);

        int nbSauvegardes = 0;
        List<String> erreurs = new ArrayList<>();

        // 2. Ouvrir et lire le fichier CSV
        try (CSVReader reader = new CSVReader(
                new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {

            reader.readNext(); // ignorer la 1ère ligne (en-tête du CSV)

            String[] colonnes;
            int numeroLigne = 1;

            // 3. Traiter chaque ligne du CSV
            while ((colonnes = reader.readNext()) != null) {
                numeroLigne++;
                try {
                    traiterUneLigne(colonnes, uploadLog.getId());
                    nbSauvegardes++;
                } catch (Exception e) {
                    // Une ligne en erreur ne bloque pas les autres
                    log.warn("Ligne {} ignorée : {}", numeroLigne, e.getMessage());
                    erreurs.add("Ligne " + numeroLigne + " : " + e.getMessage());
                }
            }

        } catch (Exception e) {
            log.error("Impossible de lire le fichier CSV", e);
        }

        // 4. Mettre à jour le log avec le résultat final
        return finaliserLog(uploadLog, nbSauvegardes, erreurs.size(), startTime);
    }

    // ════════════════════════════════════════════════════════════════════════
    // MÉTHODES PRIVÉES — chaque méthode fait UNE seule chose
    // ════════════════════════════════════════════════════════════════════════

    /**
     * Traite une ligne du CSV : convertit les colonnes en Trade, calcule
     * le WAP / P&L selon le type (Bond ou Future), puis sauvegarde.
     */
    private void traiterUneLigne(String[] colonnes, Long uploadLogId) {

        // Convertir les colonnes brutes en objet Trade
        Trade trade = construireTrade(colonnes);
        trade.setUploadLogId(uploadLogId);

        boolean cEstUnFuture = "R Futures".equals(trade.getSubAsset());

        if (cEstUnFuture) {
            calculerMtmFuture(trade);
        } else {
            calculerWapEtPnlBond(trade);
        }

        tradeRepo.save(trade);
    }

    /**
     * Pour un BOND :
     * - Si BUY  → calculer le nouveau WAP Dirty (prix moyen pondéré)
     * - Si SELL → calculer le P&L réalisé = (prix_vente - WAP) × nominal
     */
    private void calculerWapEtPnlBond(Trade trade) {
        String isin = trade.getAssetIdentifier();

        if ("BUY".equals(trade.getWay())) {
            // On sauvegarde d'abord ce BUY pour l'inclure dans le calcul WAP
            tradeRepo.save(trade);

            // Recalculer le WAP avec ce nouveau BUY inclus
            BigDecimal wapDirty = wapService.calculateWapDirty(isin);
            BigDecimal accrued  = trade.getAccrued() != null ? trade.getAccrued() : ZERO;

            trade.setWapDirty(wapDirty);
            trade.setWapClean(wapDirty.subtract(accrued)); // WAP Clean = WAP Dirty - Couru

        } else { // SELL
            // Le WAP ne change PAS lors d'une vente, on le lit simplement
            BigDecimal wapDirty = wapService.calculateWapDirty(isin);

            // P&L réalisé = (prix de vente - WAP) × nominal vendu
            BigDecimal pnlRealise = wapService.calcRealizedPnl(
                    trade.getDirtyPrice(), wapDirty, trade.getNominal());

            trade.setWapDirty(wapDirty);
            trade.setRealizedPnl(pnlRealise);
        }
    }

    /**
     * Pour un FUTURE :
     * Calculer le MtM PnL = (prix actuel - prix d'entrée) × nb contrats × taille contrat
     * (positif si on a vendu et le prix a baissé, négatif sinon)
     */
    private void calculerMtmFuture(Trade trade) {
        boolean donneesPresentes = trade.getLastPrice()  != null
                && trade.getCleanPrice() != null;
        if (donneesPresentes) {
            BigDecimal mtmPnl = wapService.calcFutureMtm(
                    trade.getWay(),
                    trade.getLastPrice(),   // prix actuel du marché
                    trade.getCleanPrice(),  // prix d'entrée (entry price)
                    trade.getNbContracts(),
                    trade.getContractSize()
            );
            trade.setMtmPnl(mtmPnl);
        }
    }

    /**
     * Convertit un tableau de colonnes CSV en objet Trade.
     * Les indices des colonnes correspondent à la structure du Blotter Excel.
     *
     * Colonnes importantes :
     *   [0]  ISIN ou ticker
     *   [1]  Date de trade
     *   [2]  Date de valeur
     *   [3]  Sens (BUY / SELL)
     *   [4]  Nominal
     *   [5]  Prix clean (ou prix d'entrée pour les futures)
     *   [6]  Couru (accrued interest) — bonds uniquement
     *   [9]  G-Spread
     *   [10] Contrepartie
     *   [13] isClosed
     *   [14] WAP Dirty (si déjà calculé dans Excel)
     *   [16] P&L réalisé (si déjà calculé dans Excel)
     *   [17] Sous-catégorie ("R Futures" ou "Mor Bond" etc.)
     *   [19] Description du bond couvert (pour les futures)
     *   [20] Dernier prix (lastPrice, pour les futures)
     */
    private Trade construireTrade(String[] c) {
        boolean cEstUnFuture = c.length > 17 && "R Futures".equals(c[17].trim());
        BigDecimal nominal   = new BigDecimal(c[4].trim()).abs();

        // Champs communs à tous les trades
        Trade.TradeBuilder builder = Trade.builder()
                .tradeDate(   LocalDate.parse(c[1].trim(), DATE_FORMAT))
                .valueDate(   estVide(c, 2) ? null : LocalDate.parse(c[2].trim(), DATE_FORMAT))
                .way(         c[3].trim().toUpperCase())   // "BUY" ou "SELL"
                .nominal(     nominal)
                .gSpread(     estVide(c, 9)  ? null : new BigDecimal(c[9].trim()))
                .counterparty(estVide(c, 10) ? null : c[10].trim())
                .subAsset(    c.length > 17  ? c[17].trim() : (cEstUnFuture ? "R Futures" : "Mor Bond"))
                .isClosed(    c.length > 13  && Boolean.parseBoolean(c[13].trim()));

        if (!cEstUnFuture) {
            // ── Champs spécifiques à un BOND ──────────────────────────────
            BigDecimal prixClean = new BigDecimal(c[5].trim());
            BigDecimal couru     = estVide(c, 6) ? ZERO : new BigDecimal(c[6].trim());

            builder.assetIdentifier(c[0].trim())
                    .cleanPrice( prixClean)
                    .accrued(    couru)
                    .dirtyPrice( prixClean.add(couru)) // Dirty = Clean + Couru
                    .bondInstrument(instrRepo.findById(c[0].trim()).orElse(null));

            // WAP et P&L déjà présents dans le CSV (colonnes Excel) → on les lit
            if (!estVide(c, 14)) builder.wapDirty(   new BigDecimal(c[14].trim()));
            if (!estVide(c, 16)) builder.realizedPnl( new BigDecimal(c[16].trim()));

        } else {
            // ── Champs spécifiques à un FUTURE ────────────────────────────
            builder.assetIdentifier(c[0].trim())      // ticker ex: "FVH5 Comdty"
                    .cleanPrice(  new BigDecimal(c[5].trim())) // prix d'entrée
                    .nbContracts( nominal.intValue())
                    .contractSize(new BigDecimal("100000"));   // taille standard US Treasury

            // Lier ce future au bond qu'il couvre (colonne 19 = description du bond)
            if (!estVide(c, 19)) {
                String isinBondCouvert = DESC_TO_ISIN.get(c[19].trim());
                builder.hedBondIsin(isinBondCouvert);
            }

            // Dernier prix de marché (pour calculer le MtM PnL)
            if (!estVide(c, 20)) {
                builder.lastPrice(new BigDecimal(c[20].trim()));
            }
        }

        return builder.build();
    }

    // ════════════════════════════════════════════════════════════════════════
    // MÉTHODES UTILITAIRES
    // ════════════════════════════════════════════════════════════════════════

    /** Crée et sauvegarde un log d'import avec le statut initial "PROCESSING". */
    private CsvUploadLog creerLogImport(String filename, String username) {
        CsvUploadLog log = CsvUploadLog.builder()
                .filename(   filename)
                .uploadedBy( username)
                .uploadedAt( LocalDateTime.now())
                .status(     "PROCESSING")
                .build();
        return logRepo.save(log);
    }

    /** Met à jour le log d'import avec les résultats finaux. */
    private CsvUploadLog finaliserLog(CsvUploadLog uploadLog,
                                      int nbSauvegardes,
                                      int nbErreurs,
                                      long startTime) {
        uploadLog.setImportedCount(nbSauvegardes);
        uploadLog.setErrorCount(   nbErreurs);
        uploadLog.setStatus(       nbErreurs == 0 ? "SUCCESS" : "PARTIAL");
        uploadLog.setDurationMs(   (int)(System.currentTimeMillis() - startTime));
        return logRepo.save(uploadLog);
    }

    /**
     * Vérifie si une cellule du CSV est vide ou absente.
     * Évite les NullPointerException et NumberFormatException.
     */
    private boolean estVide(String[] colonnes, int index) {
        return colonnes.length <= index
                || colonnes[index] == null
                || colonnes[index].isBlank();
    }
}