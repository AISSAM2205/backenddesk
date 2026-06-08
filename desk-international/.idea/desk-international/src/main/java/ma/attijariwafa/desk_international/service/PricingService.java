// service/PricingService.java
package ma.attijariwafa.desk_international.service;

import lombok.RequiredArgsConstructor;
import ma.attijariwafa.desk_international.dto.PricingDto;
import ma.attijariwafa.desk_international.entity.PricingConfig;
import ma.attijariwafa.desk_international.repository.PricingConfigRepository;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PricingService {

    private final PricingConfigRepository pricingRepo;

    /**
     * Calcule la décision BUY/HOLD pour tous les bonds d'une date.
     *
     * Logique :
     *  Si G-Spread BID actuel > Target Spread → BUY (bond sous-évalué)
     *  Sinon → HOLD
     *
     * Exemples réels (Dashboard Excel 20/05/2025) :
     *  MOROC 5.95 : G=136.65 < Target=140.38 → HOLD
     *  OCPMR 6.1  : G=202.89 > Target=134.54 → BUY
     */
    public List<PricingDto> computeBuyHoldDecisions(LocalDate date) {
        return pricingRepo.findByConfigDate(date)
                .stream().map(this::compute).collect(Collectors.toList());
    }

    public PricingDto computeForIsin(String isin, LocalDate date) {
        return pricingRepo.findByIsinAndConfigDate(isin, date)
                .map(this::compute)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Pas de config pricing pour " + isin + " à " + date));
    }

    private PricingDto compute(PricingConfig cfg) {
        // G-Spread Mid = (BID + ASK) / 2
        BigDecimal gMid = BigDecimal.ZERO;
        if (cfg.getGSpreadBid() != null && cfg.getGSpreadAsk() != null) {
            gMid = cfg.getGSpreadBid().add(cfg.getGSpreadAsk())
                    .divide(BigDecimal.valueOf(2), 4, RoundingMode.HALF_UP);
        }

        // Décision : G-Spread BID > Target → BUY
        String decision = "HOLD";
        if (cfg.getGSpreadBid() != null && cfg.getTargetSpread() != null) {
            decision = cfg.getGSpreadBid().compareTo(cfg.getTargetSpread()) > 0
                    ? "BUY" : "HOLD";
        }

        return PricingDto.builder()
                .isin(cfg.getIsin())
                .gSpreadBid(cfg.getGSpreadBid())
                .gSpreadAsk(cfg.getGSpreadAsk())
                .gSpreadMid(gMid)
                .historicalAvgSpread(cfg.getHistoricalAvgSpread())
                .targetSpread(cfg.getTargetSpread())
                .decision(decision)
                .build();
    }
}
