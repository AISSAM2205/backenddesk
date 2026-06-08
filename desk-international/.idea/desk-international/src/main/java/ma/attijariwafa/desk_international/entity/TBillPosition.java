package ma.attijariwafa.desk_international.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Position T-Bill offshore (USD / EUR).
 * Alimenté par BloombergMockDataLoader — remplacer par connecteur Bloomberg réel.
 * Table : tbill_position
 */
@Entity
@Table(name = "tbill_position")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class TBillPosition {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** ISIN officiel (US912796xxxx pour US Treasury, FR001xxxxx pour BTF) */
    @Column(name = "isin", nullable = false, length = 12)
    private String isin;

    /** Nom de l'émetteur : "US Treasury", "Trésor Français (BTF)", etc. */
    @Column(name = "emetteur", nullable = false, length = 100)
    private String emetteur;

    /** Devise de la position : USD ou EUR */
    @Column(name = "devise", nullable = false, length = 3)
    private String devise;

    /** Date du snapshot (aujourd'hui en mock, date de valorisation réelle Bloomberg) */
    @Column(name = "snapshot_date", nullable = false)
    private LocalDate snapshotDate;

    /** Nominal en devise native (USD ou EUR) */
    @Column(name = "nominal", nullable = false, precision = 20, scale = 2)
    private BigDecimal nominal;

    /** Yield net après retenue à la source (%) */
    @Column(name = "yield_net", precision = 8, scale = 4)
    private BigDecimal yieldNet;

    /** Yield brut Bloomberg avant retenue (%) */
    @Column(name = "yield_brut", precision = 8, scale = 4)
    private BigDecimal yieldBrut;

    /** Duration modifiée en années */
    @Column(name = "duration", precision = 8, scale = 4)
    private BigDecimal duration;

    /** P&L yield (intérêts courus depuis initiation) en USD */
    @Column(name = "pl_yield_usd", precision = 18, scale = 2)
    private BigDecimal plYieldUsd;

    /** P&L FX (gain/perte lié au change USD/MAD ou EUR/MAD) en USD */
    @Column(name = "pl_fx_usd", precision = 18, scale = 2)
    private BigDecimal plFxUsd;

    /** P&L économique total = yield + FX en USD */
    @Column(name = "pl_eco_usd", precision = 18, scale = 2)
    private BigDecimal plEcoUsd;

    /** Coût de financement (SOFR/ESTR + spread) en USD */
    @Column(name = "funding_usd", precision = 18, scale = 2)
    private BigDecimal fundingUsd;

    /** FX moyen d'acquisition (USD/MAD ou EUR/MAD à la date d'initiation) */
    @Column(name = "fx_moyen", precision = 10, scale = 4)
    private BigDecimal fxMoyen;

    /** FX spot actuel (USD/MAD ou EUR/MAD) */
    @Column(name = "fx_current", precision = 10, scale = 4)
    private BigDecimal fxCurrent;

    /** FX breakeven avec financement : en dessous = P&L total négatif */
    @Column(name = "fx_breakeven_avec", precision = 10, scale = 4)
    private BigDecimal fxBreakevenAvec;

    /** FX breakeven sans financement : en dessous = perte sur yield seul */
    @Column(name = "fx_breakeven_sans", precision = 10, scale = 4)
    private BigDecimal fxBreakevenSans;

    /** Niveau de stop-loss FX (déclenche alerte rouge si FX spot < ce seuil) */
    @Column(name = "fx_stop_loss", precision = 10, scale = 4)
    private BigDecimal fxStopLoss;

    /** Date d'échéance du T-Bill */
    @Column(name = "maturity_date", nullable = false)
    private LocalDate maturityDate;

    /** Date d'initiation de la position (date d'achat) */
    @Column(name = "date_initiation")
    private LocalDate dateInitiation;

    /** Limite d'exposition autorisée en devise native (ex: 100M USD) */
    @Column(name = "limit_nominal", precision = 20, scale = 2)
    private BigDecimal limitNominal;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
