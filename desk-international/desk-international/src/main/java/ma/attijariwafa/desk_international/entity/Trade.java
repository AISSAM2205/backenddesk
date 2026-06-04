package ma.attijariwafa.desk_international.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.*;

@Entity
@Table(name = "trade")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class Trade {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "asset_identifier")
    private String assetIdentifier;

    @Column(name = "trade_date", nullable = false)
    private LocalDate tradeDate;

    @Column(name = "value_date")
    private LocalDate valueDate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JsonIgnore
    @JoinColumn(name = "isin")
    private Instrument bondInstrument;

    @Column(name = "sub_asset", nullable = false, length = 20)
    private String subAsset;

    @Column(name = "way", nullable = false, length = 4)
    private String way;

    @Column(name = "nominal", nullable = false, precision = 20, scale = 2)
    private BigDecimal nominal;

    @Column(name = "counterparty", length = 100)
    private String counterparty;

    // ✅ CORRECTION 3 : Ajout de commissionType attendu par le CsvImportService
    @Column(name = "commission_type", length = 50)
    private String commissionType;

    // Catégorie d'opération : TRADING | MARKET_MAKING | MONTAGE
    @Column(name = "trade_category", length = 30)
    private String tradeCategory;

    @Column(name = "clean_price", precision = 15, scale = 10)
    private BigDecimal cleanPrice;

    @Column(name = "accrued", precision = 15, scale = 10)
    private BigDecimal accrued;

    @Column(name = "dirty_price", precision = 15, scale = 10)
    private BigDecimal dirtyPrice;

    @Column(name = "wap_dirty", precision = 15, scale = 10)
    private BigDecimal wapDirty;

    @Column(name = "wap_clean", precision = 15, scale = 10)
    private BigDecimal wapClean;

    @Column(name = "realized_pnl", precision = 20, scale = 2)
    private BigDecimal realizedPnl;

    @Column(name = "mtm_pnl", precision = 20, scale = 2)
    private BigDecimal mtmPnl;

    @Column(name = "nb_contracts")
    private Integer nbContracts;

    @Column(name = "contract_size")
    private BigDecimal contractSize;

    @Column(name = "last_price")
    private BigDecimal lastPrice;

    @Column(name = "hed_bond_isin")
    private String hedBondIsin;

    // ✅ CORRECTION 4 : Renommé en gSpread pour que TradeBuilder le trouve
    @Column(name = "g_spread")
    private BigDecimal gSpread;

    @Column(name = "is_closed", nullable = false)
    private Boolean isClosed = false;

    @Column(name = "upload_log_id")
    private Long uploadLogId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    @JsonProperty("isin")
    public String getIsin() {
        return bondInstrument != null ? bondInstrument.getIsin() : assetIdentifier;
    }
}