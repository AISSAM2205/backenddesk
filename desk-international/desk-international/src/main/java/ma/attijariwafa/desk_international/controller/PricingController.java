// controller/PricingController.java
package ma.attijariwafa.desk_international.controller;

import lombok.RequiredArgsConstructor;
import ma.attijariwafa.desk_international.dto.PricingDto;
import ma.attijariwafa.desk_international.service.PricingService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/pricing")
@RequiredArgsConstructor
public class PricingController {

    private final PricingService pricingService;

    // GET /api/pricing?date=2025-05-20
    // Résultats attendus :
    //   MOROC 5.95   → HOLD (G=136.65 < Target=140.38)
    //   OCPMR 6.1    → BUY  (G=202.89 > Target=134.54)
    @GetMapping
    public ResponseEntity<List<PricingDto>> getAll(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(
                pricingService.computeBuyHoldDecisions(date != null ? date : LocalDate.now()));
    }

    // GET /api/pricing/XS2595028452?date=2025-05-20
    @GetMapping("/{isin}")
    public ResponseEntity<PricingDto> getByIsin(
            @PathVariable String isin,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(
                pricingService.computeForIsin(isin, date != null ? date : LocalDate.now()));
    }
}
