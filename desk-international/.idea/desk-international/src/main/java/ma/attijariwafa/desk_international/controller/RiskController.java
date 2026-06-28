// controller/RiskController.java
package ma.attijariwafa.desk_international.controller;

import lombok.RequiredArgsConstructor;
import ma.attijariwafa.desk_international.dto.MarketRiskDto;
import ma.attijariwafa.desk_international.dto.RateScenarioDto;
import ma.attijariwafa.desk_international.dto.RiskDto;
import ma.attijariwafa.desk_international.service.MarketRiskService;
import ma.attijariwafa.desk_international.service.RiskService;
import ma.attijariwafa.desk_international.service.ScenarioService;
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
    private final MarketRiskService marketRiskService;
    private final ScenarioService scenarioService;

    // GET /api/risk?date=2025-05-20  → risques pour tous les bonds actifs
    @GetMapping
    public ResponseEntity<List<RiskDto>> getAll(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(
                riskService.computeAllRisks(date != null ? date : LocalDate.now()));
    }

    // GET /api/risk/market[?from=2025-01-02&to=2025-05-20]
    // Indicateurs de risque de marché agrégés (VaR paramétrique + historique,
    // Expected Shortfall, volatilité annualisée, max drawdown) calculés sur
    // l'historique de P&L journalier. Sans from/to → tout l'historique.
    // Le segment littéral "market" prime sur /{isin} (comme /duration).
    @GetMapping("/market")
    public ResponseEntity<MarketRiskDto> getMarketRisk(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(marketRiskService.computeMarketRisk(from, to));
    }

    // GET /api/risk/scenarios[?date=2025-05-20]
    // Grille de choc de taux (-100/-50/-25/+25/+50/+100 bp) : P&L linéaire +
    // ajusté convexité, en USD et MAD. Source unique backend (ex-RiskView).
    // Le segment littéral "scenarios" prime sur /{isin} (comme /duration).
    @GetMapping("/scenarios")
    public ResponseEntity<RateScenarioDto> getScenarios(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(
                scenarioService.computeRateScenarios(date != null ? date : LocalDate.now()));
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
