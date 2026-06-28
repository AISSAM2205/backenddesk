// service/ReportingScenarioService.java
package ma.attijariwafa.desk_international.service;

import lombok.RequiredArgsConstructor;
import ma.attijariwafa.desk_international.dto.DashboardDto;
import ma.attijariwafa.desk_international.dto.ReportingScenarioDto;
import ma.attijariwafa.desk_international.entity.ExternalPnlSnapshot;
import ma.attijariwafa.desk_international.entity.MarketRates;
import ma.attijariwafa.desk_international.repository.ExternalPnlSnapshotRepository;
import ma.attijariwafa.desk_international.repository.MarketRatesRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * Projection de P&L de fin d'année par scénario de taux. Source unique de
 * vérité backend (remplace le calcul de ReportingView). Réplique exactement la
 * méthodo front : split sous-actifs « mor bond » / « ocp bond », carry =
 * run-rate × jours restants, impact taux = -DV01_MAD × choc, projection =
 * actuel + carry + impact. Les chocs sont des entrées utilisateur.
 */
@Service
@RequiredArgsConstructor
public class ReportingScenarioService {

    private final DashboardService              dashboardService;
    private final ExternalPnlSnapshotRepository extRepo;
    private final MarketRatesRepository         mrRepo;

    private static final double USDMAD_FALLBACK = 9.251;
    private static final double EURMAD_FALLBACK = 10.418;
    private static final int    YEAR_TRADING_DAYS = 252;

    public ReportingScenarioDto computeScenarios(LocalDate date, int pess, int central, int opt) {
        LocalDate d = date != null ? date : LocalDate.now();

        MarketRates rates = mrRepo.findByRateDate(d)
                .orElseGet(() -> mrRepo.findTopByOrderByRateDateDesc().orElse(null));
        double usdMad = (rates != null && rates.getUsdMad() != null)
                ? rates.getUsdMad().doubleValue() : USDMAD_FALLBACK;
        double eurMad = (rates != null && rates.getEurMad() != null)
                ? rates.getEurMad().doubleValue() : EURMAD_FALLBACK;

        // Jours ouvrés écoulés / restants (yearProgress × 252), déterministe.
        int tradingDays = Math.max(1, (int) Math.round(yearProgress() * YEAR_TRADING_DAYS));
        int remainDays  = Math.max(0, YEAR_TRADING_DAYS - tradingDays);

        List<DashboardDto> rows = dashboardService.buildDashboard(d);

        // Split sous-actifs (mêmes filtres que le front).
        double dv01MorocMad = 0, dv01OcpMad = 0, dv01Moroc = 0, dv01Ocp = 0;
        double pnlMoroc = 0, pnlOcp = 0, netDailyMoroc = 0, netDailyOcp = 0;
        for (DashboardDto r : rows) {
            String sub = lower(r.getSubAsset());
            double dv01 = dbl(r.getDv01Bond());
            double fx = "EUR".equalsIgnoreCase(r.getCurrency()) ? eurMad : usdMad;
            if (sub.contains("mor bond")) {
                dv01MorocMad += dv01 * fx;
                dv01Moroc    += dv01;
                pnlMoroc      += dbl(r.getPnlEconomicMad());
                netDailyMoroc += dbl(r.getNetDailyMad());
            } else if (sub.contains("ocp bond")) {
                dv01OcpMad += dv01 * fx;
                dv01Ocp    += dv01;
                pnlOcp      += dbl(r.getPnlEconomicMad());
                netDailyOcp += dbl(r.getNetDailyMad());
            }
        }

        double pnlCln = extSumPlEco("CLN", d);
        double pnlEgp = extSumPlEco("EGP_BILL", d);

        // Carry projeté jusqu'à fin d'année.
        double carryMoroc = netDailyMoroc * remainDays;
        double carryOcp   = netDailyOcp * remainDays;
        double carryCln   = tradingDays > 0 ? (pnlCln / tradingDays) * remainDays : 0;
        double carryEgp   = tradingDays > 0 ? (pnlEgp / tradingDays) * remainDays : 0;

        List<ReportingScenarioDto.AssetRow> assetRows = List.of(
                assetRow("moroc", pnlMoroc, carryMoroc, dv01MorocMad, dv01Moroc),
                assetRow("ocp",   pnlOcp,   carryOcp,   dv01OcpMad,   dv01Ocp),
                assetRow("cln",   pnlCln,   carryCln,   0,            0),
                assetRow("egp",   pnlEgp,   carryEgp,   0,            0)
        );

        int[][] scens = { {0, pess}, {1, central}, {2, opt} };
        String[] scenKeys = { "pess", "central", "opt" };
        List<ReportingScenarioDto.Scenario> scenarios = new ArrayList<>(3);
        for (int i = 0; i < scenKeys.length; i++) {
            int shockBps = scens[i][1];
            List<ReportingScenarioDto.AssetResult> results = new ArrayList<>(assetRows.size());
            double total = 0;
            for (ReportingScenarioDto.AssetRow a : assetRows) {
                double rateImpact = a.getDv01Mad() > 0 ? -a.getDv01Mad() * shockBps : 0;
                double yeProjection = a.getActual() + a.getCarry() + rateImpact;
                total += yeProjection;
                results.add(ReportingScenarioDto.AssetResult.builder()
                        .key(a.getKey()).rateImpact(rateImpact).yeProjection(yeProjection).build());
            }
            scenarios.add(ReportingScenarioDto.Scenario.builder()
                    .key(scenKeys[i]).shockBps(shockBps).total(total).assetResults(results).build());
        }

        return ReportingScenarioDto.builder()
                .date(d)
                .tradingDays(tradingDays).remainDays(remainDays)
                .pess(pess).central(central).opt(opt)
                .dv01TotalMad(dv01MorocMad + dv01OcpMad)
                .dv01Total(dv01Moroc + dv01Ocp)
                .assetRows(assetRows)
                .scenarios(scenarios)
                .build();
    }

    /** Fraction d'année écoulée (jours calendaires) — équivalent déterministe
     *  du yearProgress() front : (jour de l'année − 1) / (longueur − 1). */
    private static double yearProgress() {
        LocalDate now = LocalDate.now();
        int doy = now.getDayOfYear();                 // 1..365/366
        int len = LocalDate.of(now.getYear(), 12, 31).getDayOfYear(); // 365/366
        return Math.min((doy - 1.0) / (len - 1.0), 1.0);
    }

    private double extSumPlEco(String category, LocalDate d) {
        List<ExternalPnlSnapshot> data = extRepo.findByAssetCategoryAndSnapshotDate(category, d);
        if (data.isEmpty()) data = extRepo.findLatestByCategory(category);
        double s = 0;
        for (ExternalPnlSnapshot r : data) s += dbl(r.getPlEcoMad());
        return s;
    }

    private static ReportingScenarioDto.AssetRow assetRow(
            String key, double actual, double carry, double dv01Mad, double dv01) {
        return ReportingScenarioDto.AssetRow.builder()
                .key(key).actual(actual).carry(carry).dv01Mad(dv01Mad).dv01(dv01).build();
    }

    private static String lower(String s) {
        return s != null ? s.toLowerCase() : "";
    }

    private static double dbl(BigDecimal v) {
        return v != null ? v.doubleValue() : 0.0;
    }
}
