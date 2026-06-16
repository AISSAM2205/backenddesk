package ma.attijariwafa.desk_international.dto;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;

/** Synthèse (KPI) d'un run de réconciliation FO/BO. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReconSummaryDto {

    private LocalDate date;
    private String    runAt;

    private int foCount;
    private int boCount;

    private int matched;
    private int matchedWithDiff;
    private int unmatchedFo;
    private int unmatchedBo;
    private int positionBreaks;

    private double     matchRatePct;
    private BigDecimal notionalAtRisk;

    private int openBreaks;
    private int resolvedBreaks;

    private BigDecimal tolNominal;
    private BigDecimal tolPriceBps;
}
