// service/RiskService.java
package ma.attijariwafa.desk_international.service;

import lombok.RequiredArgsConstructor;
import ma.attijariwafa.desk_international.dto.RiskDto;
import ma.attijariwafa.desk_international.entity.*;
import ma.attijariwafa.desk_international.repository.*;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;
import static java.math.BigDecimal.ZERO;

@Service
@RequiredArgsConstructor
public class RiskService {

    private final RiskMetricsRepository riskRepo;
    private final VPositionRepository   posRepo;
    private final MarketRatesRepository mrRepo;

    public List<RiskDto> computeAllRisks(LocalDate date) {
        return posRepo.findAllActive().stream()
                .map(pos -> compute(pos, date))
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
    }

    public RiskDto computeForIsin(String isin, LocalDate date) {
        VPosition pos = posRepo.findByIsin(isin)
                .orElseThrow(() -> new IllegalArgumentException("ISIN : " + isin));
        RiskDto r = compute(pos, date);
        if (r == null) throw new RuntimeException("Pas de risk_metrics pour " + isin);
        return r;
    }

    public BigDecimal computePortfolioDuration(LocalDate date) {
        MarketRates rates = mrRepo.findByRateDate(date)
                .orElseGet(() -> mrRepo.findTopByOrderByRateDateDesc().orElse(null));
        if (rates == null) return ZERO;

        BigDecimal sumWeighted = ZERO;
        BigDecimal sumExposure = ZERO;

        for (VPosition pos : posRepo.findAllActive()) {
            RiskMetrics rm = resolveRiskMetrics(pos.getIsin(), date);
            if (rm == null || rm.getModifiedDuration() == null) continue;

            BigDecimal fx  = "USD".equals(pos.getCurrency())
                    ? rates.getUsdMad() : rates.getEurMad();
            BigDecimal exp = pos.getNetNominal().multiply(fx);

            sumWeighted = sumWeighted.add(rm.getModifiedDuration().multiply(exp));
            sumExposure = sumExposure.add(exp);
        }

        if (sumExposure.compareTo(ZERO) == 0) return ZERO;
        return sumWeighted.divide(sumExposure, 4, RoundingMode.HALF_UP);
    }

    // ── Resilient metrics resolution: exact date → latest available ──
    private RiskMetrics resolveRiskMetrics(String isin, LocalDate date) {
        return riskRepo.findByIsinAndDate(isin, date)
                .orElseGet(() -> riskRepo
                        .findTopByInstrumentIsinOrderByMetricsDateDesc(isin)
                        .orElse(null));
    }

    private RiskDto compute(VPosition pos, LocalDate date) {
        RiskMetrics rm = resolveRiskMetrics(pos.getIsin(), date);
        if (rm == null) return null;

        // DV01 bond = duration × nominal × 0.0001
        BigDecimal dv01Bond = ZERO;
        if (rm.getModifiedDuration() != null) {
            dv01Bond = rm.getModifiedDuration()
                    .multiply(pos.getNetNominal())
                    .multiply(new BigDecimal("0.0001"))
                    .setScale(2, RoundingMode.HALF_UP);
        }

        // DV01 d'un contrat future CTD
        BigDecimal dv01Fut = ZERO;
        if (rm.getDurationCtd() != null && rm.getConvFactor() != null
                && rm.getContractSize() != null) {
            dv01Fut = rm.getDurationCtd()
                    .multiply(rm.getConvFactor())
                    .multiply(BigDecimal.valueOf(rm.getContractSize()))
                    .multiply(new BigDecimal("0.0001"))
                    .setScale(4, RoundingMode.HALF_UP);
        }

        // Hedge ratio = DV01_bond / DV01_per_contract → number of contracts to hedge
        BigDecimal ratio = ZERO;
        int nbCtr = 0;
        if (dv01Fut.compareTo(ZERO) != 0) {
            ratio = dv01Bond.divide(dv01Fut, 4, RoundingMode.HALF_UP);
            nbCtr = ratio.setScale(0, RoundingMode.HALF_UP).intValue();
        }

        return RiskDto.builder()
                .isin(pos.getIsin()).description(pos.getDescription())
                .netNominal(pos.getNetNominal())
                .modifiedDuration(rm.getModifiedDuration())
                .dv01Bond(dv01Bond)
                .hedgeFuture(rm.getHedgeFuture())
                .dv01FutureCtd(dv01Fut)
                .hedgeRatio(ratio)
                .nbContractsToHedge(nbCtr)
                .currentFuturesPosition(pos.getFuturesNetPosition())
                .ytmMid(rm.getYtmMid())
                .build();
    }
}
