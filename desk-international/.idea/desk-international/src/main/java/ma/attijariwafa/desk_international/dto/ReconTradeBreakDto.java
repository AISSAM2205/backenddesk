package ma.attijariwafa.desk_international.dto;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Une ligne de la réconciliation au niveau TRADE : confrontation d'un leg Front
 * Office et de son correspondant Back Office, avec les deltas et la classification.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReconTradeBreakDto {

    private String breakKey;
    // MATCHED | MATCHED_WITH_DIFF | UNMATCHED_FO | UNMATCHED_BO
    private String matchType;

    private String isin;
    private String description;
    private String subAsset;
    private String way;

    // ── Front Office ──
    private Long       foId;
    private BigDecimal foNominal;
    private BigDecimal foCleanPrice;
    private LocalDate  foTradeDate;
    private LocalDate  foValueDate;
    private String     foCounterparty;

    // ── Back Office ──
    private Long       boId;
    private BigDecimal boNominal;
    private BigDecimal boCleanPrice;
    private LocalDate  boTradeDate;
    private LocalDate  boValueDate;
    private String     boCounterparty;
    private String     boRef;

    // ── Écarts / classification ──
    private BigDecimal deltaNominal;
    private BigDecimal deltaPriceBps;
    private boolean    dateMismatch;
    private String     breakReason;

    // ── Workflow d'investigation ──
    private String status;
    private String assignee;
    private String comment;
}
