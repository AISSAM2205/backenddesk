package ma.attijariwafa.desk_international.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * État d'investigation d'un écart de réconciliation. Le rapprochement FO/BO est
 * recalculé à chaque run ; l'identité d'un écart est dérivée de façon déterministe
 * ({@code breakKey}). Seul le WORKFLOW (statut, affectation, commentaire) est
 * persisté ici et re-fusionné sur les écarts recalculés — exactement comme un vrai
 * outil de réconciliation de salle.
 */
@Entity
@Table(name = "recon_break_status")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class ReconBreakStatus {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "break_key", nullable = false, unique = true, length = 160)
    private String breakKey;

    // OPEN | INVESTIGATING | RESOLVED | ESCALATED | FALSE_POSITIVE
    @Column(name = "status", nullable = false, length = 20)
    private String status;

    @Column(name = "assignee", length = 100)
    private String assignee;

    @Column(name = "comment", length = 500)
    private String comment;

    @Column(name = "updated_by", length = 100)
    private String updatedBy;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    @PreUpdate
    void touch() {
        this.updatedAt = LocalDateTime.now();
    }
}
