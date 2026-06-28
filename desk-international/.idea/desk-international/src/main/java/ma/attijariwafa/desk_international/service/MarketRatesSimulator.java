package ma.attijariwafa.desk_international.service;

import lombok.RequiredArgsConstructor;
import ma.attijariwafa.desk_international.entity.MarketRates;
import ma.attijariwafa.desk_international.repository.MarketRatesRepository;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.concurrent.ThreadLocalRandom;

/**
 * Anime en continu les FX spot (USD/MAD, EUR/USD, USD/EGP) par une marche
 * aléatoire à retour à la moyenne (Ornstein–Uhlenbeck) autour des valeurs
 * seedées, afin que le bandeau de taux du front « vive » en temps réel.
 * EUR/MAD est recalculé comme cross (USD/MAD × EUR/USD). SOFR/ESTR restent
 * fixes (fixings quotidiens).
 *
 * <p><b>Efficacité :</b> l'état « live » est tenu EN MÉMOIRE. Chaque tick ne
 * fait qu'un calcul + un push WebSocket — <b>aucune requête SQL</b>. La table
 * {@code market_rates} n'est ré-écrite que périodiquement (toutes les
 * {@link #PERSIST_EVERY} ticks) pour que {@code /api/dashboard/rates} reste
 * cohérent au chargement, ce qui évite le flot de requêtes Hibernate.</p>
 *
 * <p>Actif uniquement en mode démo ({@code marketdata.provider=simulated}).</p>
 */
@Service
@ConditionalOnProperty(name = "marketdata.provider", havingValue = "simulated", matchIfMissing = true)
@RequiredArgsConstructor
public class MarketRatesSimulator {

    private final MarketRatesRepository marketRatesRepo;
    private final SimpMessagingTemplate messagingTemplate;

    // État live tenu en mémoire (chargé une seule fois depuis la BDD).
    private MarketRates live;
    private BigDecimal refUsdMad;
    private BigDecimal refEurUsd;
    private BigDecimal refUsdEgp;
    private int ticksSincePersist = 0;

    // Nombre de ticks entre deux écritures en base (1 tick ≈ 1 s → ~30 s).
    private static final int PERSIST_EVERY = 30;

    // Vitesse de rappel vers l'ancre (kappa) et volatilités par tick (sigma).
    private static final double KAPPA       = 0.02;
    private static final double SIG_USD_MAD = 0.004;
    private static final double SIG_EUR_USD = 0.0004;
    private static final double SIG_USD_EGP = 0.02;
    private static final BigDecimal EGP_FALLBACK = new BigDecimal("48.85");

    // synchronized : le scheduler @Scheduled tourne ici sur le pool multi-thread
    // du broker WebSocket → on garantit qu'UN SEUL thread exécute le tick à la
    // fois (sinon mutation/persistance concurrentes du `live` partagé).
    @Scheduled(fixedRateString = "${marketdata.fx-tick-interval-ms:1000}")
    public synchronized void tickFx() {
        // Chargement initial unique + capture des ancres (= valeurs seedées).
        if (live == null) {
            live = marketRatesRepo.findTopByOrderByRateDateDesc().orElse(null);
            if (live == null) return;
            refUsdMad = live.getUsdMad();
            refEurUsd = live.getEurUsd();
            refUsdEgp = live.getUsdEgp() != null ? live.getUsdEgp() : EGP_FALLBACK;
            // Sécurité : si la ligne chargée précède l'ajout de la colonne
            // sofr_10y (backfill non encore commité), on évite de re-persister
            // un NULL qui ferait réapparaître la valeur en dur côté écran.
            if (live.getSofr10Year() == null) {
                live.setSofr10Year(new BigDecimal("3.9000"));
            }
        }

        // OU en mémoire — aucune requête SQL.
        live.setUsdMad(ou(live.getUsdMad(), refUsdMad, SIG_USD_MAD, 6));
        live.setEurUsd(ou(live.getEurUsd(), refEurUsd, SIG_EUR_USD, 6));
        live.setUsdEgp(ou(nz(live.getUsdEgp(), refUsdEgp), refUsdEgp, SIG_USD_EGP, 4));
        live.setEurMad(live.getUsdMad().multiply(live.getEurUsd())
                .setScale(6, RoundingMode.HALF_UP));
        // SOFR / ESTR : inchangés (fixings quotidiens).

        // Push temps réel à chaque tick (léger, sans BDD).
        messagingTemplate.convertAndSend("/topic/rates", live);

        // Persistance espacée (best-effort) → /api/dashboard/rates reste cohérent
        // au chargement. On RESET le compteur d'abord (un échec ne doit JAMAIS
        // retenter à chaque tick et inonder les logs). On NE merge PAS l'entité
        // détachée tenue en mémoire (elle devient périmée si un backfill au
        // démarrage a modifié la ligne → ObjectOptimisticLockingFailure) : on
        // RE-CHARGE la ligne FRAÎCHE et on n'écrase QUE les FX. Les autres champs
        // (sofr_10y backfillé, SOFR/ESTR…) sont préservés.
        if (++ticksSincePersist >= PERSIST_EVERY) {
            ticksSincePersist = 0;
            try {
                if (live.getId() != null) {
                    // UPDATE DIRECT par id (pas de merge d'entité) → aucun conflit
                    // de version / d'entité détachée périmée, même si un backfill
                    // au démarrage a modifié la ligne. N'écrase QUE les FX.
                    marketRatesRepo.updateFx(live.getId(), live.getUsdMad(),
                            live.getEurUsd(), live.getUsdEgp(), live.getEurMad());
                }
            } catch (Exception ignored) {
                // Best-effort : on n'interrompt jamais le tick ni le push WS.
            }
        }
    }

    /** Pas d'Ornstein–Uhlenbeck discret : rappel vers l'ancre + bruit gaussien. */
    private BigDecimal ou(BigDecimal current, BigDecimal ref, double sigma, int scale) {
        double x = current.doubleValue();
        double m = ref.doubleValue();
        double noise = ThreadLocalRandom.current().nextGaussian() * sigma;
        double next = x + KAPPA * (m - x) + noise;
        return BigDecimal.valueOf(next).setScale(scale, RoundingMode.HALF_UP);
    }

    private BigDecimal nz(BigDecimal v, BigDecimal fallback) {
        return v != null ? v : fallback;
    }
}
