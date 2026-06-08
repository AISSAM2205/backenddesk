package ma.attijariwafa.desk_international.dto;

import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;

@Data
@Builder
public class BreakdownDto {
    private String     label;
    private BigDecimal nominalMad;
    private BigDecimal plEcoMad;
    private BigDecimal pctPortfolio;
    private Integer    nbPositions;
}
