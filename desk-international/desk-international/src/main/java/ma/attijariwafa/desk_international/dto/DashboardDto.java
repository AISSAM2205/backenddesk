// dto/DashboardDto.java
package ma.attijariwafa.desk_international.dto;

import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;

// Retourné par GET /api/dashboard
// = Position + PnL + Pricing + Risk pour 1 ISIN (1 ligne du Dashboard Excel)
@Data
@Builder
public class DashboardDto {

    // ── Position (depuis v_position) ─────────────────────────────
    private String     isin;
    private String     description;
    private String     currency;
    private String     subAsset;
    private BigDecimal couponRate;
    private LocalDate  maturityDate;
    private BigDecimal netNominal;
    private BigDecimal lastWapDirty;
    private String     status;
    private Integer    futuresNetPosition;

    // ── P&L (depuis PnLService) ──────────────────────────────────
    private BigDecimal dirtyMarket;
    private BigDecimal perfWap;
    private BigDecimal pnlLatentCcy;
    private BigDecimal pnlRealizedCcy;
    private BigDecimal couponsCcy;
    private BigDecimal totalPnlCcy;
    private BigDecimal pnlAccountingMad;
    private BigDecimal fundingCostMad;
    private BigDecimal pnlEconomicMad;
    private BigDecimal cpnThetaMad;
    private BigDecimal dailyFundingMad;
    private BigDecimal netDailyMad;
    private boolean    netDailyAlert;

    // ── Pricing (depuis PricingService + MarketData) ─────────────
    private BigDecimal pxMid;         // prix mid (% du pair)
    private BigDecimal pxBid;         // prix bid AWB
    private BigDecimal pxAsk;         // prix ask AWB
    private BigDecimal gSpreadBid;
    private BigDecimal gSpreadMid;
    private BigDecimal iSpreadBid;
    private BigDecimal targetSpread;
    private String     decision;      // "BUY" ou "HOLD"

    // ── Risk (depuis RiskService) ────────────────────────────────
    private BigDecimal modifiedDuration;
    private BigDecimal dv01Bond;
    private String     hedgeFuture;
    private Integer    nbContractsToHedge;
}
