package ma.attijariwafa.desk_international.service;

import ma.attijariwafa.desk_international.dto.EgpBreakevenDto;
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
import static org.assertj.core.api.Assertions.offset;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Tests unitaires du breakeven FX EGP. Valeurs attendues calculées À LA MAIN
 * (preuve de correction + parité avec l'ex-EGPView).
 */
class EgpBreakevenServiceTest {

    private static final LocalDate DATE = LocalDate.of(2025, 5, 20);

    private ExternalPnlSnapshotRepository extRepo;
    private MarketRatesRepository mrRepo;
    private EgpBreakevenService service;

    @BeforeEach
    void setUp() {
        extRepo = mock(ExternalPnlSnapshotRepository.class);
        mrRepo = mock(MarketRatesRepository.class);
        // @RequiredArgsConstructor : ordre des champs (extRepo, mrRepo)
        service = new EgpBreakevenService(extRepo, mrRepo);
    }

    @Test
    @DisplayName("Breakeven EGP : BKV, coussins et P&L FX vérifiés à la main")
    void computeBreakeven_handChecked() {
        // spot=50, SOFR=5% (→0.05), USD/MAD=10
        when(mrRepo.findByRateDate(DATE)).thenReturn(Optional.of(MarketRates.builder()
                .usdEgp(new BigDecimal("50.0"))
                .sofrRate(new BigDecimal("5.0"))
                .usdMad(new BigDecimal("10.0"))
                .build()));

        // Deal 1 : coupon décimal 0.20, WAP 48, nominal 1M, échéance +90j
        ExternalPnlSnapshot d1 = ExternalPnlSnapshot.builder()
                .isin("EG0001").assetCategory("EGP_BILL")
                .couponRate(new BigDecimal("0.20"))
                .wapFxEntry(new BigDecimal("48.0"))
                .nominalUsd(new BigDecimal("1000000"))
                .maturityDate(LocalDate.now().plusDays(90))
                .build();
        // Deal 2 : coupon en % (25), WAP absent → fxEntry = spot, échéance nulle → 90j
        ExternalPnlSnapshot d2 = ExternalPnlSnapshot.builder()
                .isin("EG0002").assetCategory("EGP_BILL")
                .couponRate(new BigDecimal("25.0"))
                .nominalUsd(new BigDecimal("2000000"))
                .build();
        when(extRepo.findByAssetCategoryAndSnapshotDate("EGP_BILL", DATE))
                .thenReturn(List.of(d1, d2));

        EgpBreakevenDto r = service.computeBreakeven(DATE);

        assertThat(r.getSpot()).isCloseTo(50.0, offset(1e-9));
        assertThat(r.getSofr()).isCloseTo(0.05, offset(1e-9));
        assertThat(r.getUsdMad()).isCloseTo(10.0, offset(1e-9));
        assertThat(r.getDeals()).hasSize(2);

        // Deal 1 : yield 0.20, fxEntry 48, 90j
        // BKV s/fin = 48 × (1 + 0.20×90/360) = 48 × 1.05 = 50.4
        // BKV a/fin = 48 × (1 + 0.15×90/360) = 48 × 1.0375 = 49.8
        // coussin s/fin = (50.4−50)/50×100 = 0.8 % ; a/fin = (49.8−50)/50×100 = −0.4 %
        // P&L FX = (50−48)×1 000 000×10/50 = 400 000
        EgpBreakevenDto.Deal a = r.getDeals().get(0);
        assertThat(a.getYieldRate()).isCloseTo(0.20, offset(1e-9));
        assertThat(a.getDaysRem()).isEqualTo(90);
        assertThat(a.getFxEntry()).isCloseTo(48.0, offset(1e-9));
        assertThat(a.getBkvSansFin()).isCloseTo(50.4, offset(1e-9));
        assertThat(a.getBkvAvecFin()).isCloseTo(49.8, offset(1e-9));
        assertThat(a.getCushionSans()).isCloseTo(0.8, offset(1e-9));
        assertThat(a.getCushionAvec()).isCloseTo(-0.4, offset(1e-9));
        assertThat(a.getPlFxApprox()).isCloseTo(400_000.0, offset(1e-6));

        // Deal 2 : coupon 25 → yield 0.25 ; WAP absent → fxEntry = spot = 50 ; 90j
        // BKV s/fin = 50 × (1 + 0.25×90/360) = 50 × 1.0625 = 53.125 ; coussin = 6.25 %
        // BKV a/fin = 50 × (1 + 0.20×90/360) = 50 × 1.05 = 52.5 ; coussin = 5.0 %
        // P&L FX = (50−50)×... = 0
        EgpBreakevenDto.Deal b = r.getDeals().get(1);
        assertThat(b.getYieldRate()).isCloseTo(0.25, offset(1e-9));
        assertThat(b.getDaysRem()).isEqualTo(90);
        assertThat(b.getFxEntry()).isCloseTo(50.0, offset(1e-9));
        assertThat(b.getBkvSansFin()).isCloseTo(53.125, offset(1e-9));
        assertThat(b.getBkvAvecFin()).isCloseTo(52.5, offset(1e-9));
        assertThat(b.getCushionSans()).isCloseTo(6.25, offset(1e-9));
        assertThat(b.getCushionAvec()).isCloseTo(5.0, offset(1e-9));
        assertThat(b.getPlFxApprox()).isCloseTo(0.0, offset(1e-6));
    }
}
