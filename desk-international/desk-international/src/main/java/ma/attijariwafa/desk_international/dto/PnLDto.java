// dto/PnLDto.java
package ma.attijariwafa.desk_international.dto;

import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;

// Retourné par DashboardController → GET /api/pnl
// Reproduit exactement les colonnes du Dashboard Excel
@Data
@Builder
public class PnLDto {

    // ── Identification ───────────────────────────────────────────
    private String     isin;
    private String     description;
    private String     currency;       // "USD" ou "EUR"
    private BigDecimal netNominal;     // position nette

    // ── Prix ────────────────────────────────────────────────────
    private BigDecimal wapDirty;       // 1.030299 pour MOROC 5.95
    private BigDecimal dirtyMarket;    // PX_MID Bloomberg + accrued du jour
    private BigDecimal perfWap;        // dirtyMarket - wapDirty

    // ── P&L en devise (USD ou EUR) ───────────────────────────────
    private BigDecimal pnlLatentCcy;   // netNominal × perfWap
    private BigDecimal pnlRealizedCcy; // Σ P&L réalisé des SELL
    private BigDecimal couponsCcy;     // Σ coupons reçus depuis le début
    private BigDecimal totalPnlCcy;    // latent + réalisé + coupons

    // ── P&L en MAD (Dirham Marocain) ────────────────────────────
    private BigDecimal pnlAccountingMad;  // totalPnlCcy × taux FX
    private BigDecimal fundingCostMad;    // coût financement en MAD
    private BigDecimal pnlEconomicMad;    // comptable - financement
    // MOROC 5.95 → pnlEconomicMad = 12 147 790 MAD

    // ── Analyse quotidienne ──────────────────────────────────────
    private BigDecimal cpnThetaMad;    // coupon gagné par jour en MAD
    private BigDecimal dailyFundingMad; // financement payé par jour
    private BigDecimal netDailyMad;    // cpnTheta - dailyFunding

    // Alerte si ce bond coûte plus qu'il ne rapporte chaque jour
    // true = PROBLÈME → le trader doit revoir sa position
    // MOROC 1 3/8 → alerte car coupon faible vs taux SOFR/ESTR actuels
    private boolean    netDailyAlert;
}
