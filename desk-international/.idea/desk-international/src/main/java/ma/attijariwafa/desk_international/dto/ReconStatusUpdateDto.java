package ma.attijariwafa.desk_international.dto;

import lombok.*;

/** Corps de requête pour mettre à jour le workflow d'un écart de réconciliation. */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ReconStatusUpdateDto {
    private String breakKey;
    private String status;     // OPEN | INVESTIGATING | RESOLVED | ESCALATED | FALSE_POSITIVE
    private String assignee;
    private String comment;
}
