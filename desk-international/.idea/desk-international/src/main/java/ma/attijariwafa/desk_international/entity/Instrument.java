// src/main/java/ma/attijariwafa/desk/entity/Instrument.java

package ma.attijariwafa.desk_international.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "instrument")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class Instrument {

    @Id
    @Column(name = "isin", length = 12)
    private String isin;

    @Column(name = "description", nullable = false, length = 200)
    private String description;

    @Column(name = "issuer", nullable = false, length = 20)
    private String issuer;

    @Column(name = "currency", nullable = false, length = 3)
    private String currency;

    @Column(name = "sub_asset", nullable = false, length = 20)
    private String subAsset;

    // BigDecimal OBLIGATOIRE — jamais double/float pour les taux financiers
    @Column(name = "coupon_rate", nullable = false, precision = 8, scale = 4)
    private BigDecimal couponRate;

    @Column(name = "coupon_frequency", nullable = false)
    private Short couponFrequency;

    @Column(name = "maturity_date", nullable = false)
    private LocalDate maturityDate;

    @Column(name = "issue_date")
    private LocalDate issueDate;

    @Column(name = "nominal_outstanding")
    private Long nominalOutstanding;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() { this.createdAt = LocalDateTime.now(); }
}

 