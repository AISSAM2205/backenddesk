package ma.attijariwafa.desk_international.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "trader_limit",
       uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "instrument_type"}))
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class TraderLimit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private AppUser user;

    // EUROBONDS | CLN_MOROC | CLN_GCC | EGP
    @Column(name = "instrument_type", nullable = false, length = 20)
    private String instrumentType;

    @Column(name = "limit_amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal limitAmount;

    @Column(name = "currency", nullable = false, length = 3)
    private String currency;

    @Column(name = "used_amount", precision = 18, scale = 2)
    private BigDecimal usedAmount = BigDecimal.ZERO;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist void onPersist() { createdAt = updatedAt = LocalDateTime.now(); }
    @PreUpdate  void onUpdate()  { updatedAt = LocalDateTime.now(); }
}
