// controller/RiskController.java
package ma.attijariwafa.desk_international.controller;

import lombok.RequiredArgsConstructor;
import ma.attijariwafa.desk_international.dto.RiskDto;
import ma.attijariwafa.desk_international.service.RiskService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/risk")
@RequiredArgsConstructor
public class RiskController {

    private final RiskService riskService;

    // GET /api/risk?date=2025-05-20  → risques pour tous les bonds actifs
    @GetMapping
    public ResponseEntity<List<RiskDto>> getAll(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(
                riskService.computeAllRisks(date != null ? date : LocalDate.now()));
    }

    // GET /api/risk/XS2595028452?date=2025-05-20
    // Attendu : dv01Bond≈18532, hedgeFuture="FVH5 Comdty", nbContractsToHedge≈461
    @GetMapping("/{isin}")
    public ResponseEntity<RiskDto> getByIsin(
            @PathVariable String isin,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(
                riskService.computeForIsin(isin, date != null ? date : LocalDate.now()));
    }

    // GET /api/risk/duration?date=2025-05-20  → 3.9049 years (valeur Excel)
    @GetMapping("/duration")
    public ResponseEntity<BigDecimal> getDuration(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(
                riskService.computePortfolioDuration(date != null ? date : LocalDate.now()));
    }
}
