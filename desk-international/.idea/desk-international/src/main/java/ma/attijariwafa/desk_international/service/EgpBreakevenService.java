// service/EgpBreakevenService.java
package ma.attijariwafa.desk_international.service;

import lombok.RequiredArgsConstructor;
import ma.attijariwafa.desk_international.dto.EgpBreakevenDto;
import ma.attijariwafa.desk_international.entity.ExternalPnlSnapshot;
import ma.attijariwafa.desk_international.entity.MarketRates;
import ma.attijariwafa.desk_international.repository.ExternalPnlSnapshotRepository;
import ma.attijariwafa.desk_international.repository.MarketRatesRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

/**
 * Calcule les seuils de rentabilité FX (breakeven) des EGP Bills externes.
 * Source unique de vérité backend (remplace le calcul d'EGPView).
 *
 * <p>Pour chaque deal de la catégorie {@code EGP_BILL} :</p>
 * <pre>
 *   BKV sans fin. = FX_entrée × (1 + yield × jours/360)
 *   BKV avec fin. = FX_entrée × (1 + (yield − SOFR) × jours/360)
 *   coussin %     = (BKV − spot) / spot × 100
 *   P&L FX approx = (spot − FX_entrée) × nominalUSD × USD/MAD / spot
 * </pre>
 *
 * <p>FX_entrée = WAP FX d'entrée (repli spot si absent). Le rendement stocké
 * peut être en décimal (&lt; 1) ou en pourcent (≥ 1) : normalisé en décimal,
 * comme l'ancien front. Jours restants en jours calendaires (déterministe).</p>
 */
@Service
@RequiredArgsConstructor
public class EgpBreakevenService {

    private final ExternalPnlSnapshotRepository extRepo;
    private final MarketRatesRepository         mrRepo;

    // Replis identiques au front (EGPView).
    private static final double SPOT_FALLBACK   = 50.85;
    private static final double SOFR_PCT_FALLBACK = 5.3;   // en %
    private static final double USDMAD_FALLBACK = 9.251;
    private static final int    DAYS_FALLBACK   = 90;

    public EgpBreakevenDto computeBreakeven(LocalDate date) {
        LocalDate d = date != null ? date : LocalDate.now();

        List<ExternalPnlSnapshot> egp =
                extRepo.findByAssetCategoryAndSnapshotDate("EGP_BILL", d);
        if (egp.isEmpty()) egp = extRepo.findLatestByCategory("EGP_BILL");

        MarketRates rates = mrRepo.findByRateDate(d)
                .orElseGet(() -> mrRepo.findTopByOrderByRateDateDesc().orElse(null));
        double spot = (rates != null && rates.getUsdEgp() != null)
                ? rates.getUsdEgp().doubleValue() : SPOT_FALLBACK;
        double sofrPct = (rates != null && rates.getSofr() != null)
                ? rates.getSofr().doubleValue() : SOFR_PCT_FALLBACK;
        double sofr = sofrPct / 100.0;
        double usdMad = (rates != null && rates.getUsdMad() != null)
                ? rates.getUsdMad().doubleValue() : USDMAD_FALLBACK;

        LocalDate today = LocalDate.now();
        List<EgpBreakevenDto.Deal> deals = new ArrayList<>(egp.size());
        for (ExternalPnlSnapshot r : egp) {
            double coupon = dbl(r.getCouponRate());
            double yieldRate = coupon < 1 ? coupon : coupon / 100.0;

            int daysRem = r.getMaturityDate() != null
                    ? (int) Math.max(0, ChronoUnit.DAYS.between(today, r.getMaturityDate()))
                    : DAYS_FALLBACK;

            double wap = dbl(r.getWapFxEntry());
            double fxEntry = wap != 0.0 ? wap : spot;

            double bkvSansFin = fxEntry * (1 + (yieldRate * daysRem) / 360.0);
            double netCarry   = yieldRate - sofr;
            double bkvAvecFin = fxEntry * (1 + (netCarry * daysRem) / 360.0);
            double cushionSans = ((bkvSansFin - spot) / spot) * 100.0;
            double cushionAvec = ((bkvAvecFin - spot) / spot) * 100.0;
            double nominalUsd  = dbl(r.getNominalUsd());
            double plFxApprox  = ((spot - fxEntry) * nominalUsd * usdMad) / spot;

            deals.add(EgpBreakevenDto.Deal.builder()
                    .isin(r.getIsin())
                    .description(r.getDescription())
                    .nominalUsd(nominalUsd)
                    .maturityDate(r.getMaturityDate())
                    .daysRem(daysRem)
                    .yieldRate(yieldRate)
                    .fxEntry(fxEntry)
                    .bkvSansFin(bkvSansFin)
                    .bkvAvecFin(bkvAvecFin)
                    .cushionSans(cushionSans)
                    .cushionAvec(cushionAvec)
                    .plFxApprox(plFxApprox)
                    .build());
        }

        return EgpBreakevenDto.builder()
                .date(d)
                .spot(spot)
                .sofr(sofr)
                .usdMad(usdMad)
                .deals(deals)
                .build();
    }

    private static double dbl(BigDecimal v) {
        return v != null ? v.doubleValue() : 0.0;
    }
}
