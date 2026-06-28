package ma.attijariwafa.desk_international.service;

import lombok.RequiredArgsConstructor;
import ma.attijariwafa.desk_international.dto.*;
import ma.attijariwafa.desk_international.entity.ExternalPnlSnapshot;
import ma.attijariwafa.desk_international.entity.MarketRates;
import ma.attijariwafa.desk_international.repository.*;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;
import java.util.Objects;
import static java.math.BigDecimal.ZERO;

@Service
@RequiredArgsConstructor
public class GlobalDashboardService {

    private final DashboardService              dashboardService;
    private final RiskService                   riskService;
    private final ExternalPnlSnapshotRepository extRepo;
    private final MarketRatesRepository         mrRepo;

    public GlobalDashboardDto buildGlobal(LocalDate date) {

        // Taux FX — fallback sur la date la plus récente si absent
        MarketRates rates = mrRepo.findByRateDate(date)
                .orElseGet(() -> mrRepo.findTopByOrderByRateDateDesc().orElse(null));
        BigDecimal usdMad = rates != null ? rates.getUsdMad() : new BigDecimal("10.0347");
        BigDecimal eurMad = rates != null ? rates.getEurMad() : new BigDecimal("10.8891");

        // ── EUROBONDS (Desk International) ───────────────────────────
        List<DashboardDto> eurobonds = dashboardService.buildDashboard(date);

        BigDecimal ebPlEcoMad    = sum(eurobonds, d -> d.getPnlEconomicMad());
        BigDecimal ebAcctMad     = sum(eurobonds, d -> d.getPnlAccountingMad());
        BigDecimal ebNetDailyMad = sum(eurobonds, d -> d.getNetDailyMad());
        BigDecimal ebFundingMad  = sum(eurobonds, d -> d.getFundingCostMad());
        BigDecimal ebThetaMad    = sum(eurobonds, d -> d.getCpnThetaMad());
        BigDecimal ebLatentCcy   = sum(eurobonds, d -> d.getPnlLatentCcy());
        BigDecimal ebRealizedCcy = sum(eurobonds, d -> d.getPnlRealizedCcy());
        BigDecimal ebCouponsCcy  = sum(eurobonds, d -> d.getCouponsCcy());
        BigDecimal ebDv01        = sum(eurobonds, d -> d.getDv01Bond());
        BigDecimal ebNominalUsd  = eurobonds.stream()
                .filter(d -> d.getNetNominal() != null && d.getNetNominal().compareTo(ZERO) > 0)
                .map(DashboardDto::getNetNominal)
                .reduce(ZERO, BigDecimal::add);
        BigDecimal ebNominalMad  = eurobonds.stream()
                .filter(d -> d.getNetNominal() != null && d.getNetNominal().compareTo(ZERO) > 0)
                .map(d -> {
                    BigDecimal fx = "EUR".equals(d.getCurrency()) ? eurMad : usdMad;
                    return d.getNetNominal().multiply(fx);
                })
                .reduce(ZERO, BigDecimal::add);

        // ── CLN (desk externe — snapshot) ────────────────────────────
        List<ExternalPnlSnapshot> clnList = resolveExternal("CLN", date);
        BigDecimal clnPlMad      = extSum(clnList, ExternalPnlSnapshot::getPlEcoMad);
        BigDecimal clnNominalMad = extNominalMad(clnList, usdMad);
        BigDecimal clnNominalUsd = extSum(clnList, ExternalPnlSnapshot::getNominalUsd);

        // ── EGP BILLS (desk externe — snapshot) ──────────────────────
        List<ExternalPnlSnapshot> egpList = resolveExternal("EGP_BILL", date);
        BigDecimal egpPlMad      = extSum(egpList, ExternalPnlSnapshot::getPlEcoMad);
        BigDecimal egpNominalMad = extNominalMad(egpList, usdMad);
        BigDecimal egpNominalUsd = extSum(egpList, ExternalPnlSnapshot::getNominalUsd);

        // ── Totaux consolidés ────────────────────────────────────────
        BigDecimal totalPlEcoMad    = ebPlEcoMad.add(clnPlMad).add(egpPlMad);
        BigDecimal totalNominalUsd  = ebNominalUsd.add(clnNominalUsd).add(egpNominalUsd);
        BigDecimal totalNominalMad  = ebNominalMad.add(clnNominalMad).add(egpNominalMad);
        BigDecimal portfolioDuration = riskService.computePortfolioDuration(date);

        // ── VaR 1 jour 99 % paramétrique (USD) ───────────────────────
        // var1dUsd = |DV01| × z(99 %) × σ ; z = 2.33, σ = 7 bp/j.
        // Budget VaR interne : 2,5 M$ avec plancher adaptatif (var1d/0.55).
        double dv01Abs = ebDv01 != null ? Math.abs(ebDv01.doubleValue()) : 0.0;
        double var1dUsd = dv01Abs * 2.33 * 7;
        double varBudgetUsd = Math.max(2_500_000.0, var1dUsd / 0.55);
        double varPct = varBudgetUsd > 0 ? (var1dUsd / varBudgetUsd) * 100 : 0;

        // ── Breakdown pour le donut chart ────────────────────────────
        Map<String, BreakdownDto> breakdown = new LinkedHashMap<>();
        breakdown.put("EUROBOND", breakdown("Eurobonds MOROC + OCP",
                ebNominalMad, ebPlEcoMad, eurobonds.size(), totalNominalMad));
        breakdown.put("CLN", breakdown("CLN Credit Linked Notes",
                clnNominalMad, clnPlMad, clnList.size(), totalNominalMad));
        breakdown.put("EGP_BILL", breakdown("Titres offshore EGP Bills",
                egpNominalMad, egpPlMad, egpList.size(), totalNominalMad));

        return GlobalDashboardDto.builder()
                .date(date)
                // P&L MAD
                .totalPlEcoMad(totalPlEcoMad)
                .totalPnlAccountingMad(ebAcctMad)
                .totalNetDailyMad(ebNetDailyMad)
                .totalFundingCostMad(ebFundingMad)
                .totalCpnThetaMad(ebThetaMad)
                // CCY (nommés Mad pour compat frontend)
                .totalPlLatentMad(ebLatentCcy)
                .totalPlRealizedMad(ebRealizedCcy)
                .totalCouponsMad(ebCouponsCcy)
                // Exposition
                .totalNominalMad(totalNominalUsd)   // frontend l'utilise en USD directement
                .totalDv01Usd(ebDv01)
                .portfolioDuration(portfolioDuration)
                // VaR 1j 99 % (calcul backend, ex-PortfolioView)
                .var1dUsd(var1dUsd)
                .varBudgetUsd(varBudgetUsd)
                .varPct(varPct)
                // Breakdown + listes
                .breakdown(breakdown)
                .eurobonds(eurobonds)
                .clnList(clnList)
                .egpList(egpList)
                .build();
    }

