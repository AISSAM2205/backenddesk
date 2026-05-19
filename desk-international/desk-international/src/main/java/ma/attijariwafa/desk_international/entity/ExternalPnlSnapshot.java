package ma.attijariwafa.desk_international.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "external_pnl_snapshot")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class ExternalPnlSnapshot {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "isin", nullable = false, length = 20)
    private String isin;

    @Column(name = "description")
    private String description;

    @Column(name = "asset_category", nullable = false, length = 20)
    private String assetCategory;

    @Column(name = "snapshot_date", nullable = false)
    private LocalDate snapshotDate;

    @Column(name = "nominal_usd", precision = 20, scale = 2)
    private BigDecimal nominalUsd;

    @Column(name = "coupon_rate", precision = 8, scale = 6)
    private BigDecimal couponRate;

    @Column(name = "counterparty", length = 100)
    private String counterparty;

    @Column(name = "maturity_date")
    private LocalDate maturityDate;

    @Column(name = "pl_realized_usd", precision = 18, scale = 4)
    private BigDecimal plRealizedUsd;

    @Column(name = "pl_latent_usd", precision = 18, scale = 4)
    private BigDecimal plLatentUsd;

    @Column(name = "pl_eco_usd", precision = 18, scale = 4)
    private BigDecimal plEcoUsd;

    @Column(name = "pl_eco_mad", precision = 18, scale = 2)
    private BigDecimal plEcoMad;

    @Column(name = "funding_usd", precision = 18, scale = 4)
    private BigDecimal fundingUsd;

    @Column(name = "duration", precision = 8, scale = 4)
    private BigDecimal duration;

    @Column(name = "source", length = 50)
    private String source;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (this.source == null) this.source = "MANUAL";
    }
}
