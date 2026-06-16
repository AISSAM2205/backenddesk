package ma.attijariwafa.desk_international.dto;

import lombok.*;
import java.util.List;

/** Résultat d'un import de fichier Back Office. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BoUploadResultDto {
    private String       filename;
    private int          imported;
    private int          errors;
    private long         batchId;
    private String       status;        // SUCCESS | PARTIAL
    private List<String> errorMessages;
}
