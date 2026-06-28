// service/ScenarioService.java
package ma.attijariwafa.desk_international.service;

import lombok.RequiredArgsConstructor;
import ma.attijariwafa.desk_international.dto.DashboardDto;
import ma.attijariwafa.desk_international.dto.RateScenarioDto;
import ma.attijariwafa.desk_international.entity.MarketRates;
import ma.attijariwafa.desk_international.repository.MarketRatesRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * Calcule la grille de scénarios de choc de taux du book obligataire.
 * Source unique de vérité backend (remplace le calcul de RiskView).
 *
 * <p><b>Parité stricte avec le front</b> : on agrège les MÊMES lignes que le
 * dashboard ({@code dashboardService.buildDashboard}), dont {@code dv01Bond}
 * et {@code convexity} proviennent du moteur de risque ; on filtre les lignes
 * à DV01 nul (comme RiskView) ; le P&L par scénario suit l'approximation de
 * Taylor : {@code -DV01·Δbp + ½·Σ(C·N)·(Δbp/10000)²}, convertie en MAD par le
 * spot USD/MAD (repli {@link #USD_MAD_REF} si absent). Calcul en double.</p>
 */
@Service
@RequiredArgsConstructor
public class ScenarioService {

    private final DashboardService      dashboardService;
    private final MarketRatesRepository mrRepo;

    // Chocs de taux (bp) — identiques à RATE_SCENARIOS du front.
    private static final int[] DELTAS_BP = { -100, -50, -25, 25, 50, 100 };
    // Repli USD/MAD identique au front (USD_MAD_REF).
    private static final double USD_MAD_REF = 9.251;

    public RateScenarioDto computeRateScenarios(LocalDate date) {
        MarketRates rates = mrRepo.findByRateDate(date)
                .orElseGet(() -> mrRepo.findTopByOrderByRateDateDesc().orElse(null));
        double usdMad = (rates != null && rates.getUsdMad() != null)
                ? rates.getUsdMad().doubleValue() : USD_MAD_REF;

        // Mêmes lignes que le dashboard, filtrées DV01 ≠ 0 (comme RiskView).
        List<DashboardDto> rows = dashboardService.buildDashboard(date).stream()
                .filter(d -> dbl(d.getDv01Bond()) != 0.0)
                .toList();

        double totalDv01 = 0.0;
        double totalConvexDollar = 0.0;
        for (DashboardDto d : rows) {
            totalDv01 += dbl(d.getDv01Bond());
            totalConvexDollar += dbl(d.getConvexity()) * dbl(d.getNetNominal());
        }

        List<RateScenarioDto.Scenario> scenarios = new ArrayList<>(DELTAS_BP.length);
        for (int delta : DELTAS_BP) {
            double deltaFrac = delta / 10000.0;                 // Δy en décimal
            double pnlUsdLin = -totalDv01 * delta;
            double convAdj   = 0.5 * totalConvexDollar * deltaFrac * deltaFrac;
            double pnlUsdAdj = pnlUsdLin + convAdj;
            double pnlMadLin = pnlUsdLin * usdMad;
            double pnlMadAdj = pnlUsdAdj * usdMad;
            scenarios.add(RateScenarioDto.Scenario.builder()
                    .label((delta > 0 ? "+" : "") + delta + "bp")
                    .deltaBp(delta)
                    .pnlUsdLin(pnlUsdLin)
                    .convAdj(convAdj)
                    .pnlUsdAdj(pnlUsdAdj)
                    .pnlMadLin(pnlMadLin)
                    .pnlMadAdj(pnlMadAdj)
                    .build());
        }

        return RateScenarioDto.builder()
                .date(date)
                .totalDv01Usd(totalDv01)
                .totalConvexDollar(totalConvexDollar)
                .usdMad(usdMad)
                .scenarios(scenarios)
                .build();
    }

    private static double dbl(BigDecimal v) {
        return v != null ? v.doubleValue() : 0.0;
    }
}
