// controller/DashboardController.java
package ma.attijariwafa.desk_international.controller;

import lombok.RequiredArgsConstructor;
import ma.attijariwafa.desk_international.dto.DashboardDto;
import ma.attijariwafa.desk_international.dto.GlobalDashboardDto;
import ma.attijariwafa.desk_international.dto.PnLDto;
import ma.attijariwafa.desk_international.entity.MarketRates;
import ma.attijariwafa.desk_international.entity.PnlDaily;
import ma.attijariwafa.desk_international.repository.MarketRatesRepository;
import ma.attijariwafa.desk_international.repository.PnlDailyRepository;
import ma.attijariwafa.desk_international.service.DashboardService;
import ma.attijariwafa.desk_international.service.GlobalDashboardService;
import ma.attijariwafa.desk_international.service.PnlService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService       dashService;
    private final PnlService             pnlService;
    private final PnlDailyRepository     pnlDailyRepo;
    private final GlobalDashboardService globalDashService;
    private final MarketRatesRepository  marketRatesRepo;

    // ─── URL PRINCIPALE ──────────────────────────────────────────
    // GET /api/dashboard/global?date=2025-05-20
    // Agrège Desk International + CLN externe + EGP externe en un seul objet
    @GetMapping("/dashboard/global")
    public ResponseEntity<GlobalDashboardDto> getGlobalDashboard(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(
                globalDashService.buildGlobal(date != null ? date : LocalDate.now()));
    }

    // GET /api/dashboard?date=2025-05-20
    // → 1 objet JSON par ISIN actif avec TOUT : position + P&L + pricing + risk
    // → C'est l'équivalent du tableau principal du Dashboard Excel
    @GetMapping("/dashboard")
    public ResponseEntity<List<DashboardDto>> getDashboard(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(
                dashService.buildDashboard(date != null ? date : LocalDate.now()));
    }

    // GET /api/pnl?date=2025-05-20  → P&L détaillé pour tous les bonds
    @GetMapping("/pnl")
    public ResponseEntity<List<PnLDto>> getAllPnL(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(
                pnlService.computeAllPnL(date != null ? date : LocalDate.now()));
    }

    // GET /api/pnl/XS2595028452?date=2025-05-20
    // Attendu : pnlEconomicMad ≈ 12 147 790 MAD
    @GetMapping("/pnl/{isin}")
    public ResponseEntity<PnLDto> getPnLByIsin(
            @PathVariable String isin,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(
                pnlService.computePnLForIsin(isin, date != null ? date : LocalDate.now()));
    }

    // GET /api/dashboard/rates
    // Retourne les taux de marché du jour (ou le dernier snapshot disponible)
    // Utilisé par le TickerBar et le TopBar du frontend
    @GetMapping("/dashboard/rates")
    public ResponseEntity<MarketRates> getRates(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        MarketRates rates = (date != null
                ? marketRatesRepo.findByRateDate(date).orElse(null)
                : null);
        if (rates == null) {
            rates = marketRatesRepo.findTopByOrderByRateDateDesc().orElse(null);
        }
        return rates != null ? ResponseEntity.ok(rates) : ResponseEntity.notFound().build();
    }

    // GET /api/pnl-daily?from=2025-01-01&to=2025-05-20
    // Retourne l'historique P&L journalier pour le graphique courbe du dashboard
    @GetMapping("/pnl-daily")
    public ResponseEntity<List<PnlDaily>> getPnlDaily(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        LocalDate end   = to   != null ? to   : LocalDate.now();
        LocalDate start = from != null ? from : end.minusDays(90);
        return ResponseEntity.ok(
                pnlDailyRepo.findBySnapshotDateBetweenOrderBySnapshotDateAsc(start, end));
    }
}
