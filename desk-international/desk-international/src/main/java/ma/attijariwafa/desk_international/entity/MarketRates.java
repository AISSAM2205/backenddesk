package ma.attijariwafa.desk_international.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.*;

@Entity
@Table(name = "market_rates")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class MarketRates {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "rate_date", nullable = false, unique = true)
    private LocalDate rateDate;

    @Column(name = "eur_mad", nullable = false, precision = 12, scale = 6)
    private BigDecimal eurMad;

    @Column(name = "usd_mad", nullable = false, precision = 12, scale = 6)
    private BigDecimal usdMad;

    @Column(name = "eur_usd", nullable = false, precision = 10, scale = 6)
    private BigDecimal eurUsd;

    @Column(name = "estr_rate", nullable = false, precision = 10, scale = 6)
    private BigDecimal estrRate;

    @Column(name = "sofr_rate", nullable = false, precision = 10, scale = 6)
    private BigDecimal sofrRate;

    @Column(name = "usd_egp", precision = 10, scale = 4)
    private BigDecimal usdEgp;

    @Column(name = "shock_bps", nullable = false)
    private Integer shockBps = 10;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() { this.createdAt = LocalDateTime.now(); }

    public BigDecimal getSofr() {
        return this.sofrRate;
    }

    public BigDecimal getEstr() {
        return this.estrRate;
    }
}
