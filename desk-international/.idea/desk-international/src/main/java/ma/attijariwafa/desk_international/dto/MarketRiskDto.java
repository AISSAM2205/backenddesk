// dto/MarketRiskDto.java
package ma.attijariwafa.desk_international.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;

/**
 * Indicateurs de risque de marché agrégés du portefeuille, calculés à partir
 * de l'historique de P&L journalier (en MAD). Retourné par
 * {@code GET /api/risk/market}.
 *
 * <p>Source unique de vérité côté backend : remplace le calcul autrefois fait
 * dans le front (ReportingView). Tous les montants sont exprimés en MAD ;
 * {@code annVol} est en MAD (écart-type annualisé). Les champs statistiques
 * sont des {@link Double} (et non BigDecimal) afin de garantir une parité
 * numérique stricte avec la référence front, dont le calcul est en double.</p>
 */
@Data
@Builder
public class MarketRiskDto {

    // Fenêtre d'observation effectivement utilisée (bornes incluses).
    private LocalDate from;
    private LocalDate to;

    // Nombre d'observations journalières exploitées.
    private int nObs;

    // false si nObs < 5 (échantillon insuffisant) → champs stats à null.
    private boolean sufficient;

    // Statistiques de la distribution des P&L journaliers (MAD).
    private Double mean;     // moyenne
    private Double std;      // écart-type (population, ÷N)
    private Double annVol;   // volatilité annualisée = std × √252

    // VaR paramétrique gaussienne 1 jour (magnitude de perte, centrée 0).
    private Double varParam99;   // z(99 %) = 2.3263 × std
    private Double varParam95;   // z(95 %) = 1.6449 × std

    // VaR historique 1 jour (percentile empirique, interpolation linéaire).
    private Double varHist99;
    private Double varHist95;

    // Expected Shortfall / CVaR 97,5 % = perte moyenne de la queue 2,5 %.
    private Double es975;

    // Max drawdown sur le P&L économique cumulé (valeur absolue, MAD).
    private Double maxDrawdown;
}
