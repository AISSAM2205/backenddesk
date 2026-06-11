package ma.attijariwafa.desk_international.service;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

/**
 * Connecteur de production <b>Bloomberg BLPAPI</b> — activé par
 * {@code marketdata.provider=bloomberg}.
 *
 * <p>Squelette d'intégration. Le terminal/serveur Bloomberg (B-PIPE ou Desktop API)
 * n'est pas disponible en démo et la librairie {@code blpapi-*.jar} n'est pas sur Maven
 * Central (à installer en dépôt local / système). On garde donc ici uniquement les
 * <b>points d'ancrage</b> : dès que la dépendance est présente, on décommente la
 * souscription et on mappe chaque {@code MarketDataEvent} vers un
 * {@link ma.attijariwafa.desk_international.dto.MarketTick} diffusé par le
 * {@link MarketDataBroadcaster} — exactement le même fil que le simulateur.</p>
 *
 * <p>Le reste de l'application (broadcaster, WebSocket, front-end) reste inchangé :
 * c'est tout l'intérêt de la couture {@link MarketDataFeed}.</p>
 *
 * <pre>{@code
 * // pom.xml :
 * // <dependency>
 * //   <groupId>com.bloomberglp</groupId>
 * //   <artifactId>blpapi</artifactId>
 * //   <version>3.24.x</version>   <!-- installé via mvn install:install-file -->
 * // </dependency>
 *
 * @PostConstruct
 * void subscribe() throws Exception {
 *     SessionOptions opts = new SessionOptions();
 *     opts.setServerHost(host);          // ex. localhost (Desktop API) ou serveur B-PIPE
 *     opts.setServerPort(port);          // 8194 par défaut
 *     Session session = new Session(opts, this::onEvent);
 *     session.startAsync();
 *     session.openServiceAsync("//blp/mktdata");
 *
 *     SubscriptionList subs = new SubscriptionList();
 *     for (String sec : securities) {                 // "XS2595028452 Corp", "FVZ5 Comdty"…
 *         subs.add(new Subscription(sec, "BID,ASK,LAST_PRICE,RT_PX_CHG_PCT_1D"));
 *     }
 *     session.subscribe(subs);
 * }
 *
 * // EventHandler : chaque MARKET_DATA_EVENT → un MarketTick
 * void onEvent(Event event, Session session) {
 *     if (event.eventType() != Event.EventType.SUBSCRIPTION_DATA) return;
 *     for (Message msg : event) {
 *         double bid  = msg.hasElement("BID")        ? msg.getElementAsFloat64("BID")        : Double.NaN;
 *         double ask  = msg.hasElement("ASK")        ? msg.getElementAsFloat64("ASK")        : Double.NaN;
 *         double last = msg.hasElement("LAST_PRICE") ? msg.getElementAsFloat64("LAST_PRICE") : Double.NaN;
 *         MarketTick tick = mapToTick(msg.topicName(), bid, ask, last);
 *         broadcaster.broadcast(tick);                // même sortie que le simulateur
 *     }
 * }
 * }</pre>
 */
@Service
@ConditionalOnProperty(name = "marketdata.provider", havingValue = "bloomberg")
@RequiredArgsConstructor
@Slf4j
public class BloombergMarketDataFeed implements MarketDataFeed {

    @SuppressWarnings("unused")
    private final MarketDataBroadcaster broadcaster;

    private volatile boolean live = false;

    @PostConstruct
    void subscribe() {
        // TODO BLPAPI : ouvrir la session //blp/mktdata et souscrire BID/ASK/LAST.
        log.warn("[MarketData/BLOOMBERG] Connecteur BLPAPI sélectionné mais non câblé " +
                "(librairie blpapi absente). Aucune souscription temps réel active. " +
                "Repasser à marketdata.provider=simulated pour la démo.");
    }

    @Override public String providerName() { return "bloomberg"; }
    @Override public boolean isLive() { return live; }
}
