// entity/CsvUploadLog.java
package ma.attijariwafa.desk_international.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Entity
@Table(name = "csv_upload_log")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class CsvUploadLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Nom du fichier uploadé (ex: "blotter_20250520.csv")
    @Column(name = "filename", nullable = false, length = 255)
    private String filename;

    // Login de l'utilisateur qui a uploadé
    @Column(name = "uploaded_by", nullable = false, length = 100)
    private String uploadedBy;

    @Column(name = "uploaded_at", nullable = false)
    private LocalDateTime uploadedAt;

    @Column(name = "total_lines")    private Integer totalLines    = 0;
    @Column(name = "imported_count") private Integer importedCount = 0;
    @Column(name = "error_count")    private Integer errorCount    = 0;

    // Détail JSON des erreurs — stocké en JSONB PostgreSQL
    // Ex : [{"line": 12, "error": "ISIN XS9999 inconnu en BDD"}]
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "error_details", columnDefinition = "jsonb")
    private List<Map<String, Object>> errorDetails;
    // PROCESSING → SUCCESS | PARTIAL | FAILED
    @Column(name = "status", nullable = false, length = 20)
    private String status = "PROCESSING";

    // Durée en millisecondes (pour monitoring perf)
    @Column(name = "duration_ms")
    private Integer durationMs;
}