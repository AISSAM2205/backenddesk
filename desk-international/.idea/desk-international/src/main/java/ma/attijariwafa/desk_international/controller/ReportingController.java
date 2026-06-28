// controller/ReportingController.java
package ma.attijariwafa.desk_international.controller;

import lombok.RequiredArgsConstructor;
import ma.attijariwafa.desk_international.dto.ReportingScenarioDto;
import ma.attijariwafa.desk_international.service.ReportingScenarioService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/reporting")
@RequiredArgsConstructor
public class ReportingController {

    private final ReportingScenarioService scenarioService;

    // GET /api/reporting/scenarios?date=2025-05-20&pess=100&central=0&opt=-50
    // Projection de P&L fin d'année par scénario de taux (simulateur what-if).
    // Les chocs (pess/central/opt, en bp) sont des entrées utilisateur ; les
    // défauts reprennent ceux du front. Source unique backend (ex-ReportingView).
    @GetMapping("/scenarios")
    public ResponseEntity<ReportingScenarioDto> getScenarios(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(defaultValue = "100") int pess,
            @RequestParam(defaultValue = "0")   int central,
            @RequestParam(defaultValue = "-50") int opt) {
        return ResponseEntity.ok(
                scenarioService.computeScenarios(date, pess, central, opt));
    }
}
