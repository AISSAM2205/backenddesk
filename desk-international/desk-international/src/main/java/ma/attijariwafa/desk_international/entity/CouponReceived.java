// entity/CouponReceived.java
// Créer dans src/main/java/ma/attijariwafa/desk/entity/
package ma.attijariwafa.desk_international.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "coupon_received")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class CouponReceived {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Lien vers le bond qui a payé le coupon
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "isin", nullable = false)
    private Instrument instrument;

    // Date à laquelle le coupon a été encaissé
    @Column(name = "payment_date", nullable = false)
    private LocalDate paymentDate;

    // Montant en devise (USD ou EUR selon le bond)
    // MOROC 5.95 → 5.95%/2 × 73 460 000 = 2 185 385 USD
    @Column(name = "amount", precision = 18, scale = 4, nullable = false)
    private BigDecimal amount;

    @Column(name = "currency", nullable = false, length = 3)
    private String currency; // "USD" ou "EUR"

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() { this.createdAt = LocalDateTime.now(); }
}
