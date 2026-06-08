// service/PnLService.java
package ma.attijariwafa.desk_international.service;

import lombok.RequiredArgsConstructor;
import ma.attijariwafa.desk_international.dto.PnLDto;
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
public class PnlService {

    private final VPositionRepository       posRepo;
    private final MarketDataRepository      mdRepo;
    private final MarketRatesRepository     mrRepo;
    private final CouponReceivedRepository  cpnRepo;

    private static final BigDecimal BD100 = BigDecimal.valueOf(100);
    private static final BigDecimal BD360 = BigDecimal.valueOf(360);
    private static final BigDecimal BD365 = BigDecimal.valueOf(365);

    public List<PnLDto> computeAllPnL(LocalDate date) {
        MarketRates rates = resolveRates(date);
        return posRepo.findAllActive().stream()
                .map(pos -> compute(pos, rates, date))
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
    }

    public PnLDto computePnLForIsin(String isin, LocalDate date) {
        VPosition pos = posRepo.findByIsin(isin)
                .orElseThrow(() -> new IllegalArgumentException("ISIN inconnu : " + isin));
        MarketRates rates = resolveRates(date);
        PnLDto dto = compute(pos, rates, date);
        if (dto == null) throw new RuntimeException("Pas de données marché pour : " + isin);
        return dto;
    }

    // ── Resilient rate resolution: exact date → latest available ─────
    private MarketRates resolveRates(LocalDate date) {
        return mrRepo.findByRateDate(date)
                .orElseGet(() -> mrRepo.findTopByOrderByRateDateDesc()
                        .orElseThrow(() -> new RuntimeException(
                                "Aucun taux disponible en base. Vérifier market_rates.")));
    }

    // ── Resilient market data resolution ─────────────────────────────
    private MarketData resolveMarketData(String isin, LocalDate date) {
        return mdRepo.findByIsinAndDate(isin, date)
                .orElseGet(() -> mdRepo.findTopByInstrumentIsinOrderByDataDateDesc(isin)
                        .orElse(null));
    }

    private PnLDto compute(VPosition pos, MarketRates rates, LocalDate date) {
        MarketData md = resolveMarketData(pos.getIsin(), date);
        if (md == null) return null;

        String ccy = pos.getCurrency();
        BigDecimal fx;
        BigDecimal rate;

        if ("USD".equals(ccy)) {
            fx   = rates.getUsdMad();
            // sofrRate stocké en % (ex: 5.33) → diviser par 100 pour formule de financement
            rate = rates.getSofr().divide(BD100, 8, RoundingMode.HALF_UP);
        } else if ("EGP".equals(ccy)) {
            // EGP/MAD = (USD/MAD) / (USD/EGP)
            BigDecimal usdEgp = rates.getUsdEgp();
            if (usdEgp == null || usdEgp.compareTo(ZERO) == 0) return null;
            fx   = rates.getUsdMad().divide(usdEgp, 8, RoundingMode.HALF_UP);
            rate = ZERO; // EGP T-bills: pas de coût de repo
        } else {
            // EUR et autres devises
            fx   = rates.getEurMad();
            // estrRate stocké en % (ex: 3.90) → diviser par 100 pour formule de financement
            rate = rates.getEstr().divide(BD100, 8, RoundingMode.HALF_UP);
        }

        // ── FORMULE 1 : Dirty marché ─────────────────────────────────
        BigDecimal acc      = md.getAccrued() != null ? md.getAccrued() : ZERO;
        BigDecimal dirtyMkt = md.getPxMid().add(acc);

        // ── FORMULE 2 : Performance WAP ──────────────────────────────
        BigDecimal perfWap = ZERO;
        if (pos.getNetNominal().compareTo(ZERO) > 0 && pos.getLastWapDirty() != null) {
            perfWap = dirtyMkt.subtract(pos.getLastWapDirty());
        }

        // ── FORMULE 3 : P&L Latent devise ────────────────────────────
        BigDecimal pnlLatent = pos.getNetNominal()
                .multiply(perfWap).setScale(2, RoundingMode.HALF_UP);

        // ── FORMULE 4 : Coupons reçus ─────────────────────────────────
        BigDecimal coupons = cpnRepo.sumByIsin(pos.getIsin()).orElse(ZERO);

        // ── FORMULE 5 : P&L Total devise ─────────────────────────────
        BigDecimal real     = pos.getTotalRealizedPnl() != null ? pos.getTotalRealizedPnl() : ZERO;
        BigDecimal pnlTotal = pnlLatent.add(real).add(coupons);

        // ── FORMULE 6 : P&L Comptable MAD ────────────────────────────
        BigDecimal pnlMad = pnlTotal.multiply(fx).setScale(2, RoundingMode.HALF_UP);

        // ── FORMULE 7 : Financement MAD ──────────────────────────────
        int days = date.getDayOfYear() - 1;
        BigDecimal funding = pos.getNetNominal()
                .multiply(rate)
                .multiply(BigDecimal.valueOf(days))
                .divide(BD360, 6, RoundingMode.HALF_UP)
                .multiply(fx)
                .setScale(2, RoundingMode.HALF_UP);

        BigDecimal pnlEco = pnlMad.subtract(funding);

        // ── Net Daily : coupon journalier vs coût journalier ──────────
        BigDecimal cpnRate = pos.getCouponRate() != null ? pos.getCouponRate() : ZERO;
        BigDecimal cpnTheta = cpnRate
                .divide(BD100, 6, RoundingMode.HALF_UP)
                .multiply(pos.getNetNominal())
                .divide(BD365, 6, RoundingMode.HALF_UP)
                .multiply(fx).setScale(2, RoundingMode.HALF_UP);

        BigDecimal dailyFund = pos.getNetNominal()
                .multiply(rate)
                .divide(BD360, 6, RoundingMode.HALF_UP)
                .multiply(fx).setScale(2, RoundingMode.HALF_UP);

        BigDecimal netDaily = cpnTheta.subtract(dailyFund);

        return PnLDto.builder()
                .isin(pos.getIsin()).description(pos.getDescription())
                .currency(pos.getCurrency()).netNominal(pos.getNetNominal())
                .wapDirty(pos.getLastWapDirty())
                .dirtyMarket(dirtyMkt).perfWap(perfWap)
                .pnlLatentCcy(pnlLatent).pnlRealizedCcy(real)
                .couponsCcy(coupons).totalPnlCcy(pnlTotal)
                .pnlAccountingMad(pnlMad).fundingCostMad(funding)
                .pnlEconomicMad(pnlEco)
                .cpnThetaMad(cpnTheta).dailyFundingMad(dailyFund)
                .netDailyMad(netDaily)
                .netDailyAlert(netDaily.compareTo(ZERO) < 0)
                .build();
    }
}
