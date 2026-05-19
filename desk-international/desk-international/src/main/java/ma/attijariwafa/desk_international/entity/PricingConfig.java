package ma.attijariwafa.desk_international.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "pricing_config",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_pricing_isin_date",
                columnNames = {"isin", "config_date"}))
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class PricingConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "isin", nullable = false)
    @JsonIgnore
    private Instrument instrument;

    @Column(name = "config_date", nullable = false)
    private LocalDate configDate;

    // ✅ AJOUTS CRITIQUES (Les fameuses méthodes add et compareTo marcheront car ils sont BigDecimal)
    @Column(name = "g_spread_bid", precision = 15, scale = 4)
    private BigDecimal gSpreadBid;

    @Column(name = "g_spread_ask", precision = 15, scale = 4)
    private BigDecimal gSpreadAsk;

    // Spread historique moyen — col "Target" du Dashboard
    @Column(name = "historical_avg_spread", precision = 10, scale = 4)
    private BigDecimal historicalAvgSpread;

    // Choc de taux pour le scénario adverse
    @Column(name = "shock_bps", nullable = false)
    private Integer shockBps = 10;

    // Seuil de décision : si g_spread_bid > targetSpread → BUY
    @Column(name = "target_spread", precision = 10, scale = 4)
    private BigDecimal targetSpread;

    // "BUY" ou "HOLD" — mis à jour automatiquement par PricingService
    @Column(name = "decision", length = 10)
    private String decision;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist void onPersist() { createdAt = updatedAt = LocalDateTime.now(); }
    @PreUpdate  void onUpdate()  { updatedAt = LocalDateTime.now(); }

    // ✅ La méthode requise par PricingService pour lire l'ISIN !
    public String getIsin() {
        return (this.instrument != null) ? this.instrument.getIsin() : null;
    }

}