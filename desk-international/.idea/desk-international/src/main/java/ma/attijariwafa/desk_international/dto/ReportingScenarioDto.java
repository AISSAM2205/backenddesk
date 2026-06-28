// dto/ReportingScenarioDto.java
package ma.attijariwafa.desk_international.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

/**
 * Projection de P&L de fin d'année par scénario de taux (simulateur what-if du
 * Reporting). Calcul backend — source unique de vérité (ex-ReportingView).
 *
 * <p>Les chocs de taux (pess/central/opt, en bp) sont des <b>entrées
 * utilisateur</b> passées en paramètres : le backend porte la FORMULE, le front
 * reste un client mince. Par actif :</p>
 * <pre>
 *   carry        = run-rate journalier × jours restants
 *   rateImpact   = -DV01_MAD × choc_bp        (si DV01 &gt; 0)
 *   yeProjection = actuel + carry + rateImpact
 * </pre>
 *
 * <p>Seuls les NOMBRES sont renvoyés ; le style (libellés, couleurs) reste au
 * front. Valeurs en {@link Double} pour parité numérique stricte.</p>
 */
@Data
@Builder
public class ReportingScenarioDto {

    private LocalDate date;
    private int tradingDays;   // jours ouvrés écoulés (≈ yearProgress × 252)
    private int remainDays;    // jours ouvrés restants (252 − tradingDays)

    // Chocs effectivement appliqués (échos des paramètres) — le front vérifie
    // la concordance avant d'afficher le résultat backend.
    private int pess;
    private int central;
    private int opt;

    // Agrégats DV01 du book obligataire (Maroc + OCP).
    private double dv01TotalMad;   // Σ DV01 converti en MAD
    private double dv01Total;      // Σ DV01 en devise native

    private List<AssetRow> assetRows;
    private List<Scenario> scenarios;

    @Data
    @Builder
    public static class AssetRow {
        private String key;       // moroc / ocp / cln / egp
        private double actual;    // P&L réalisé YTD (MAD)
        private double carry;     // carry projeté jusqu'à fin d'année (MAD)
        private double dv01Mad;   // DV01 en MAD/bp (0 pour cln/egp)
        private double dv01;      // DV01 en devise native (0 pour cln/egp)
    }

    @Data
    @Builder
    public static class Scenario {
        private String key;       // pess / central / opt
        private int    shockBps;  // choc de taux appliqué
        private double total;     // somme des projections fin d'année
        private List<AssetResult> assetResults;
    }

    @Data
    @Builder
    public static class AssetResult {
        private String key;            // moroc / ocp / cln / egp
        private double rateImpact;     // impact taux (MAD)
        private double yeProjection;   // projection fin d'année (MAD)
    }
}
