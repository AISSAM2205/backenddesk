package ma.attijariwafa.desk_international.dto;

import lombok.*;
import java.util.List;

/** Résultat complet d'un run de réconciliation : synthèse + écarts trades + positions. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReconResultDto {
    private ReconSummaryDto              summary;
    private List<ReconTradeBreakDto>    trades;
    private List<ReconPositionBreakDto> positions;
}
