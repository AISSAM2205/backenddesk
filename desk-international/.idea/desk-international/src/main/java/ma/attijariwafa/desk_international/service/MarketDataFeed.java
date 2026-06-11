package ma.attijariwafa.desk_international.service;

/**
 * Couture d'abstraction (« seam ») pour la source de données de marché.
 *
 * <p>Une seule implémentation est active à la fois, sélectionnée par la propriété
 * {@code marketdata.provider} :</p>
 * <ul>
 *   <li>{@code simulated} (défaut) → {@link SimulatedMarketDataFeed} : flux stochastique
 *       réaliste pour la démo / les environnements sans terminal Bloomberg.</li>
 *   <li>{@code bloomberg} → {@code BloombergMarketDataFeed} : connecteur BLPAPI réel
 *       (souscription temps réel sur les champs BID/ASK/LAST).</li>
 *   <li>{@code kafka} → connecteur consommant un topic de prix d'un bus interne.</li>
 * </ul>
 *
 * <p>Toutes les implémentations publient le même {@code MarketTick} via le
 * {@link MarketDataBroadcaster}. Le passage de la simulation à la production se fait
 * donc par configuration, sans modification du broadcaster ni du front-end.</p>
 */
public interface MarketDataFeed {

    /** Identifiant du connecteur actif (pour le logging / l'observabilité). */
    String providerName();

    /** {@code true} si le connecteur produit effectivement des ticks. */
    boolean isLive();
}
