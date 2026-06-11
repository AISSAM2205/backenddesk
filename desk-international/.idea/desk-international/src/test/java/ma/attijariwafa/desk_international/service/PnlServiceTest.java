package ma.attijariwafa.desk_international.service;

import ma.attijariwafa.desk_international.dto.PnLDto;
import ma.attijariwafa.desk_international.entity.MarketData;
import ma.attijariwafa.desk_international.entity.MarketRates;
import ma.attijariwafa.desk_international.entity.VPosition;
import ma.attijariwafa.desk_international.repository.CouponReceivedRepository;
import ma.attijariwafa.desk_international.repository.MarketDataRepository;
import ma.attijariwafa.desk_international.repository.MarketRatesRepository;
import ma.attijariwafa.desk_international.repository.VPositionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Tests unitaires purs du moteur P&L. On vérifie les sorties DÉTERMINISTES
 * (indépendantes de la date) : dirty marché, perf WAP, P&L latent, P&L comptable.
 * (Le financement dépend du jour de l'année → volontairement non asserté ici.)
 */
class PnlServiceTest {

    private static final LocalDate DATE = LocalDate.of(2025, 5, 20);
    private static final String ISIN = "XS2595028452";

    private VPositionRepository posRepo;
    private MarketDataRepository mdRepo;
    private MarketRatesRepository mrRepo;
    private CouponReceivedRepository cpnRepo;
    private PnlService service;

    @BeforeEach
    void setUp() {
        posRepo = mock(VPositionRepository.class);
        mdRepo = mock(MarketDataRepository.class);
        mrRepo = mock(MarketRatesRepository.class);
        cpnRepo = mock(CouponReceivedRepository.class);
        // Ordre du constructeur @RequiredArgsConstructor = ordre des champs
        service = new PnlService(posRepo, mdRepo, mrRepo, cpnRepo);
    }

    @Test
    @DisplayName("P&L latent = nominal × (dirty marché − WAP) ; P&L comptable MAD = P&L total × FX")
    void computePnLForIsin_latentAndAccounting() {
        VPosition pos = mock(VPosition.class);
        when(pos.getIsin()).thenReturn(ISIN);
        when(pos.getDescription()).thenReturn("MOROC 5.95");
        when(pos.getCurrency()).thenReturn("USD");
        when(pos.getNetNominal()).thenReturn(new BigDecimal("10000000"));
        when(pos.getLastWapDirty()).thenReturn(new BigDecimal("1.00"));
        when(pos.getTotalRealizedPnl()).thenReturn(BigDecimal.ZERO);
        when(pos.getCouponRate()).thenReturn(BigDecimal.ZERO);
        when(posRepo.findByIsin(ISIN)).thenReturn(Optional.of(pos));

        // FX USD/MAD = 10 ; SOFR 5% (utilisé seulement pour le financement, non asserté)
        when(mrRepo.findByRateDate(DATE)).thenReturn(Optional.of(
                MarketRates.builder()
                        .usdMad(new BigDecimal("10.0"))
                        .sofrRate(new BigDecimal("5.0"))
                        .build()));

        // Dirty marché = pxMid + accrued = 1.02 + 0.00
        when(mdRepo.findByIsinAndDate(ISIN, DATE)).thenReturn(Optional.of(
                MarketData.builder()
                        .pxMid(new BigDecimal("1.02"))
                        .accruedBloomberg(new BigDecimal("0.00"))
                        .build()));

        when(cpnRepo.sumByIsin(ISIN)).thenReturn(Optional.empty()); // aucun coupon reçu

        PnLDto dto = service.computePnLForIsin(ISIN, DATE);

        assertThat(dto.getDirtyMarket()).isEqualByComparingTo("1.02");        // 1.02 + 0.00
        assertThat(dto.getPerfWap()).isEqualByComparingTo("0.02");            // 1.02 − 1.00
        assertThat(dto.getPnlLatentCcy()).isEqualByComparingTo("200000");     // 10 000 000 × 0.02
        assertThat(dto.getTotalPnlCcy()).isEqualByComparingTo("200000");      // latent + réalisé(0) + coupons(0)
        assertThat(dto.getPnlAccountingMad()).isEqualByComparingTo("2000000"); // 200 000 × 10 (FX)
    }
}
