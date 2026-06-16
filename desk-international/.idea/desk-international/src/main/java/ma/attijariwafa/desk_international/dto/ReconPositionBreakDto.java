package ma.attijariwafa.desk_international.dto;

import lombok.*;
import java.math.BigDecimal;

/**
 * Une ligne de la réconciliation au niveau POSITION : position nette par ISIN vue
 * par le Front Office (somme BUY − SELL) confrontée à celle du Back Office.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReconPositionBreakDto {

    private String breakKey;
    private String isin;
    private String description;
    private String currency;

    private BigDecimal foNet;
    private BigDecimal boNet;
    private BigDecimal deltaNominal;

    // MATCHED | BREAK
    private String matchType;

    // Workflow d'investigation
    private String status;
    private String assignee;
    private String comment;
}
