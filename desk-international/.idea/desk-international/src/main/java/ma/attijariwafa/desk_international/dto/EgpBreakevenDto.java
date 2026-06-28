// dto/EgpBreakevenDto.java
package ma.attijariwafa.desk_international.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

/**
 * Seuils de rentabilité FX (breakeven) par deal EGP Bills, calculés côté
 * backend (source unique de vérité — remplace le calcul fait dans EGPView).
 *
 * <p>Pour chaque deal : BKV sans financement = FX_entrée × (1 + yield × j/360) ;
 * BKV avec financement = FX_entrée × (1 + (yield − SOFR) × j/360) ; coussins en
 * % vs spot ; P&L FX approx. en MAD. Conventions identiques à l'ancien front,
 * en {@link Double} pour parité numérique. Le nombre de jours restants est
 * calculé en jours <b>calendaires</b> (déterministe), corrigeant l'ancien
 * calcul front sensible à l'heure de la journée.</p>
 */
@Data
@Builder
public class EgpBreakevenDto {

    private LocalDate date;

    // Paramètres de marché utilisés (affichés dans l'en-tête du panneau).
    private double spot;     // USD/EGP spot
    private double sofr;     // SOFR en décimal (ex. 0.0533)
    private double usdMad;   // USD/MAD pour la conversion du P&L

    private List<Deal> deals;

    @Data
    @Builder
    public static class Deal {
        private String    isin;
        private String    description;
        private double    nominalUsd;
        private LocalDate maturityDate;
        private int       daysRem;       // jours calendaires jusqu'à l'échéance
        private double    yieldRate;     // rendement en décimal (ex. 0.265)
        private double    fxEntry;       // USD/EGP à l'entrée (WAP, repli spot)
        private double    bkvSansFin;    // breakeven sans financement
        private double    bkvAvecFin;    // breakeven avec financement (− SOFR)
        private double    cushionSans;   // coussin % vs spot (sans fin.)
        private double    cushionAvec;   // coussin % vs spot (avec fin.)
        private double    plFxApprox;    // P&L FX latent approx. (MAD)
    }
}
