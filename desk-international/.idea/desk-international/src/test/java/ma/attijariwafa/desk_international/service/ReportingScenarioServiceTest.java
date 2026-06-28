package ma.attijariwafa.desk_international.service;

import ma.attijariwafa.desk_international.dto.DashboardDto;
import ma.attijariwafa.desk_international.dto.ReportingScenarioDto;
import ma.attijariwafa.desk_international.entity.ExternalPnlSnapshot;
import ma.attijariwafa.desk_international.entity.MarketRates;
import ma.attijariwafa.desk_international.repository.ExternalPnlSnapshotRepository;
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
 * Tests unitaires de la projection de scénarios fin d'année. Les agrégats DV01
 * et la composition (actuel + carry + impact) sont vérifiés contre des valeurs
 * À LA MAIN ; le carry est validé via remainDays/tradingDays exposés par le DTO
 * (déterministe quelle que soit la date d'exécution du test).
 */
class ReportingScenarioServiceTest {

    private static final LocalDate DATE = LocalDate.of(2025, 5, 20);

    private DashboardService dashboardService;
    private ExternalPnlSnapshotRepository extRepo;
    private MarketRatesRepository mrRepo;
    private ReportingScenarioService service;

    @BeforeEach
    void setUp() {
        dashboardService = mock(DashboardService.class);
        extRepo = mock(ExternalPnlSnapshotRepository.class);
        mrRepo = mock(MarketRatesRepository.class);
        // @RequiredArgsConstructor : ordre (dashboardService, extRepo, mrRepo)
        service = new ReportingScenarioService(dashboardService, extRepo, mrRepo);
    }

    private DashboardDto row(String sub, String ccy, double dv01, double pnlEco, double netDaily) {
        return DashboardDto.builder()
                .subAsset(sub).currency(ccy)
                .dv01Bond(BigDecimal.valueOf(dv01))
                .pnlEconomicMad(BigDecimal.valueOf(pnlEco))
                .netDailyMad(BigDecimal.valueOf(netDaily))
                .build();
    }

    private ExternalPnlSnapshot ext(String cat, double plEco) {
        return ExternalPnlSnapshot.builder()
                .assetCategory(cat).plEcoMad(BigDecimal.valueOf(plEco)).build();
    }

    @Test
    @DisplayName("Projection scénarios : DV01 agrégé, carry et composition vérifiés")
    void computeScenarios_handChecked() {
        when(dashboardService.buildDashboard(DATE)).thenReturn(List.of(
                row("MOR Bond", "USD", 10000, 1_000_000, 5000),
                row("OCP Bond", "EUR",  4000,   500_000, 2000),
                row("Future",   "USD", 99999,   999_999, 9999)   // ignoré
        ));
        when(extRepo.findByAssetCategoryAndSnapshotDate("CLN", DATE))
                .thenReturn(List.of(ext("CLN", 300_000)));
        when(extRepo.findByAssetCategoryAndSnapshotDate("EGP_BILL", DATE))
                .thenReturn(List.of(ext("EGP_BILL", 200_000)));
        when(mrRepo.findByRateDate(DATE)).thenReturn(Optional.of(MarketRates.builder()
                .usdMad(new BigDecimal("10.0")).eurMad(new BigDecimal("11.0")).build()));

        ReportingScenarioDto r = service.computeScenarios(DATE, 100, 0, -50);

        // Échos des chocs.
        assertThat(r.getPess()).isEqualTo(100);
        assertThat(r.getCentral()).isEqualTo(0);
        assertThat(r.getOpt()).isEqualTo(-50);

        // DV01 : moroc USD = 10000×10 = 100 000 ; ocp EUR = 4000×11 = 44 000
        assertThat(r.getDv01Total()).isCloseTo(14000.0, offset(1e-6));
        assertThat(r.getDv01TotalMad()).isCloseTo(144_000.0, offset(1e-3));

        Map<String, ReportingScenarioDto.AssetRow> ar = r.getAssetRows().stream()
                .collect(Collectors.toMap(ReportingScenarioDto.AssetRow::getKey, Function.identity()));
        assertThat(r.getAssetRows()).hasSize(4);

        assertThat(ar.get("moroc").getDv01Mad()).isCloseTo(100_000.0, offset(1e-3));
        assertThat(ar.get("moroc").getActual()).isCloseTo(1_000_000.0, offset(1e-6));
        assertThat(ar.get("ocp").getDv01Mad()).isCloseTo(44_000.0, offset(1e-3));
        assertThat(ar.get("cln").getActual()).isCloseTo(300_000.0, offset(1e-6));
        assertThat(ar.get("egp").getActual()).isCloseTo(200_000.0, offset(1e-6));
        assertThat(ar.get("cln").getDv01Mad()).isCloseTo(0.0, offset(1e-9));

        // Carry = run-rate × remainDays (déterministe via le DTO).
        int remain = r.getRemainDays();
        int td = r.getTradingDays();
        assertThat(ar.get("moroc").getCarry()).isCloseTo(5000.0 * remain, offset(1e-6));
        assertThat(ar.get("ocp").getCarry()).isCloseTo(2000.0 * remain, offset(1e-6));
        assertThat(ar.get("cln").getCarry()).isCloseTo((300_000.0 / td) * remain, offset(1e-6));
        assertThat(ar.get("egp").getCarry()).isCloseTo((200_000.0 / td) * remain, offset(1e-6));

        // Scénario pessimiste (choc +100) : impact = -DV01_MAD × 100
        ReportingScenarioDto.Scenario pess = r.getScenarios().stream()
                .filter(s -> s.getKey().equals("pess")).findFirst().orElseThrow();
        Map<String, ReportingScenarioDto.AssetResult> pr = pess.getAssetResults().stream()
                .collect(Collectors.toMap(ReportingScenarioDto.AssetResult::getKey, Function.identity()));
        assertThat(pr.get("moroc").getRateImpact()).isCloseTo(-100_000.0 * 100, offset(1e-3));
        assertThat(pr.get("ocp").getRateImpact()).isCloseTo(-44_000.0 * 100, offset(1e-3));
        assertThat(pr.get("cln").getRateImpact()).isCloseTo(0.0, offset(1e-9));
        // Composition : yeProjection = actuel + carry + impact
        assertThat(pr.get("moroc").getYeProjection()).isCloseTo(
                ar.get("moroc").getActual() + ar.get("moroc").getCarry() + pr.get("moroc").getRateImpact(),
                offset(1e-6));
        // Total scénario = somme des projections
        double expectedTotal = pess.getAssetResults().stream()
                .mapToDouble(ReportingScenarioDto.AssetResult::getYeProjection).sum();
        assertThat(pess.getTotal()).isCloseTo(expectedTotal, offset(1e-6));

        // Scénario central (choc 0) : aucun impact taux.
        ReportingScenarioDto.Scenario central = r.getScenarios().stream()
                .filter(s -> s.getKey().equals("central")).findFirst().orElseThrow();
        assertThat(central.getAssetResults()).allSatisfy(a ->
                assertThat(a.getRateImpact()).isCloseTo(0.0, offset(1e-9)));
    }
}
