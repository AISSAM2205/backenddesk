// entity/RiskMetrics.java
package ma.attijariwafa.desk_international.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "risk_metrics",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_risk_isin_date",
                columnNames = {"isin", "metrics_date"}))
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class RiskMetrics {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // FK vers instrument (LAZY — ne charge pas l'instrument à chaque SELECT)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "isin", nullable = false)
    private Instrument instrument;

    // Date du snapshot (1 ligne par ISIN par jour)
    @Column(name = "metrics_date", nullable = false)
    private LocalDate metricsDate;

    // Années à maturité (ex: 2.7953 pour MOROC 5.95)
    @Column(name = "maturity_years", precision = 8, scale = 4)
    private BigDecimal maturityYears;

    // Duration modifiée — Dashboard col "Duration"
    // Ex: XS2595028452 → 2.522841 | XS2080771806 → 5.931842
    @Column(name = "modified_duration", precision = 8, scale = 6)
    private BigDecimal modifiedDuration;

    // DV01 par million de nominal : gain/perte si taux +1bp
    // DV01 = modified_duration × nominal × 0.0001
    // MOROC 5.95 : 2.5228 × 73 460 000 × 0.0001 = 18 532 USD/bp
    @Column(name = "dv01_per_million", precision = 12, scale = 4)
    private BigDecimal dv01PerMillion;

    // YTM au moment du calcul
    @Column(name = "ytm_mid", precision = 10, scale = 6)
    private BigDecimal ytmMid;// Future de couverture — Dashboard col "Future"
    // Valeurs réelles : FVZ4 Comdty / TYZ4 Comdty / RXZ4 Comdty / DUZ4 Comdty
    @Column(name = "hedge_future", length = 20)
    private String hedgeFuture;

    // ISIN du Cheapest-to-Deliver
    // Ex: XS2595028452 → CTD = US91282CKD29
    @Column(name = "ctd_isin", length = 20)
    private String ctdIsin;

    // Duration du CTD (ex: 3.430781 pour FVZ4)
    @Column(name = "duration_ctd", precision = 8, scale = 6)
    private BigDecimal durationCtd;

    // Taille du contrat future : 100 000 USD (constant pour tous)
    @Column(name = "contract_size")
    private Integer contractSize = 100000;

    // Facteur de conversion CTD (ex: 0.9363 pour FVZ4)
    @Column(name = "conv_factor", precision = 8, scale = 6)
    private BigDecimal convFactor;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onPersist() { this.createdAt = LocalDateTime.now(); }
}