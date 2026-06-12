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
import ma.attijariwafa.desk_international.repository.PricingConfigRepository;
import ma.attijariwafa.desk_international.service.DashboardService;
import ma.attijariwafa.desk_international.service.GlobalDashboardService;
import ma.attijariwafa.desk_international.service.PnlService;
import jakarta.servlet.http.HttpServletRequest;
import ma.attijariwafa.desk_international.service.AuditService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService       dashService;
    private final PnlService             pnlService;
    private final PnlDailyRepository     pnlDailyRepo;
    private final GlobalDashboardService globalDashService;
    private final MarketRatesRepository   marketRatesRepo;
    private final PricingConfigRepository pricingConfigRepo;
    private final AuditService            auditService;

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

    // PATCH /api/dashboard/{isin}/decision
    // Body : { "decision": "BUY" | "HOLD" | "SELL" | null }
    // Met à jour le signal du dernier snapshot PricingConfig pour cet ISIN
    @PatchMapping("/dashboard/{isin}/decision")
    public ResponseEntity<Void> updateDecision(
            @PathVariable String isin,
            @RequestBody Map<String, String> body,
            HttpServletRequest req) {
        String raw = body.get("decision");
        String newDecision = (raw == null || raw.isBlank()) ? null : raw.toUpperCase().trim();
        pricingConfigRepo
                .findTopByInstrumentIsinOrderByConfigDateDesc(isin)
                .map(pc -> {
                    pc.setDecision(newDecision);
                    return pricingConfigRepo.save(pc);
                })
                .ifPresent(pc -> {
                    try {
                        Map<String, Object> d = new LinkedHashMap<>();
                        d.put("isin",     isin);
                        d.put("decision", newDecision != null ? newDecision : "effacé");
                        auditService.log(username(req), "pricing_config", "UPDATE", pc.getId(), d);
                    } catch (Exception ignored) {}
                });
        return ResponseEntity.noContent().build();
    }

    // PATCH /api/dashboard/{isin}/target-spread
    // Body : { "targetSpread": 135.0 }
    // Met à jour la cible de spread et recalcule la décision BUY/HOLD automatiquement
    @PatchMapping("/dashboard/{isin}/target-spread")
    public ResponseEntity<Void> updateTargetSpread(
            @PathVariable String isin,
            @RequestBody Map<String, Object> body,
            HttpServletRequest req) {
        Object raw = body.get("targetSpread");
        if (raw == null) return ResponseEntity.badRequest().build();
        BigDecimal newTarget;
        try {
            newTarget = new BigDecimal(raw.toString());
        } catch (NumberFormatException e) {
            return ResponseEntity.badRequest().build();
        }
        pricingConfigRepo
                .findTopByInstrumentIsinOrderByConfigDateDesc(isin)
                .map(pc -> {
                    pc.setTargetSpread(newTarget);
                    // Recalculer la décision : G-Spread BID > nouvelle cible → BUY
                    if (pc.getGSpreadBid() != null) {
                        pc.setDecision(pc.getGSpreadBid().compareTo(newTarget) > 0 ? "BUY" : "HOLD");
                    }
                    return pricingConfigRepo.save(pc);
                })
                .ifPresent(pc -> {
                    try {
                        Map<String, Object> d = new LinkedHashMap<>();
                        d.put("isin",         isin);
                        d.put("targetSpread", newTarget.toPlainString());
                        d.put("decision",     pc.getDecision() != null ? pc.getDecision() : "?");
                        auditService.log(username(req), "pricing_config", "UPDATE", pc.getId(), d);
                    } catch (Exception ignored) {}
                });
        return ResponseEntity.noContent().build();
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
        List<PnlDaily> rows =
                pnlDailyRepo.findBySnapshotDateBetweenOrderBySnapshotDateAsc(start, end);
        // Résilience : si la fenêtre [from,to] ne recoupe aucun snapshot (décalage
        // de dates entre le seed backend et l'horloge front), on renvoie tout
        // l'historique disponible plutôt qu'une courbe vide ("Chargement…" figé).
        if (rows.isEmpty()) {
            rows = pnlDailyRepo.findAllByOrderBySnapshotDateAsc();
        }
        return ResponseEntity.ok(rows);
    }

    // ── username : X-Username header → enrichi par Keycloak après intégration ──
    private static String username(HttpServletRequest req) {
        String h = req.getHeader("X-Username");
        return (h != null && !h.isBlank()) ? h.trim() : "system";
    }
}
