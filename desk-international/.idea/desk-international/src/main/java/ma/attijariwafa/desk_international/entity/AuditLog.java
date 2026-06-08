// entity/AuditLog.java
package ma.attijariwafa.desk_international.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.LocalDateTime;
import java.util.Map;

@Entity
@Table(name = "audit_log",
        indexes = {
                @Index(name = "idx_audit_created", columnList = "created_at DESC"),
                @Index(name = "idx_audit_user",    columnList = "username"),
                @Index(name = "idx_audit_table",   columnList = "table_name, action")
        })
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Qui a fait l'action
    @Column(name = "username", nullable = false, length = 50)
    private String username;

    // Sur quelle table (ex: "trade", "market_data")
    @Column(name = "table_name", nullable = false, length = 50)
    private String tableName;

    // INSERT | UPDATE | DELETE | IMPORT
    @Column(name = "action", nullable = false, length = 10)
    private String action;

    // ID de l'enregistrement affecté
    @Column(name = "record_id")
    private Long recordId;

    // Contexte JSON : {"before": {...}, "after": {...}}
    // Pour IMPORT : {"file": "blotter.csv", "imported": 60, "errors": 0}
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "details", columnDefinition = "jsonb")
    private Map<String, Object> details;

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist void onPersist() { this.createdAt = LocalDateTime.now(); }
}