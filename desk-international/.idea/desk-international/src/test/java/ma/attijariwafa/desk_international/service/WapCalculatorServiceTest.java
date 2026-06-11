package ma.attijariwafa.desk_international.service;

import ma.attijariwafa.desk_international.entity.Trade;
import ma.attijariwafa.desk_international.repository.TradeRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Tests unitaires purs (sans contexte Spring ni base de données) du moteur WAP.
 * Valeurs calculées à la main → réconciliation directe avec l'Excel du desk.
 */
class WapCalculatorServiceTest {

    private TradeRepository tradeRepo;
    private WapCalculatorService service;

    @BeforeEach
    void setUp() {
        tradeRepo = mock(TradeRepository.class);
        service = new WapCalculatorService(tradeRepo);
    }

    private Trade buy(String nominal, String dirty, LocalDate date) {
        return Trade.builder()
                .way("BUY")
                .nominal(new BigDecimal(nominal))
                .dirtyPrice(new BigDecimal(dirty))
                .tradeDate(date)
                .build();
    }

    @Test
    @DisplayName("WAP dirty = moyenne des BUY pondérée par le nominal")
    void calculateWapDirty_weightedAverage() {
        when(tradeRepo.findByBondInstrumentIsinAndWayOrderByTradeDateAsc("XS1", "BUY"))
                .thenReturn(List.of(
                        buy("10000000", "1.00", LocalDate.of(2024, 1, 15)),
                        buy("30000000", "1.10", LocalDate.of(2024, 6, 5))));

        // (10M × 1.00 + 30M × 1.10) / 40M = 43M / 40M = 1.075
        assertThat(service.calculateWapDirty("XS1")).isEqualByComparingTo("1.075");
    }

    @Test
    @DisplayName("Dirty reconstruit = clean + accrued quand dirtyPrice est null")
    void calculateWapDirty_fallbackCleanPlusAccrued() {
        Trade t = Trade.builder()
                .way("BUY")
                .nominal(new BigDecimal("10000000"))
                .dirtyPrice(null)
                .cleanPrice(new BigDecimal("1.00"))
                .accrued(new BigDecimal("0.02"))
                .tradeDate(LocalDate.of(2024, 1, 15))
                .build();
        when(tradeRepo.findByBondInstrumentIsinAndWayOrderByTradeDateAsc("XS2", "BUY"))
                .thenReturn(List.of(t));

        // dirty = 1.00 + 0.02 = 1.02 ; WAP d'un seul trade = 1.02
        assertThat(service.calculateWapDirty("XS2")).isEqualByComparingTo("1.02");
    }

    @Test
    @DisplayName("Aucun trade BUY → WAP = 0")
    void calculateWapDirty_noBuys_returnsZero() {
        when(tradeRepo.findByBondInstrumentIsinAndWayOrderByTradeDateAsc("XS3", "BUY"))
                .thenReturn(Collections.emptyList());

        assertThat(service.calculateWapDirty("XS3")).isEqualByComparingTo("0");
    }

    @Test
    @DisplayName("P&L réalisé = (prix vente dirty − WAP) × nominal")
    void calcRealizedPnl() {
        // (1.06562 − 1.027455) × 20 000 000 = 0.038165 × 20 000 000 = 763 300
        BigDecimal pnl = service.calcRealizedPnl(
                new BigDecimal("1.06562"),
                new BigDecimal("1.027455"),
                new BigDecimal("20000000"));

        assertThat(pnl).isEqualByComparingTo("763300");
    }

    @Test
    @DisplayName("MtM future SELL = (last − entry) × nb × taille / 100")
    void calcFutureMtm_sell() {
        // (1.02 − 1.00) × 10 × 100000 / 100 = 200  (SELL → base non inversé)
        BigDecimal mtm = service.calcFutureMtm(
                "SELL", new BigDecimal("1.02"), new BigDecimal("1.00"), 10, new BigDecimal("100000"));

        assertThat(mtm).isEqualByComparingTo("200");
    }

    @Test
    @DisplayName("MtM future BUY = signe inversé du SELL")
    void calcFutureMtm_buy_isNegated() {
        BigDecimal mtm = service.calcFutureMtm(
                "BUY", new BigDecimal("1.02"), new BigDecimal("1.00"), 10, new BigDecimal("100000"));

        assertThat(mtm).isEqualByComparingTo("-200");
    }
}
