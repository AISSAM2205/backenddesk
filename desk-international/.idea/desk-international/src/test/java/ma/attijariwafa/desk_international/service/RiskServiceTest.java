package ma.attijariwafa.desk_international.service;

import ma.attijariwafa.desk_international.dto.RiskDto;
import ma.attijariwafa.desk_international.entity.MarketRates;
import ma.attijariwafa.desk_international.entity.RiskMetrics;
import ma.attijariwafa.desk_international.entity.VPosition;
import ma.attijariwafa.desk_international.repository.MarketRatesRepository;
import ma.attijariwafa.desk_international.repository.RiskMetricsRepository;
import ma.attijariwafa.desk_international.repository.TradeRepository;
import ma.attijariwafa.desk_international.repository.VPositionRepository;
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
 * Tests unitaires purs du moteur de risque (DV01, hedge ratio, duration).
 * VPosition est une vue immuable (sans builder) → on la mocke avec Mockito.
 */
class RiskServiceTest {

    private static final LocalDate DATE = LocalDate.of(2025, 5, 20);
    private static final String ISIN = "XS2595028452";

    private RiskMetricsRepository riskRepo;
    private VPositionRepository posRepo;
    private MarketRatesRepository mrRepo;
    private TradeRepository tradeRepo;
    private RiskService service;

    @BeforeEach
    void setUp() {
        riskRepo = mock(RiskMetricsRepository.class);
        posRepo = mock(VPositionRepository.class);
        mrRepo = mock(MarketRatesRepository.class);
        tradeRepo = mock(TradeRepository.class);
        // Ordre du constructeur @RequiredArgsConstructor = ordre des champs
        service = new RiskService(riskRepo, posRepo, mrRepo, tradeRepo);
    }

    private VPosition usdPosition(BigDecimal netNominal) {
        VPosition pos = mock(VPosition.class);
        when(pos.getIsin()).thenReturn(ISIN);
        when(pos.getDescription()).thenReturn("MOROC 5.95");
        when(pos.getCurrency()).thenReturn("USD");
        when(pos.getNetNominal()).thenReturn(netNominal);
        return pos;
    }

    @Test
    @DisplayName("DV01 bond = duration × nominal × 0.0001 ; hedge ratio = DV01 bond / DV01 future")
    void computeForIsin_dv01AndHedgeRatio() {
        VPosition pos = usdPosition(new BigDecimal("10000000"));
        when(posRepo.findByIsin(ISIN)).thenReturn(Optional.of(pos));

        RiskMetrics rm = RiskMetrics.builder()
                .modifiedDuration(new BigDecimal("5.0"))
                .durationCtd(new BigDecimal("5.0"))
                .convFactor(new BigDecimal("1.0"))
                .contractSize(100000)
                .hedgeFuture("FVZ4")
                .ytmMid(new BigDecimal("0.052"))
                .convexity(new BigDecimal("0.5"))
                .build();
        when(riskRepo.findByIsinAndDate(ISIN, DATE)).thenReturn(Optional.of(rm));
        when(tradeRepo.findFuturesNetPositionByHedgeBond(ISIN)).thenReturn(-5);

        RiskDto r = service.computeForIsin(ISIN, DATE);

        assertThat(r.getDv01Bond()).isEqualByComparingTo("5000");     // 5.0 × 10 000 000 × 0.0001
        assertThat(r.getDv01FutureCtd()).isEqualByComparingTo("50");  // 5.0 × 1.0 × 100 000 × 0.0001
        assertThat(r.getHedgeRatio()).isEqualByComparingTo("100");    // 5000 / 50
        assertThat(r.getNbContractsToHedge()).isEqualTo(100);
        assertThat(r.getCurrentFuturesPosition()).isEqualTo(-5);
    }

    @Test
    @DisplayName("Duration portefeuille = moyenne pondérée par l'exposition (nominal × FX)")
    void computePortfolioDuration_weightedAverage() {
        VPosition pos = usdPosition(new BigDecimal("10000000"));
        when(posRepo.findAllActive()).thenReturn(List.of(pos));
        when(riskRepo.findByIsinAndDate(ISIN, DATE)).thenReturn(Optional.of(
                RiskMetrics.builder().modifiedDuration(new BigDecimal("5.0")).build()));
        when(mrRepo.findByRateDate(DATE)).thenReturn(Optional.of(
                MarketRates.builder().usdMad(new BigDecimal("10.0")).build()));

        // Une seule position → duration du book = sa propre duration = 5.0000
        assertThat(service.computePortfolioDuration(DATE)).isEqualByComparingTo("5");
    }
}
