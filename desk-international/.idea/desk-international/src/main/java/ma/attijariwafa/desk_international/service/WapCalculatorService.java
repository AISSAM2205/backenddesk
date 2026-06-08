// service/wap/WapCalculatorService.java
package ma.attijariwafa.desk_international.service;

import lombok.RequiredArgsConstructor;
import ma.attijariwafa.desk_international.entity.Trade;
import ma.attijariwafa.desk_international.repository.TradeRepository;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import static java.math.BigDecimal.ZERO;

@Service
@RequiredArgsConstructor
public class WapCalculatorService {

    private final TradeRepository tradeRepo;

    /**
     * Calcule le WAP Dirty (Prix Moyen Pondéré) pour un ISIN.
     *
     * Formule : WAP = Σ(nominal_buy × dirty_price) / Σ(nominal_buy)
     *
     * RÈGLES IMPORTANTES :
     *  1. On prend UNIQUEMENT les trades BUY — les SELL n'entrent PAS dans le WAP
     *  2. On trie par date ASC (du plus ancien au plus récent)
     *  3. Validation Excel : MOROC 5.95 → WAP = 1.030299202909292
     *
     * @param bondIsin  l'ISIN du bond (ex: "XS2595028452")
     * @return          le WAP dirty calculé
     */
    public BigDecimal calculateWapDirty(String bondIsin) {

        // Récupérer tous les BUY de cet ISIN triés chronologiquement
        List<Trade> buys = tradeRepo
                .findByBondInstrumentIsinAndWayOrderByTradeDateAsc(bondIsin, "BUY");

        // Pas de BUY → WAP = 0
        if (buys.isEmpty()) return ZERO;

        BigDecimal sumNomDirty = ZERO; // Σ(nominal × dirty)
        BigDecimal sumNom      = ZERO; // Σ(nominal)

        for (Trade t : buys) {
            // Calculer le dirty price (si absent = clean + accrued)
            BigDecimal dirty = t.getDirtyPrice();
            if (dirty == null) {
                BigDecimal acc = t.getAccrued() != null ? t.getAccrued() : ZERO;
                dirty = t.getCleanPrice().add(acc);
            }

            // Accumuler : nominal × dirty et nominal
            sumNomDirty = sumNomDirty.add(t.getNominal().multiply(dirty));
            sumNom      = sumNom.add(t.getNominal());
        }

        // Éviter division par zéro
        if (sumNom.compareTo(ZERO) == 0) return ZERO;

        // WAP = Σ(nominal × dirty) / Σ(nominal)
        // scale=10 pour garder la précision Bloomberg (1.030299202909292)
        return sumNomDirty.divide(sumNom, 10, RoundingMode.HALF_UP);
    }

    /**
     * P&L réalisé d'un SELL.
     *
     * Formule : (prix_vente_dirty - wap_dirty) × nominal_vendu
     *
     * Exemple réel Excel :
     *  SELL 20 000 000 MOROC 5.95 @ dirty=1.06562, WAP=1.027455
     *  P&L = (1.06562 - 1.027455) × 20 000 000 = +763 291 USD
     */
    public BigDecimal calcRealizedPnl(BigDecimal sellDirty,
                                      BigDecimal wapDirty,
                                      BigDecimal nominal) {
        return sellDirty.subtract(wapDirty)
                .multiply(nominal)
                .setScale(4, RoundingMode.HALF_UP);
    }

    /**
     * MtM (Mark-to-Market) d'un trade future.
     *
     * Formule : (last_price - entry_price) × nb_contrats × taille / 100
     *  SELL future → MtM positif si prix baisse (position de vente)
     *  BUY  future → MtM négatif si prix monte  (position d'achat)
     */
    public BigDecimal calcFutureMtm(String way,
                                    BigDecimal lastPrice,
                                    BigDecimal entryPrice,
                                    int nbContracts,
                                    BigDecimal contractSize) {
        BigDecimal diff = lastPrice.subtract(entryPrice);
        BigDecimal base = diff
                .multiply(BigDecimal.valueOf(nbContracts))
                .multiply(contractSize)
                .divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP);

        // SELL future → gain si prix baisse → on inverse le signe
        return "SELL".equals(way) ? base : base.negate();
    }
}
