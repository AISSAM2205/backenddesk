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
import java.nio.charset.Charset;
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

    // ── Indices des colonnes du Blotter Excel exporté en CSV (0-based) ──────
    // Blotter Excel colonnes : A-G = données techniques, H(7)=IsClosed, I(8)=AssetClass,
    // J(9)=SubAsset, L(11)=TradeDate, M(12)=ValueDate, N(13)=ISIN, P(15)=Way,
    // Q(16)=Nominal, R(17)=Ctp, S(18)=CleanPrice, T(19)=Accrued,
    // Y(24)=P&LRéal, Z(25)=GSpread, AD(29)=BondDesc, AE(30)=LastPrice
    private static final int COL_IS_CLOSED   =  7;
    private static final int COL_SUB_ASSET   =  9;
    private static final int COL_TRADE_DATE  = 11;
    private static final int COL_VALUE_DATE  = 12;
    private static final int COL_ISIN        = 13;
    private static final int COL_WAY         = 15;
    private static final int COL_NOMINAL     = 16;
    private static final int COL_COUNTERPARTY= 17;
    private static final int COL_CLEAN_PRICE = 18;
    private static final int COL_ACCRUED     = 19;
    private static final int COL_PNL_REAL    = 24;
    private static final int COL_G_SPREAD    = 25;
    private static final int COL_BOND_DESC   = 29;
    private static final int COL_LAST_PRICE  = 30;

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
        // Excel exporte en Windows-1252 par défaut — on essaie UTF-8 d'abord (BOM), sinon CP1252
        Charset charset = detecterEncodage(file);
        try (CSVReader reader = new CSVReader(
                new InputStreamReader(file.getInputStream(), charset))) {

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
     * Les indices correspondent à l'export brut du Blotter Excel (voir constantes COL_*).
     */
    private Trade construireTrade(String[] c) {
        String subAsset     = estVide(c, COL_SUB_ASSET) ? "Mor Bond" : c[COL_SUB_ASSET].trim();
        boolean cEstUnFuture = "R Futures".equals(subAsset);
        BigDecimal nominal   = new BigDecimal(c[COL_NOMINAL].trim()).abs();
        String isin          = c[COL_ISIN].trim();

        Trade.TradeBuilder builder = Trade.builder()
                .tradeDate(   LocalDate.parse(c[COL_TRADE_DATE].trim(), DATE_FORMAT))
                .valueDate(   estVide(c, COL_VALUE_DATE)   ? null : LocalDate.parse(c[COL_VALUE_DATE].trim(), DATE_FORMAT))
                .way(         c[COL_WAY].trim().toUpperCase())
                .nominal(     nominal)
                .gSpread(     estVide(c, COL_G_SPREAD)     ? null : parseDecimal(c[COL_G_SPREAD]))
                .counterparty(estVide(c, COL_COUNTERPARTY) ? null : c[COL_COUNTERPARTY].trim())
                .subAsset(    subAsset)
                .isClosed(    !estVide(c, COL_IS_CLOSED) && Boolean.parseBoolean(c[COL_IS_CLOSED].trim()));

        if (!cEstUnFuture) {
            // ── BOND ──────────────────────────────────────────────────────
            BigDecimal prixClean = new BigDecimal(c[COL_CLEAN_PRICE].trim());
            BigDecimal couru     = estVide(c, COL_ACCRUED) ? ZERO : parseDecimal(c[COL_ACCRUED]);

            builder.assetIdentifier(isin)
                    .cleanPrice(  prixClean)
                    .accrued(     couru)
                    .dirtyPrice(  prixClean.add(couru))
                    .bondInstrument(instrRepo.findById(isin).orElse(null));

            if (!estVide(c, COL_PNL_REAL)) builder.realizedPnl(parseDecimal(c[COL_PNL_REAL]));

        } else {
            // ── FUTURE ────────────────────────────────────────────────────
            builder.assetIdentifier(isin)
                    .cleanPrice(  new BigDecimal(c[COL_CLEAN_PRICE].trim()))
                    .nbContracts( nominal.intValue())
                    .contractSize(new BigDecimal("100000"));

            if (!estVide(c, COL_BOND_DESC)) {
                builder.hedBondIsin(DESC_TO_ISIN.get(c[COL_BOND_DESC].trim()));
            }
            if (!estVide(c, COL_LAST_PRICE)) {
                builder.lastPrice(parseDecimal(c[COL_LAST_PRICE]));
            }
        }

        return builder.build();
    }

    /** Parse un nombre qui peut contenir des espaces ou virgules décimales françaises. */
    private BigDecimal parseDecimal(String raw) {
        return new BigDecimal(raw.trim().replace(",", ".").replace(" ", ""));
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

    /**
     * Détecte l'encodage du fichier CSV.
     * Excel 2016+ exporte en UTF-8 avec BOM (EF BB BF) ; les versions anciennes en Windows-1252.
     */
    private Charset detecterEncodage(MultipartFile file) {
        try {
            byte[] bom = file.getInputStream().readNBytes(3);
            if (bom.length >= 3 && bom[0] == (byte)0xEF && bom[1] == (byte)0xBB && bom[2] == (byte)0xBF) {
                return StandardCharsets.UTF_8;
            }
        } catch (Exception ignored) {}
        // Windows-1252 (encodage par défaut d'Excel français)
        return Charset.forName("windows-1252");
    }
}