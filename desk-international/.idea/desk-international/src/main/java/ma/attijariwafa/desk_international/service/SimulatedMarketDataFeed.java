package ma.attijariwafa.desk_international.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import ma.attijariwafa.desk_international.dto.MarketTick;
import ma.attijariwafa.desk_international.entity.MarketData;
import ma.attijariwafa.desk_international.entity.RiskMetrics;
import ma.attijariwafa.desk_international.entity.Trade;
import ma.attijariwafa.desk_international.repository.MarketDataRepository;
import ma.attijariwafa.desk_international.repository.RiskMetricsRepository;
import ma.attijariwafa.desk_international.repository.TradeRepository;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Connecteur de données de marché <b>simulé</b> — actif par défaut
 * ({@code marketdata.provider=simulated}).
 *
 * <p>Génère un flux de prix Bid/Ask/Last continu et réaliste, diffusé via
 * {@link MarketDataBroadcaster} à cadence fixe ({@code marketdata.tick-interval-ms}).</p>
 *
 * <h3>Modèle stochastique</h3>
 * <p>On modélise le <b>rendement</b> (yield), pas le prix directement, puis on
 * reconstruit le prix par la duration (relation prix/taux au premier ordre :
 * {@code ΔP/P ≈ −ModDur · Δy}). Cela donne des amplitudes cohérentes avec la
 * sensibilité de chaque ligne (une 2050 bouge bien plus qu'une 2027).</p>
 *
 * <p>Deux niveaux d'aléa, qui produisent la <b>corrélation Future ↔ Bond</b> :</p>
 * <ol>
 *   <li><b>Facteur systémique</b> {@code common} : un choc de taux parallèle commun à
 *       tout le marché, processus d'Ornstein-Uhlenbeck (retour à la moyenne 0). Toutes
 *       les lignes y réagissent via leur {@code beta} → mouvements corrélés.</li>
 *   <li><b>Bruit idiosyncratique</b> par instrument : spécifique à chaque émetteur.</li>
 * </ol>
 *
 * <p>Le future suit son CTD : sa déviation de rendement = celle du bond couvert
 * (champ {@code hedBondIsin}) + un léger bruit de base. Ainsi, quand les taux montent,
 * bond et future baissent ensemble, et le book couvert (long bond / short future) reste
 * neutralisé — exactement ce qu'un trader attend de voir à l'écran.</p>
 *
 * <p>Le retour à la moyenne garantit que les prix oscillent autour de la référence
 * Bloomberg seedée (clôture veille) <b>sans jamais dériver</b> : la démo reste stable
 * sur la durée tout en étant vivante.</p>
 */
@Service
@ConditionalOnProperty(name = "marketdata.provider", havingValue = "simulated", matchIfMissing = true)
@RequiredArgsConstructor
@Slf4j
public class SimulatedMarketDataFeed implements MarketDataFeed {

    private final MarketDataRepository marketDataRepo;
    private final RiskMetricsRepository riskMetricsRepo;
    private final TradeRepository tradeRepo;
    private final MarketDataBroadcaster broadcaster;

    /** Graine fixe → trajectoire reproductible d'une démo à l'autre. */
    private final Random rng = new Random(42L);

    /** État interne d'une ligne cotée (accédé uniquement par le thread du scheduler). */
    private final Map<String, Quote> quotes = new LinkedHashMap<>();
    private final AtomicBoolean initialised = new AtomicBoolean(false);

    /** Facteur de marché systémique (choc de taux parallèle, en décimal). */
    private double common = 0d;

    // ── Paramètres du modèle (calibrés pour un rendu « salle de marché ») ───────
    private static final double KAPPA_SYS   = 0.04;     // vitesse de retour moyenne du facteur commun
    private static final double SIGMA_SYS   = 0.000045; // vol du facteur commun par tick (~0.45 bp)
    private static final double KAPPA_INST  = 0.05;     // vitesse de retour de chaque ligne vers sa cible
    private static final double SIGMA_IDIO  = 0.000030; // vol idiosyncratique par tick (~0.30 bp)
    private static final double SIGMA_BASIS = 0.000012; // bruit de base du future vs. CTD

    // ─────────────────────────────────────────────────────────────────────────
    // Initialisation — après le seeding Bloomberg (ApplicationReadyEvent)
    // ─────────────────────────────────────────────────────────────────────────
    @EventListener(ApplicationReadyEvent.class)
    public void initialise() {
        LocalDate today = LocalDate.now();
        List<MarketData> snapshot = marketDataRepo.findByDataDateWithInstrument(today);
        if (snapshot.isEmpty()) {
            log.warn("[MarketData/SIM] Aucune donnée de marché pour {} — flux temps réel inactif.", today);
            return;
        }

        // Durations (sensibilité taux) par ISIN, depuis les dernières risk metrics.
        Map<String, RiskMetrics> riskByIsin = new LinkedHashMap<>();
        for (RiskMetrics r : riskMetricsRepo.findLatestForAllIsins()) {
            riskByIsin.put(r.getInstrument().getIsin(), r);
        }

        // 1) BONDS — référence = px_mid seedé (clôture veille), en points (×100).
        for (MarketData md : snapshot) {
            String isin = md.getInstrument().getIsin();
            double refMid = scaled(md.getPxMid(), 1d) * 100d;
            if (refMid <= 0) continue;
            RiskMetrics rm = riskByIsin.get(isin);
            double modDur = rm != null ? scaled(rm.getModifiedDuration(), 1d) : 3d;

            Quote q = new Quote();
            q.symbol = isin;
            q.label = shortLabel(md.getInstrument().getDescription());
            q.type = "BOND";
            q.currency = md.getInstrument().getCurrency();
            q.refMid = refMid;
            q.modDur = modDur;
            q.halfSpread = bondHalfSpread(md, modDur);
            q.beta = 0.8 + rng.nextDouble() * 0.5;          // 0.8–1.3 : sensibilité au marché
            q.idioScale = 0.6 + rng.nextDouble() * 0.8;     // dispersion du bruit propre
            quotes.put(isin, q);
        }

        // 2) FUTURES — référence = dernier prix seedé ; suit le rendement du bond couvert.
        for (Trade t : tradeRepo.findAll()) {
            if (t.getSubAsset() == null || !t.getSubAsset().toLowerCase().contains("future")) continue;
            if (Boolean.TRUE.equals(t.getIsClosed())) continue;
            String ticker = t.getAssetIdentifier();
            if (ticker == null || quotes.containsKey(ticker)) continue;
            double refLast = scaled(t.getLastPrice(), 0d) * 100d;
            if (refLast <= 0) refLast = scaled(t.getCleanPrice(), 0d) * 100d;
            if (refLast <= 0) continue;

            String hedge = t.getHedBondIsin();
            RiskMetrics rmHedge = hedge != null ? riskByIsin.get(hedge) : null;
            double durCtd = rmHedge != null && rmHedge.getDurationCtd() != null
                    ? scaled(rmHedge.getDurationCtd(), 6d) : 6d;

            Quote q = new Quote();
            q.symbol = ticker;
            q.label = ticker + (hedge != null ? " · hedge " + shortLabel(hedge) : "");
            q.type = "FUTURE";
            q.currency = "USD";
            q.refMid = refLast;
            q.modDur = durCtd;
            q.halfSpread = 0.0156;   // ~1/64 de point, fourchette serrée des futures liquides
            q.hedgeOf = hedge;
            quotes.put(ticker, q);
        }

        initialised.set(true);
        log.info("[MarketData/SIM] Flux temps réel initialisé : {} instruments cotés (bonds + futures).",
                quotes.size());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Boucle de marché — un snapshot diffusé à chaque tick
    // ─────────────────────────────────────────────────────────────────────────
    @Scheduled(fixedRateString = "${marketdata.tick-interval-ms:800}")
    public void tick() {
        if (!initialised.get()) return;

        // 1) Avance du facteur systémique commun (OU autour de 0).
        common += KAPPA_SYS * (0d - common) + SIGMA_SYS * rng.nextGaussian();

        long ts = System.currentTimeMillis();
        List<MarketTick> batch = new ArrayList<>(quotes.size());

        // 2) Bonds d'abord (les futures lisent leur déviation).
        for (Quote q : quotes.values()) {
            if (!"BOND".equals(q.type)) continue;
            double target = q.beta * common;                                   // cible = part du choc systémique
            q.yieldDev += KAPPA_INST * (target - q.yieldDev)
                        + SIGMA_IDIO * q.idioScale * rng.nextGaussian();        // + bruit propre
            batch.add(buildTick(q, ts));
        }

        // 3) Futures : déviation = celle du CTD + bruit de base.
        for (Quote q : quotes.values()) {
            if (!"FUTURE".equals(q.type)) continue;
            Quote hedge = q.hedgeOf != null ? quotes.get(q.hedgeOf) : null;
            double baseDev = hedge != null ? hedge.yieldDev : q.beta * common;
            q.yieldDev = baseDev + SIGMA_BASIS * rng.nextGaussian();
            batch.add(buildTick(q, ts));
        }

        broadcaster.broadcast(batch);
    }

    /** Reconstruit Bid/Ask/Last à partir de la déviation de rendement courante. */
    private MarketTick buildTick(Quote q, long ts) {
        // Prix = réf × (1 − ModDur · Δy). Δy>0 (taux montent) ⇒ prix baisse.
        double mid = q.refMid * (1d - q.modDur * q.yieldDev);
        double jitter = 1d + (rng.nextDouble() - 0.5) * 0.20;   // fourchette qui respire ±10 %
        double half = q.halfSpread * jitter;
        double bid = mid - half;
        double ask = mid + half;

        // Last = impression de transaction : tape le bid ou l'ask de temps en temps.
        double last = mid;
        double draw = rng.nextDouble();
        if (draw < 0.18) last = bid;
        else if (draw > 0.82) last = ask;

        double netChange = mid - q.refMid;
        double pctChange = q.refMid != 0 ? netChange / q.refMid * 100d : 0d;

        int decimals = "FUTURE".equals(q.type) ? 4 : 3;
        return new MarketTick(
                q.symbol, q.label, q.type, q.currency,
                round(bid, decimals), round(ask, decimals), round(mid, decimals), round(last, decimals),
                round(netChange, decimals), round(pctChange, 3),
                sizeLevel(q), sizeLevel(q), ts
        );
    }

    @Override public String providerName() { return "simulated"; }
    @Override public boolean isLive() { return initialised.get(); }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────
    private int sizeLevel(Quote q) {
        // Profondeur indicative : 5–25 (M de nominal pour les bonds, lots pour les futures).
        return 5 + rng.nextInt(21);
    }

    /** Demi-fourchette d'un bond, en points : plus large si illiquide / longue duration. */
    private static double bondHalfSpread(MarketData md, double modDur) {
        if (md.getPxBidAwb() != null && md.getPxAskAwb() != null) {
            double seeded = (scaled(md.getPxAskAwb(), 0d) - scaled(md.getPxBidAwb(), 0d)) * 100d / 2d;
            if (seeded > 0) return Math.abs(seeded);
        }
        if (modDur >= 10) return 0.30;   // 30 cts pour les très longues
        if (modDur >= 5)  return 0.12;
        return 0.05;                     // 5 cts pour les courtes / liquides
    }

    private static String shortLabel(String desc) {
        if (desc == null) return "";
        String[] parts = desc.split(" ");
        StringBuilder b = new StringBuilder();
        for (int i = 0; i < Math.min(3, parts.length); i++) {
            if (i > 0) b.append(' ');
            b.append(parts[i]);
        }
        return b.toString();
    }

    private static double scaled(BigDecimal v, double fallback) {
        return v != null ? v.doubleValue() : fallback;
    }

    private static double round(double v, int decimals) {
        double f = Math.pow(10, decimals);
        return Math.round(v * f) / f;
    }

    /** État mutable d'une ligne cotée. */
    private static final class Quote {
        String symbol, label, type, currency, hedgeOf;
        double refMid;       // prix de référence (clôture veille), en points
        double modDur;       // sensibilité taux (années)
        double halfSpread;   // demi-fourchette, en points
        double beta;         // sensibilité au facteur systémique (bonds)
        double idioScale;    // échelle du bruit propre (bonds)
        double yieldDev;     // déviation de rendement courante vs. réf (décimal), processus OU
    }
}
