package ma.attijariwafa.desk_international.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Enregistrement de trade tel que vu par le Back Office (système de règlement /
 * dépositaire / comptabilité). Source INDÉPENDANTE de la table {@code trade} (Front
 * Office) : c'est la confrontation des deux qui produit la réconciliation.
 * Alimentée par import CSV ({@code BoCsvImportService}) ou seed de démonstration.
 */
@Entity
@Table(name = "bo_trade")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class BoTrade {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "isin", length = 20)
    private String isin;

    @Column(name = "way", nullable = false, length = 4)
    private String way;

    @Column(name = "nominal", nullable = false, precision = 20, scale = 2)
    private BigDecimal nominal;

    // Prix clean stocké en fraction du pair (1.0147 = 101,47 %), comme côté FO
    @Column(name = "clean_price", precision = 15, scale = 10)
    private BigDecimal cleanPrice;

    @Column(name = "trade_date")
    private LocalDate tradeDate;

    @Column(name = "value_date")
    private LocalDate valueDate;

    @Column(name = "counterparty", length = 100)
    private String counterparty;

    @Column(name = "sub_asset", length = 20)
    private String subAsset;

    // Référence interne Back Office (n° de règlement / confirmation)
    @Column(name = "bo_ref", length = 60)
    private String boRef;

    // Identifiant du lot d'import (un upload = un arrêté BO)
    @Column(name = "upload_batch_id")
    private Long uploadBatchId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
