package ma.attijariwafa.desk_international.dto;

/**
 * Tick de marché diffusé en temps réel sur le WebSocket STOMP (/topic/market).
 *
 * <p>Format de fil unique, indépendant de la source (simulateur, Bloomberg BLPAPI,
 * Kafka…). Tout connecteur {@code MarketDataFeed} produit ce même objet, ce qui
 * permet de remplacer l'implémentation sans toucher au front-end ni au broadcaster.</p>
 *
 * <p>Conventions d'unité :</p>
 * <ul>
 *   <li>{@code bid/ask/mid/last} : prix en <b>points</b> (pour 100 de nominal) —
 *       ex. 102.750 pour une obligation, 107.250 pour un future.</li>
 *   <li>{@code netChange} : variation en points vs. clôture de référence.</li>
 *   <li>{@code pctChange} : variation en pourcentage vs. clôture de référence.</li>
 *   <li>{@code bidSize/askSize} : profondeur indicative (millions de nominal / lots).</li>
 *   <li>{@code ts} : horodatage epoch millisecondes (source de vérité temporelle).</li>
 * </ul>
 */
public record MarketTick(
        String symbol,      // ISIN (bond) ou ticker (future) — clé d'agrégation côté client
        String label,       // libellé court lisible
        String type,        // "BOND" | "FUTURE"
        String currency,    // USD | EUR | EGP …
        double bid,
        double ask,
        double mid,
        double last,
        double netChange,
        double pctChange,
        int    bidSize,
        int    askSize,
        long   ts
) {}
