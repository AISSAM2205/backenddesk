package ma.attijariwafa.desk_international.service;

import ma.attijariwafa.desk_international.dto.DashboardDto;
import ma.attijariwafa.desk_international.dto.GlobalDashboardDto;
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
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Tests de RÉCONCILIATION de l'agrégat dashboard ({@link GlobalDashboardService}).
 *
 * <p>On ne teste pas des valeurs de marché (elles respirent avec les prix), mais
 * des <b>INVARIANTS</b> qui doivent TOUJOURS tenir, quel que soit le marché :</p>
 * <ul>
 *   <li><b>R1</b> {@code totalDv01Usd} == Σ DV01 des eurobonds</li>
 *   <li><b>R2</b> {@code totalNominalUsd} == eurobonds (FX homogène) + CLN + EGP
 *       (snapshots), <b>sans double-comptage</b> et <b>sans sommer l'EGP comme de l'USD</b></li>
 *   <li><b>R3</b> {@code totalPlEcoMad} == Σ P&amp;L eurobonds + CLN + EGP</li>
 *   <li><b>R4</b> {@code totalPnlAccountingMad} == Latent + Réalisé + Coupons (tout en MAD)</li>
 * </ul>
 *
 * <p>Ces invariants auraient bloqué les 4 bugs corrigés : double-comptage CLN/EGP,
 * EGP sommé comme USD, coupon « cash reçu » au lieu d'accrual, et latent en CCY
 * brut au lieu de MAD. C'est la preuve de justesse, pas seulement l'affichage.</p>
 */
class GlobalDashboardReconciliationTest {

    private static final LocalDate DATE = LocalDate.of(2025, 5, 20);

    private DashboardService dashboardService;
    private RiskService riskService;
    private ExternalPnlSnapshotRepository extRepo;
    private MarketRatesRepository mrRepo;
    private GlobalDashboardService service;

    @BeforeEach
    void setUp() {
        dashboardService = mock(DashboardService.class);
        riskService = mock(RiskService.class);
        extRepo = mock(ExternalPnlSnapshotRepository.class);
        mrRepo = mock(MarketRatesRepository.class);
        // @RequiredArgsConstructor : ordre = ordre des champs
        // (dashboardService, riskService, extRepo, mrRepo)
        service = new GlobalDashboardService(dashboardService, riskService, extRepo, mrRepo);

        // FX : USD/MAD = 10, EUR/MAD = 10.9, USD/EGP = 49
        when(mrRepo.findByRateDate(DATE)).thenReturn(Optional.of(
                MarketRates.builder()
                        .usdMad(new BigDecimal("10"))
                        .eurMad(new BigDecimal("10.9"))
                        .usdEgp(new BigDecimal("49"))
                        .build()));
        when(riskService.computePortfolioDuration(DATE)).thenReturn(new BigDecimal("3.5"));
    }

    private DashboardDto bond(String ccy, double dv01, double nominal, double plEco, String sub) {
        return DashboardDto.builder()
                .currency(ccy).subAsset(sub)
                .dv01Bond(BigDecimal.valueOf(dv01))
                .netNominal(BigDecimal.valueOf(nominal))
                .pnlEconomicMad(BigDecimal.valueOf(plEco))
                .build();
    }

    private ExternalPnlSnapshot snap(String cat, double nominalUsd, double plEcoMad) {
        return ExternalPnlSnapshot.builder()
                .assetCategory(cat)
                .nominalUsd(BigDecimal.valueOf(nominalUsd))
                .plEcoMad(BigDecimal.valueOf(plEcoMad))
                .build();
    }

