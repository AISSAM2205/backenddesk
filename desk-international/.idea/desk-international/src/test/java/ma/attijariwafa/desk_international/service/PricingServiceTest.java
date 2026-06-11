package ma.attijariwafa.desk_international.service;

import ma.attijariwafa.desk_international.dto.PricingDto;
import ma.attijariwafa.desk_international.entity.Instrument;
import ma.attijariwafa.desk_international.entity.PricingConfig;
import ma.attijariwafa.desk_international.repository.PricingConfigRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Tests unitaires purs (sans contexte Spring ni base) de la décision BUY/HOLD.
 * Règle métier : G-Spread BID > Target → BUY (bond sous-évalué), sinon HOLD.
 */
class PricingServiceTest {

    private static final LocalDate DATE = LocalDate.of(2025, 5, 20);

    private PricingConfigRepository pricingRepo;
    private PricingService service;

    @BeforeEach
    void setUp() {
        pricingRepo = mock(PricingConfigRepository.class);
        service = new PricingService(pricingRepo);
    }

    private PricingConfig cfg(String isin, String gBid, String gAsk, String target) {
        return PricingConfig.builder()
                .instrument(Instrument.builder().isin(isin).build())
                .configDate(DATE)
                .gSpreadBid(new BigDecimal(gBid))
                .gSpreadAsk(new BigDecimal(gAsk))
                .targetSpread(new BigDecimal(target))
                .build();
    }

    @Test
    @DisplayName("G-Spread BID > Target → BUY ; BID < Target → HOLD")
    void decisionLogic_buyVsHold() {
        when(pricingRepo.findByConfigDate(DATE)).thenReturn(List.of(
                cfg("XS_BUY", "141.0", "131.0", "130.0"),    // 141 > 130 → BUY
                cfg("XS_HOLD", "120.0", "112.0", "125.0")));  // 120 < 125 → HOLD

        Map<String, String> byIsin = service.computeBuyHoldDecisions(DATE).stream()
                .collect(Collectors.toMap(PricingDto::getIsin, PricingDto::getDecision));

        assertThat(byIsin)
                .containsEntry("XS_BUY", "BUY")
                .containsEntry("XS_HOLD", "HOLD");
    }

    @Test
    @DisplayName("BID = Target (égalité) → HOLD (strictement supérieur requis)")
    void decisionLogic_equalSpreads_isHold() {
        when(pricingRepo.findByConfigDate(DATE)).thenReturn(List.of(
                cfg("XS_EQ", "130.0", "120.0", "130.0")));   // 130 == 130 → HOLD

        PricingDto dto = service.computeBuyHoldDecisions(DATE).get(0);
        assertThat(dto.getDecision()).isEqualTo("HOLD");
    }

    @Test
    @DisplayName("G-Spread Mid = (BID + ASK) / 2")
    void gSpreadMid_isAverageOfBidAsk() {
        when(pricingRepo.findByConfigDate(DATE)).thenReturn(List.of(
                cfg("XS_BUY", "141.0", "131.0", "130.0")));   // (141 + 131) / 2 = 136

        PricingDto dto = service.computeBuyHoldDecisions(DATE).get(0);
        assertThat(dto.getGSpreadMid()).isEqualByComparingTo("136");
    }

    @Test
    @DisplayName("Date sans config → fallback sur le dernier snapshot (findLatest)")
    void computeBuyHoldDecisions_fallsBackToLatest() {
        when(pricingRepo.findByConfigDate(DATE)).thenReturn(List.of());
        when(pricingRepo.findLatest()).thenReturn(List.of(
                cfg("XS_BUY", "141.0", "131.0", "130.0")));

        List<PricingDto> res = service.computeBuyHoldDecisions(DATE);

        assertThat(res).hasSize(1);
        assertThat(res.get(0).getDecision()).isEqualTo("BUY");
    }
}
