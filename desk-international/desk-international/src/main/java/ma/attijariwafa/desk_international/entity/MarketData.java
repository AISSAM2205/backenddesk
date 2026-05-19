package ma.attijariwafa.desk_international.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.*;

@Entity
@Table(name = "market_data")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class MarketData {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "isin", nullable = false)
    private Instrument instrument;

    @Column(name = "data_date", nullable = false)
    private LocalDate dataDate;

    @Column(name = "px_last", precision = 15, scale = 10)
    private BigDecimal pxLast;

    @Column(name = "px_mid", precision = 15, scale = 10)
    private BigDecimal pxMid;

    @Column(name = "accrued_bloomberg", precision = 15, scale = 10)
    private BigDecimal accruedBloomberg;

    @Column(name = "px_bid_awb", precision = 15, scale = 10)
    private BigDecimal pxBidAwb;

    @Column(name = "px_ask_awb", precision = 15, scale = 10)
    private BigDecimal pxAskAwb;

    @Column(name = "g_spread_bid", precision = 10, scale = 4)
    private BigDecimal gSpreadBid;

    @Column(name = "g_spread_ask", precision = 10, scale = 4)
    private BigDecimal gSpreadAsk;
    @Column(name = "i_spread_bid", precision = 10, scale = 4)
    private BigDecimal iSpreadBid;

    @Column(name = "i_spread_ask", precision = 10, scale = 4)
    private BigDecimal iSpreadAsk;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() { this.createdAt = LocalDateTime.now(); }

    public BigDecimal getAccrued() {
        return this.accruedBloomberg;
    }
}
