// dto/RiskDto.java
package ma.attijariwafa.desk_international.dto;

import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;

// Retourné par RiskController
// Contient DV01 + hedge ratio (HedgingService intégré dans RiskService)
@Data
@Builder
public class RiskDto {

    private String     isin;
    private String     description;
    private BigDecimal netNominal;

    // Duration modifiée (en années)
    // MOROC 5.95 → 2.522841
    private BigDecimal modifiedDuration;

    // DV01 = perte en USD si taux +1bp (1/100ème de pourcent)
    // DV01 = duration × nominal × 0.0001
    // MOROC 5.95 → 2.5228 × 73 460 000 × 0.0001 = 18 532 USD/bp
    private BigDecimal dv01Bond;

    // Future de couverture recommandé
    // ex: "FVH5 Comdty" pour MOROC 5.95
    private String     hedgeFuture;

    // DV01 d'un contrat future
    private BigDecimal dv01FutureCtd;

    // Ratio de couverture = DV01_bond / DV01_future
    private BigDecimal hedgeRatio;

    // Nombre de contrats recommandés pour couvrir la position
    private Integer    nbContractsToHedge;

    // Position futures actuelle (depuis v_position)
    // ex: -461 pour MOROC 5.95 (461 contrats vendus = hedge actif)
    private Integer    currentFuturesPosition;

    // YTM (yield to maturity) en vigueur
    private BigDecimal ytmMid;
}