    @Test
    @DisplayName("R1/R2/R3 : agrégat = Σ lignes, sans double-comptage CLN/EGP ni EGP-as-USD")
    void aggregates_reconcile_without_double_count() {
        // 2 eurobonds + 1 ligne CLN + 1 ligne EGP : ces 2 dernières DOIVENT être
        // filtrées (CLN/EGP arrivent par les snapshots, sinon comptés deux fois).
        when(dashboardService.buildDashboard(DATE)).thenReturn(List.of(
                bond("USD", 10000, 100_000_000, 2_000_000, "Mor Bond"),
                bond("EUR",  5000,  50_000_000, 1_000_000, "OCP Bond"),
                bond("USD",   375,   3_000_000,   500_000, "CLN MOROC"), // doit être exclu
                bond("EGP",  1200,  50_000_000,   400_000, "EGP Bill")   // doit être exclu
        ));
        when(extRepo.findByAssetCategoryAndSnapshotDate("CLN", DATE))
                .thenReturn(List.of(snap("CLN", 3_000_000, 980_000)));
        when(extRepo.findByAssetCategoryAndSnapshotDate("EGP_BILL", DATE))
                .thenReturn(List.of(snap("EGP_BILL", 1_600_000, 550_000)));

        GlobalDashboardDto g = service.buildGlobal(DATE);

        // R1 — DV01 agrégé = 10000 + 5000 (eurobonds uniquement)
        assertThat(g.getTotalDv01Usd()).isEqualByComparingTo("15000");

        // R2 — Nominal USD homogène, sans double-comptage, EGP NON sommé comme USD :
        //   eurobonds MAD = 100M×10 + 50M×10.9 = 1 545 000 000 → ÷10 = 154 500 000 USD
        //   + CLN snapshot 3 000 000 + EGP snapshot 1 600 000 = 159 100 000
        assertThat(g.getTotalNominalMad()).isEqualByComparingTo("159100000");

        // R3 — P&L Éco = eurobonds (2M + 1M) + CLN 980k + EGP 550k = 4 530 000
        assertThat(g.getTotalPlEcoMad()).isEqualByComparingTo("4530000");
    }

    @Test
    @DisplayName("R4 : P&L Comptable = Latent + Réalisé + Coupons, tout converti en MAD")
    void bridge_components_reconcile_in_mad() {
        // 1 eurobond USD avec composantes EXPLICITES (en devise) :
        //   comptable attendu = (200000 + 50000 + 30000) × FX(10) = 2 800 000 MAD
        when(dashboardService.buildDashboard(DATE)).thenReturn(List.of(
                DashboardDto.builder()
                        .currency("USD").subAsset("Mor Bond")
                        .dv01Bond(new BigDecimal("1000"))
                        .netNominal(new BigDecimal("10000000"))
                        .pnlLatentCcy(new BigDecimal("200000"))
                        .pnlRealizedCcy(new BigDecimal("50000"))
                        .couponsCcy(new BigDecimal("30000"))
                        .pnlAccountingMad(new BigDecimal("2800000"))
                        .pnlEconomicMad(new BigDecimal("2800000"))
                        .fundingCostMad(BigDecimal.ZERO)
                        .build()
        ));
        // Aucun CLN / EGP (snapshots vides + repli vide)
        when(extRepo.findByAssetCategoryAndSnapshotDate("CLN", DATE)).thenReturn(List.of());
        when(extRepo.findByAssetCategoryAndSnapshotDate("EGP_BILL", DATE)).thenReturn(List.of());
        when(extRepo.findLatestByCategory("CLN")).thenReturn(List.of());
        when(extRepo.findLatestByCategory("EGP_BILL")).thenReturn(List.of());

        GlobalDashboardDto g = service.buildGlobal(DATE);

        // Composantes converties en MAD (×10) — auraient été en CCY brut sans le fix
        assertThat(g.getTotalPlLatentMad()).isEqualByComparingTo("2000000");   // 200000 × 10
        assertThat(g.getTotalPlRealizedMad()).isEqualByComparingTo("500000");  //  50000 × 10
        assertThat(g.getTotalCouponsMad()).isEqualByComparingTo("300000");     //  30000 × 10

        // R4 — Comptable == Latent + Réalisé + Coupons (réconciliation du bridge)
        BigDecimal recomputed = g.getTotalPlLatentMad()
                .add(g.getTotalPlRealizedMad())
                .add(g.getTotalCouponsMad());
        assertThat(g.getTotalPnlAccountingMad()).isEqualByComparingTo(recomputed);
    }
}
