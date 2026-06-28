// dto/RateScenarioDto.java
package ma.attijariwafa.desk_international.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

/**
 * Grille de scénarios de choc de taux du portefeuille obligataire, calculée
 * côté backend (source unique de vérité — remplace le calcul fait dans
 * RiskView). P&L par scénario = approximation de Taylor 2nd ordre :
 *
 * <pre>ΔP_usd = -DV01 × Δbp + ½ · Σ(C·N) · (Δbp/10000)²</pre>
 *
 * <p>Le terme linéaire utilise le DV01 agrégé (USD/bp) ; le terme convexe
 * utilise Σ(convexité × nominal). Conversion en MAD par le spot USD/MAD.
 * Valeurs en {@link Double} pour parité numérique stricte avec le front.</p>
 */
@Data
@Builder
public class RateScenarioDto {

    private LocalDate date;

    // Agrégats du book (sur les lignes à DV01 non nul).
    private double totalDv01Usd;        // Σ DV01 (USD/bp)
    private double totalConvexDollar;   // Σ (convexité × nominal)
    private double usdMad;              // spot de conversion

    private List<Scenario> scenarios;

    @Data
    @Builder
    public static class Scenario {
        private String label;       // ex. "+100bp"
        private int    deltaBp;     // choc de taux en points de base
        private double pnlUsdLin;   // P&L linéaire (USD) = -DV01 × Δbp
        private double convAdj;     // ajustement de convexité (USD)
        private double pnlUsdAdj;   // P&L ajusté convexité (USD)
        private double pnlMadLin;   // P&L linéaire (MAD)
        private double pnlMadAdj;   // P&L ajusté convexité (MAD)
    }
}
