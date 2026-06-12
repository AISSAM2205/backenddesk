// dto/DashboardDto.java
package ma.attijariwafa.desk_international.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
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
    private BigDecimal lastWapClean;   // wap_clean de v_position
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
    private BigDecimal pxMid;            // prix mid Bloomberg (% pair)
    private BigDecimal cleanPrice;       // alias de pxMid — nom attendu par le frontend
    private BigDecimal accrued;          // couru Bloomberg (MarketData.accruedBloomberg)
    private BigDecimal pxBid;            // prix bid AWB
    private BigDecimal pxAsk;            // prix ask AWB
    // @JsonProperty force le nom JSON EXACT attendu par le frontend.
    // Sans cela, le getter Lombok getGSpreadBid() pousse Jackson à sérialiser
    // "gspreadBid" (g + s minuscules) ≠ "gSpreadBid" lu par le front → colonne vide.
    @JsonProperty("gSpreadBid") private BigDecimal gSpreadBid;
    @JsonProperty("gSpreadAsk") private BigDecimal gSpreadAsk;         // G-Spread côté ask (MarketData)
    @JsonProperty("gSpreadMid") private BigDecimal gSpreadMid;
    @JsonProperty("iSpreadBid") private BigDecimal iSpreadBid;
    @JsonProperty("iSpreadAsk") private BigDecimal iSpreadAsk;         // I-Spread côté ask (MarketData)
    @JsonProperty("iSpreadMid") private BigDecimal iSpreadMid;         // I-Spread mid = (bid+ask)/2, calculé dans DashboardService
    private BigDecimal assetSwapSpread;    // ASW ≈ I-spread pour affichage
    private BigDecimal targetSpread;
    private BigDecimal historicalAvgSpread; // Moyenne historique du G-Spread (référence décision)
    private String     decision;           // "BUY" | "HOLD" | "SELL"

    // ── Risk (depuis RiskService) ────────────────────────────────
    private BigDecimal modifiedDuration;
    private BigDecimal dv01Bond;
    private BigDecimal hedgeRatio;                // ratio DV01_bond / DV01_future
    private String     hedgeFuture;
    private Integer    nbContractsToHedge;
    private Integer    currentFuturesPosition;    // position futures actuelle (nb contrats nets)
    private BigDecimal yieldToMaturity;           // YTM en % (ex : 5.72)
    private BigDecimal convexity;                 // convexité du bond (années²)
}
