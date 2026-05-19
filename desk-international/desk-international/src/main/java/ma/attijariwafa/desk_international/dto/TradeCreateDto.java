package ma.attijariwafa.desk_international.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;

// Reçu par POST /api/trades/bond ou /api/trades/future
@Data
public class TradeCreateDto {
    // Commun
    private LocalDate  tradeDate;
    private LocalDate  valueDate;
    private String     way;           // "BUY" ou "SELL"
    private String     counterparty;
    private String     commissionType;

    // Bond uniquement
    private String     isin;
    private BigDecimal nominal;
    private BigDecimal cleanPrice;
    private BigDecimal accrued;
    private BigDecimal dirtyPrice;    // calculé si absent
    private BigDecimal yield;
    private BigDecimal gSpread;

    // Future uniquement
    private String     ticker;        // "FVH5 Comdty"
    private Integer    nbContracts;
    private BigDecimal entryPrice;
    private BigDecimal lastPrice;
    private String     hedBondIsin;   // ISIN du bond couvert
}