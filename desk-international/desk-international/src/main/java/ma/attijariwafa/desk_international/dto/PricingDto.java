// dto/PricingDto.java
package ma.attijariwafa.desk_international.dto;

import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;

// Retourné par PricingController
// Contient la décision BUY ou HOLD pour un ISIN
@Data
@Builder
public class PricingDto {

    private String     isin;
    private LocalDate  snapshotDate;

    // G-Spread = différence de rendement vs la courbe gouvernementale (bps)
    private BigDecimal gSpreadBid;   // ex: 136.65 bps pour MOROC 5.95
    private BigDecimal gSpreadAsk;   // ex: 115.05 bps
    private BigDecimal gSpreadMid;   // (BID+ASK)/2 — calculé en Java

    // I-Spread = différence vs la courbe swap
    private BigDecimal iSpreadBid;
    private BigDecimal iSpreadAsk;
    private BigDecimal iSpreadMid;

    // Target spread = seuil historique moyen + choc 10 bps
    private BigDecimal targetSpread; // ex: 140.38 bps pour MOROC 5.95

    // Décision finale
    // MOROC 5.95 : G=136.65 < Target=140.38 → HOLD (bond trop cher)
    // OCPMR 6.1  : G=202.89 > Target=134.54 → BUY  (bond sous-évalué)
    private String     decision;     // "BUY" ou "HOLD"
}
