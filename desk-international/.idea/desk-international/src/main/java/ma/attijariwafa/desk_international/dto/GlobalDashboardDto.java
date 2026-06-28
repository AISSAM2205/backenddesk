package ma.attijariwafa.desk_international.dto;

import lombok.Builder;
import lombok.Data;
import ma.attijariwafa.desk_international.entity.ExternalPnlSnapshot;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

// Retourné par GET /api/dashboard/global
// Tous les champs correspondent exactement à ce que PortfolioView et computeGlobal() attendent
@Data
@Builder
public class GlobalDashboardDto {

    private LocalDate date;

    // ── Totaux P&L (MAD) ─────────────────────────────────────────────
    private BigDecimal totalPlEcoMad;           // EB + CLN + EGP
    private BigDecimal totalPnlAccountingMad;   // EB uniquement
    private BigDecimal totalNetDailyMad;        // EB uniquement (carry + theta)
    private BigDecimal totalFundingCostMad;     // EB uniquement
    private BigDecimal totalCpnThetaMad;        // EB uniquement

    // ── Totaux en devise (CCY — affichés tels quels par le frontend) ──
    private BigDecimal totalPlLatentMad;        // sum pnlLatentCcy EB (nommé Mad pour compat API)
    private BigDecimal totalPlRealizedMad;      // sum pnlRealizedCcy EB
    private BigDecimal totalCouponsMad;         // sum couponsCcy EB

    // ── Exposition et risque ─────────────────────────────────────────
    private BigDecimal totalNominalMad;         // sum netNominal USD (EB + CLN + EGP, en USD)
    private BigDecimal totalDv01Usd;            // EB uniquement
    private BigDecimal portfolioDuration;       // EB uniquement (nominal-weighted)

    // ── VaR 1 jour 99 % paramétrique (USD) — source unique backend ──────
    // var1dUsd = |DV01| × z(99 %) × σ ; z = 2.33, σ = 7 bp/j (govvies + IG).
    // Budget VaR interne du desk : 2,5 M$ avec plancher adaptatif.
    private Double var1dUsd;                     // VaR 1j 99 % (USD)
    private Double varBudgetUsd;                 // budget VaR (USD)
    private Double varPct;                       // consommation du budget (%)

    // ── Donut / répartition par classe d'actifs ──────────────────────
    // Clés : "EUROBOND", "CLN", "EGP_BILL"
    private Map<String, BreakdownDto> breakdown;

    // ── Listes détaillées par desk ───────────────────────────────────
    private List<DashboardDto>        eurobonds;   // Desk International
    private List<ExternalPnlSnapshot> clnList;     // Desk structuré (externe)
    private List<ExternalPnlSnapshot> egpList;     // Desk local EGP (externe)
}