    // ── Helpers ──────────────────────────────────────────────────────

    private List<ExternalPnlSnapshot> resolveExternal(String category, LocalDate date) {
        List<ExternalPnlSnapshot> data =
                extRepo.findByAssetCategoryAndSnapshotDate(category, date);
        if (data.isEmpty()) data = extRepo.findLatestByCategory(category);
        return data;
    }

    private BigDecimal sum(List<DashboardDto> rows,
                           java.util.function.Function<DashboardDto, BigDecimal> fn) {
        return rows.stream().map(fn)
                .filter(Objects::nonNull)
                .reduce(ZERO, BigDecimal::add);
    }

    private BigDecimal extSum(List<ExternalPnlSnapshot> rows,
                              java.util.function.Function<ExternalPnlSnapshot, BigDecimal> fn) {
        return rows.stream().map(fn)
                .filter(Objects::nonNull)
                .reduce(ZERO, BigDecimal::add);
    }

    private BigDecimal extNominalMad(List<ExternalPnlSnapshot> rows, BigDecimal usdMad) {
        return rows.stream()
                .filter(e -> e.getNominalUsd() != null)
                .map(e -> e.getNominalUsd().multiply(usdMad))
                .reduce(ZERO, BigDecimal::add);
    }

    private BreakdownDto breakdown(String label, BigDecimal nominal, BigDecimal pl,
                                   int nb, BigDecimal totalNominal) {
        BigDecimal pct = totalNominal.compareTo(ZERO) == 0 ? ZERO
                : nominal.divide(totalNominal, 4, RoundingMode.HALF_UP)
                         .multiply(BigDecimal.valueOf(100))
                         .setScale(2, RoundingMode.HALF_UP);
        return BreakdownDto.builder()
                .label(label).nominalMad(nominal)
                .plEcoMad(pl).pctPortfolio(pct).nbPositions(nb)
                .build();
    }
}
