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
        // Date exacte, sinon fallback sur le dernier snapshot disponible
        // (sinon SIGNAL / G-Spread vides dès que l'app tourne après le jour du seed)
        List<PricingConfig> configs = pricingRepo.findByConfigDate(date);
        if (configs.isEmpty()) {
            configs = pricingRepo.findLatest();
        }
        return configs.stream().map(this::compute).collect(Collectors.toList());
    }

    public PricingDto computeForIsin(String isin, LocalDate date) {
        // Date exacte, sinon fallback sur le dernier pricing dispo pour cet ISIN
        // (même résilience que la liste /api/pricing → plus de 400 si la date
        //  ne tombe pas pile sur un snapshot seedé).
        return pricingRepo.findByIsinAndConfigDate(isin, date)
                .map(this::compute)
                .orElseGet(() -> {
                    List<PricingConfig> latest = pricingRepo.findLatestByIsin(isin);
                    if (latest.isEmpty())
                        throw new IllegalArgumentException("Pas de config pricing pour " + isin);
                    return compute(latest.get(0));
                });
    }

    private PricingDto compute(PricingConfig cfg) {
        // G-Spread Mid = (BID + ASK) / 2
        BigDecimal gMid = BigDecimal.ZERO;
        if (cfg.getGSpreadBid() != null && cfg.getGSpreadAsk() != null) {
            gMid = cfg.getGSpreadBid().add(cfg.getGSpreadAsk())
                    .divide(BigDecimal.valueOf(2), 4, RoundingMode.HALF_UP);
        }

        // Décision : on RESPECTE le signal stocké (choix manuel du trader via
        // le dropdown, ou valeur seedée). On ne recalcule depuis les spreads
        // QUE si aucun signal n'est stocké — sinon le choix manuel serait écrasé
        // à chaque refresh.
        String decision = cfg.getDecision();
        if (decision == null || decision.isBlank()) {
            decision = "HOLD";
            if (cfg.getGSpreadBid() != null && cfg.getTargetSpread() != null) {
                decision = cfg.getGSpreadBid().compareTo(cfg.getTargetSpread()) > 0
                        ? "BUY" : "HOLD";
            }
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
