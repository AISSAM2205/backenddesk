package ma.attijariwafa.desk_international.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import ma.attijariwafa.desk_international.dto.MarketTick;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Point de sortie unique des ticks vers les clients WebSocket (STOMP).
 *
 * <p>Agnostique de la source : le simulateur comme le futur connecteur Bloomberg/Kafka
 * appellent {@link #broadcast(List)}. Centraliser la diffusion ici garantit un format
 * de fil stable et un seul endroit à instrumenter (métriques, throttling, replay…).</p>
 *
 * <p>Deux canaux :</p>
 * <ul>
 *   <li>{@code /topic/market} : lot complet (snapshot) — consommé par le bandeau / la
 *       grille temps réel, qui indexe par {@code symbol}.</li>
 *   <li>{@code /topic/market/{symbol}} : flux ciblé — pour un widget abonné à un seul
 *       instrument (vue détail), évitant de filtrer tout le lot côté client.</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class MarketDataBroadcaster {

    public static final String TOPIC_BATCH  = "/topic/market";
    public static final String TOPIC_SYMBOL = "/topic/market/";

    private final SimpMessagingTemplate messagingTemplate;

    /** Diffuse un lot complet de ticks (un message = un snapshot du marché). */
    public void broadcast(List<MarketTick> ticks) {
        if (ticks == null || ticks.isEmpty()) return;
        messagingTemplate.convertAndSend(TOPIC_BATCH, ticks);
        if (log.isTraceEnabled()) {
            log.trace("[MarketData] Snapshot diffusé : {} ticks", ticks.size());
        }
    }

    /** Diffuse un tick unique sur son canal dédié (abonnement par instrument). */
    public void broadcast(MarketTick tick) {
        if (tick == null) return;
        messagingTemplate.convertAndSend(TOPIC_SYMBOL + tick.symbol(), tick);
    }
}
