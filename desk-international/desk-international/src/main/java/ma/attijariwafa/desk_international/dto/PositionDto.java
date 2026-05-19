// dto/PositionDto.java
package ma.attijariwafa.desk_international.dto;

import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;

// Ce DTO est construit depuis VPosition (vue SQL)
// et retourné par PositionController
@Data
@Builder
public class PositionDto {

    private String     isin;                // ex: "XS2595028452"
    private String     description;         // ex: "MOROC 5.95 03/08/28"
    private String     currency;            // "USD" ou "EUR"
    private String     subAsset;            // "Mor Bond" ou "OCP Bond"
    private BigDecimal couponRate;          // ex: 5.9500 (= 5.95% annuel)
    private LocalDate  maturityDate;        // ex: 2028-03-08

    // ── Position nette ───────────────────────────────────────────
    // net = SUM(BUY) - SUM(SELL) calculé par la vue SQL v_position
    private BigDecimal netNominal;          // ex: 73 460 000 USD pour MOROC 5.95

    // ── WAP (Prix Moyen Pondéré) ─────────────────────────────────
    private BigDecimal lastWapDirty;        // ex: 1.030299202909292
    private BigDecimal lastWapClean;        // ex: wapDirty - accrued

    // ── Statut et P&L réalisé ────────────────────────────────────
    private String     status;             // "ACTIVE" si netNominal > 0
    private BigDecimal totalRealizedPnl;   // Σ P&L réalisé sur les SELL

    // ── Futures liés ─────────────────────────────────────────────
    private Integer    futuresNetPosition; // ex: -461 pour MOROC 5.95
}
