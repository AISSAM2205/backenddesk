// entity/PnlDaily.java
package ma.attijariwafa.desk_international.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "pnl_daily")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class PnlDaily {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 1 ligne par jour ouvré — snapshot définitif (jamais modifié)
    @Column(name = "snapshot_date", nullable = false, unique = true)
    private LocalDate snapshotDate;

    // ── P&L GLOBAL ────────────────────────────────────────────
    // Histo col "P&L Total Gestion MAD" — cumulé depuis début portefeuille
    @Column(name = "pnl_total_gestion_mad", precision = 20, scale = 2)
    private BigDecimal pnlTotalGestionMad;

    // Histo col "P&L Jour" — variation J vs J-1
    @Column(name = "pnl_jour_mad", precision = 20, scale = 2)
    private BigDecimal pnlJourMad;

    // ── POSITIONS NOMINALES ────────────────────────────────────
    @Column(name = "position_eur_usd", precision = 20, scale = 2)
    private BigDecimal positionEurUsd;

    @Column(name = "position_usd", precision = 20, scale = 2)
    private BigDecimal positionUsd;

    // ── TAUX DU JOUR ───────────────────────────────────────────
    @Column(name = "taux_eur", precision = 10, scale = 6)
    private BigDecimal tauxEur;  // ESTR du jour

    @Column(name = "taux_usd", precision = 10, scale = 6)
    private BigDecimal tauxUsd;  // SOFR du jour

    // ── FINANCEMENT ───────────────────────────────────────────
    @Column(name = "fin_eur_mad", precision = 20, scale = 2)
    private BigDecimal finEurMad;

    @Column(name = "fin_usd_mad", precision = 20, scale = 2)
    private BigDecimal finUsdMad;

    @Column(name = "fin_total_mad", precision = 20, scale = 2)
    private BigDecimal finTotalMad;

    @Column(name = "fin_cumul_mad", precision = 20, scale = 2)
    private BigDecimal finCumulMad;

    // ── P&L ECONOMIQUE ─────────────────────────────────────────
    @Column(name = "pnl_eco_mad", precision = 20, scale = 2)
    private BigDecimal pnlEcoMad;

    // ── P&L PAR TYPE D'ACTIF ──────────────────────────────────
    @Column(name = "pl_bond_eur", precision = 20, scale = 2)
    private BigDecimal plBondEur;

    @Column(name = "pl_bond_usd", precision = 20, scale = 2)
    private BigDecimal plBondUsd;

    @Column(name = "pl_fut_eur", precision = 20, scale = 2)
    private BigDecimal plFutEur;

    @Column(name = "pl_fut_usd", precision = 20, scale = 2)
    private BigDecimal plFutUsd;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist void onPersist() { this.createdAt = LocalDateTime.now(); }
}