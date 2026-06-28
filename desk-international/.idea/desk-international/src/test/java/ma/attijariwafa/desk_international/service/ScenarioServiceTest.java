package ma.attijariwafa.desk_international.service;

import ma.attijariwafa.desk_international.dto.DashboardDto;
import ma.attijariwafa.desk_international.dto.RateScenarioDto;
import ma.attijariwafa.desk_international.entity.MarketRates;
import ma.attijariwafa.desk_international.repository.MarketRatesRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.offset;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Tests unitaires de la grille de scénarios de taux. Valeurs attendues
 * calculées À LA MAIN (preuve de correction + parité avec l'ex-RiskView).
 */
class ScenarioServiceTest {

    private static final LocalDate DATE = LocalDate.of(2025, 5, 20);

    private DashboardService dashboardService;
    private MarketRatesRepository mrRepo;
    private ScenarioService service;

    @BeforeEach
    void setUp() {
        dashboardService = mock(DashboardService.class);
        mrRepo = mock(MarketRatesRepository.class);
        // @RequiredArgsConstructor : ordre = ordre des champs (dashboardService, mrRepo)
        service = new ScenarioService(dashboardService, mrRepo);
    }

    private DashboardDto bond(double dv01, double convexity, double nominal) {
        return DashboardDto.builder()
                .currency("USD")
                .dv01Bond(BigDecimal.valueOf(dv01))
                .convexity(BigDecimal.valueOf(convexity))
                .netNominal(BigDecimal.valueOf(nominal))
                .build();
    }

    @Test
    @DisplayName("Grille de scénarios : agrégats + P&L Taylor vérifiés à la main")
    void computeRateScenarios_handChecked() {
        // 2 bonds actifs + 1 à DV01 nul (doit être EXCLU des agrégats).
        when(dashboardService.buildDashboard(DATE)).thenReturn(List.of(
                bond(10000, 0.5, 100_000_000.0),   // ΣC·N += 50 000 000
                bond(5000,  0.3,  50_000_000.0),   // ΣC·N += 15 000 000
                bond(0,     1.0, 999_000_000.0)    // DV01 = 0 → ignoré
        ));
        when(mrRepo.findByRateDate(DATE)).thenReturn(Optional.of(
                MarketRates.builder().usdMad(new BigDecimal("10.0")).build()));

        RateScenarioDto r = service.computeRateScenarios(DATE);

        // Agrégats : totalDv01 = 15 000 ; ΣC·N = 65 000 000 ; usdMad = 10
        assertThat(r.getTotalDv01Usd()).isCloseTo(15000.0, offset(1e-6));
        assertThat(r.getTotalConvexDollar()).isCloseTo(65_000_000.0, offset(1e-3));
        assertThat(r.getUsdMad()).isCloseTo(10.0, offset(1e-9));
        assertThat(r.getScenarios()).hasSize(6);

        Map<Integer, RateScenarioDto.Scenario> byDelta = r.getScenarios().stream()
                .collect(Collectors.toMap(RateScenarioDto.Scenario::getDeltaBp, Function.identity()));

        // +100 bp : lin = -15000×100 = -1 500 000 ; conv = ½×65e6×0.01² = 3250
        RateScenarioDto.Scenario up = byDelta.get(100);
        assertThat(up.getPnlUsdLin()).isCloseTo(-1_500_000.0, offset(1e-6));
        assertThat(up.getConvAdj()).isCloseTo(3250.0, offset(1e-6));
        assertThat(up.getPnlUsdAdj()).isCloseTo(-1_496_750.0, offset(1e-6));
        assertThat(up.getPnlMadLin()).isCloseTo(-15_000_000.0, offset(1e-3));
        assertThat(up.getPnlMadAdj()).isCloseTo(-14_967_500.0, offset(1e-3));

        // -100 bp : lin = +1 500 000 ; conv identique (Δ²) ; adj = 1 503 250
        RateScenarioDto.Scenario down = byDelta.get(-100);
        assertThat(down.getPnlUsdLin()).isCloseTo(1_500_000.0, offset(1e-6));
        assertThat(down.getConvAdj()).isCloseTo(3250.0, offset(1e-6));
        assertThat(down.getPnlMadAdj()).isCloseTo(15_032_500.0, offset(1e-3));

        // +25 bp : lin = -375 000 ; conv = ½×65e6×0.0025² = 203.125
        RateScenarioDto.Scenario up25 = byDelta.get(25);
        assertThat(up25.getPnlUsdLin()).isCloseTo(-375_000.0, offset(1e-6));
        assertThat(up25.getConvAdj()).isCloseTo(203.125, offset(1e-6));
        assertThat(up25.getPnlMadAdj()).isCloseTo(-3_747_968.75, offset(1e-3));
    }

    @Test
    @DisplayName("FX absent → repli USD_MAD_REF = 9.251")
    void computeRateScenarios_fxFallback() {
        when(dashboardService.buildDashboard(DATE)).thenReturn(List.of(
                bond(10000, 0.0, 100_000_000.0)));
        when(mrRepo.findByRateDate(DATE)).thenReturn(Optional.empty());
        when(mrRepo.findTopByOrderByRateDateDesc()).thenReturn(Optional.empty());

        RateScenarioDto r = service.computeRateScenarios(DATE);

        assertThat(r.getUsdMad()).isCloseTo(9.251, offset(1e-9));
        // +100 bp : lin = -1 000 000 USD → MAD = -1 000 000 × 9.251
        assertThat(r.getScenarios().stream()
                .filter(s -> s.getDeltaBp() == 100).findFirst().orElseThrow()
                .getPnlMadLin()).isCloseTo(-1_000_000.0 * 9.251, offset(1e-3));
    }
}
