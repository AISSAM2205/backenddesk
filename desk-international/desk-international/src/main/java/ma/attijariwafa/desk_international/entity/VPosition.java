// entity/VPosition.java
// IMPORTANT : c'est une VUE SQL — jamais de save() sur cette entité
package ma.attijariwafa.desk_international.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Immutable;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Immutable       // Hibernate : aucun write jamais — la vue est en lecture seule
@Table(name = "v_position")
@Getter          // PAS de @Setter — entité immuable
@NoArgsConstructor
public class VPosition {

    // La vue n'a pas de BIGSERIAL — isin est l'identifiant naturel
    @Id
    @Column(name = "isin", length = 12)
    private String isin;

    @Column(name = "description")             private String description;
    @Column(name = "currency", length = 3)     private String currency;
    @Column(name = "sub_asset", length = 20)   private String subAsset;

    @Column(name = "coupon_rate", precision = 8, scale = 4)
    private BigDecimal couponRate;

    @Column(name = "maturity_date")
    private LocalDate maturityDate;

    // Position nette = SUM(BUY nominal) - SUM(SELL nominal)
    // Vue SQL calculée automatiquement depuis trade
    // Valeur réelle Excel : XS2595028452 → 73 460 000 USD
    @Column(name = "net_nominal", precision = 20, scale = 2)
    private BigDecimal netNominal;

    // WAP le plus récent parmi les BUY (MAX par ordre chronologique)
    // Valeur réelle : XS2595028452 → 1.030299202909292
    @Column(name = "wap_dirty", precision = 15, scale = 10)
    private BigDecimal wapDirty;

    @Column(name = "wap_clean", precision = 15, scale = 10)
    private BigDecimal wapClean;

    // Somme de tous les P&L réalisés (SELL uniquement)
    @Column(name = "total_realized_pnl", precision = 20, scale = 2)
    private BigDecimal totalRealizedPnl;

    @Column(name = "nb_open_buy_trades")
    private Long nbOpenBuyTrades;

    @Column(name = "total_trades")
    private Long totalTrades;

    // Renvoie la colonne wap_dirty existante
    public BigDecimal getLastWapDirty() {
        return this.wapDirty;
    }

    // Renvoie la colonne wap_clean existante
    public BigDecimal getLastWapClean() {
        return this.wapClean;
    }

    // Logique métier : si on a du nominal, c'est actif, sinon c'est cloturé
    public String getStatus() {
        if (this.netNominal != null && this.netNominal.compareTo(BigDecimal.ZERO) > 0) {
            return "ACTIVE";
        }
        return "CLOSED";
    }

    // Pour éviter les erreurs avec le Dashboard, on retourne 0 par défaut
    // (A moins que vous n'ayez déjà ajouté la colonne futures_net_position dans la DB)
    public Integer getFuturesNetPosition() {
        return 0;
    }
}