// service/MarketRiskService.java
package ma.attijariwafa.desk_international.service;

import lombok.RequiredArgsConstructor;
import ma.attijariwafa.desk_international.dto.MarketRiskDto;
import ma.attijariwafa.desk_international.entity.PnlDaily;
import ma.attijariwafa.desk_international.repository.PnlDailyRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * Calcule les indicateurs de risque de marché du portefeuille (VaR, Expected
 * Shortfall, volatilité, max drawdown) à partir de l'historique de P&L
 * journalier en MAD. Source unique de vérité backend.
 *
 * <p><b>Méthodologie</b> (identique à l'ancienne référence front, conservée
 * pour parité numérique stricte) :</p>
 * <ul>
 *   <li>VaR paramétrique gaussienne 1 jour : z·σ, centrée 0 (convention
 *       marché), avec z(99 %) = 2.3263 et z(95 %) = 1.6449 ;</li>
 *   <li>VaR historique 1 jour : percentile empirique de la distribution des
 *       P&L journaliers, par interpolation linéaire ;</li>
 *   <li>Expected Shortfall / CVaR 97,5 % : perte moyenne de la queue 2,5 % ;</li>
 *   <li>volatilité : écart-type population (÷N), annualisé par √252 ;</li>
 *   <li>max drawdown : sur le P&L économique cumulé, ordonné par date.</li>
 * </ul>
 *
 * <p>Le calcul est mené en {@code double} (et non BigDecimal) pour garantir
 * une parité numérique exacte avec la référence front. Échantillon minimal :
 * 5 observations, sous lequel les statistiques ne sont pas calculées.</p>
 */
@Service
@RequiredArgsConstructor
public class MarketRiskService {

    private final PnlDailyRepository pnlDailyRepo;

    private static final int    MIN_OBS = 5;
    private static final double Z99     = 2.3263;
    private static final double Z95     = 1.6449;
    private static final double TRADING_DAYS_PER_YEAR = 252.0;
    private static final double ES_TAIL = 0.025;   // queue 2,5 %

    /**
     * Indicateurs de risque sur une fenêtre [from, to]. Si la fenêtre est nulle
     * ou ne recoupe aucun snapshot seedé, on retombe sur tout l'historique
     * (même repli résilient que {@code /api/pnl-daily/history}).
     */
    public MarketRiskDto computeMarketRisk(LocalDate from, LocalDate to) {
        List<PnlDaily> rows;
        if (from != null && to != null) {
            rows = pnlDailyRepo.findBySnapshotDateBetweenOrderBySnapshotDateAsc(from, to);
            if (rows.isEmpty()) {
                rows = pnlDailyRepo.findAllByOrderBySnapshotDateAsc();
            }
        } else {
            rows = pnlDailyRepo.findAllByOrderBySnapshotDateAsc();
        }

        // Série des P&L journaliers (MAD). Parité stricte avec la référence
        // front : un P&L absent (null) compte comme 0 (pas un trou), il N'est
        // PAS écarté — toutes les lignes de la fenêtre contribuent à nObs.
        List<Double> daily = new ArrayList<>(rows.size());
        for (PnlDaily r : rows) {
            Double v = toDouble(r.getPnlJourMad());
            daily.add(v != null ? v : 0.0);
        }

        LocalDate winFrom = rows.isEmpty() ? from : rows.get(0).getSnapshotDate();
        LocalDate winTo   = rows.isEmpty() ? to   : rows.get(rows.size() - 1).getSnapshotDate();
        int nObs = daily.size();

        if (nObs < MIN_OBS) {
            return MarketRiskDto.builder()
                    .from(winFrom).to(winTo)
                    .nObs(nObs).sufficient(false)
                    .build();
        }

        // ── Moyenne et écart-type population (÷N) ──
        double sum = 0.0;
        for (double v : daily) sum += v;
        double mean = sum / nObs;

        double sse = 0.0;
        for (double v : daily) sse += (v - mean) * (v - mean);
        double std = Math.sqrt(sse / nObs);
        double annVol = std * Math.sqrt(TRADING_DAYS_PER_YEAR);

        // ── VaR paramétrique gaussienne (magnitude de perte, centrée 0) ──
        double varParam99 = Z99 * std;
        double varParam95 = Z95 * std;

        // ── VaR historique : percentile empirique (interpolation linéaire) ──
        double[] sorted = daily.stream().mapToDouble(Double::doubleValue).sorted().toArray();
        double varHist99 = Math.max(0.0, -percentile(sorted, 0.01));
        double varHist95 = Math.max(0.0, -percentile(sorted, 0.05));

        // ── Expected Shortfall / CVaR 97,5 % = perte moyenne de la queue 2,5 % ──
        int tailN = Math.max(1, (int) Math.round(nObs * ES_TAIL));
        double tailSum = 0.0;
        for (int i = 0; i < tailN; i++) tailSum += sorted[i];
        double es975 = Math.max(0.0, -(tailSum / tailN));

        // ── Max drawdown sur le P&L économique cumulé (ordonné par date) ──
        double maxDrawdown = Math.abs(computeMaxDrawdown(rows));

        return MarketRiskDto.builder()
                .from(winFrom).to(winTo)
                .nObs(nObs).sufficient(true)
                .mean(mean).std(std).annVol(annVol)
                .varParam99(varParam99).varParam95(varParam95)
                .varHist99(varHist99).varHist95(varHist95)
                .es975(es975)
                .maxDrawdown(maxDrawdown)
                .build();
    }

    /** Percentile empirique par interpolation linéaire sur une série triée croissante. */
    private static double percentile(double[] sorted, double p) {
        double idx = (sorted.length - 1) * p;
        int lo = (int) Math.floor(idx);
        int hi = (int) Math.ceil(idx);
        return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
    }

    /** Max drawdown (≤ 0) sur le P&L éco cumulé, points ordonnés par date. */
    private static double computeMaxDrawdown(List<PnlDaily> rows) {
        List<PnlDaily> ordered = new ArrayList<>(rows);
        ordered.removeIf(d -> d.getSnapshotDate() == null);
        ordered.sort(Comparator.comparing(PnlDaily::getSnapshotDate));

        double peak = Double.NEGATIVE_INFINITY;
        double maxDD = 0.0;
        for (PnlDaily d : ordered) {
            Double vv = toDouble(d.getPnlEcoMad());
            double v = vv != null ? vv : 0.0;
            if (v > peak) peak = v;
            double dd = v - peak;
            if (dd < maxDD) maxDD = dd;
        }
        return maxDD;
    }

    private static Double toDouble(BigDecimal v) {
        return v != null ? v.doubleValue() : null;
    }
}
