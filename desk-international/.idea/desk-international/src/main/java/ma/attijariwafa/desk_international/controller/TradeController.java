// controller/TradeController.java
package ma.attijariwafa.desk_international.controller;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import ma.attijariwafa.desk_international.dto.TradeCreateDto;
import ma.attijariwafa.desk_international.entity.CsvUploadLog;
import ma.attijariwafa.desk_international.entity.Trade;
import ma.attijariwafa.desk_international.service.AuditService;
import ma.attijariwafa.desk_international.service.CsvImportService;
import ma.attijariwafa.desk_international.service.TradeService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/trades")
@RequiredArgsConstructor
public class TradeController {

    private final TradeService     tradeService;
    private final CsvImportService csvService;
    private final AuditService     auditService;

    // POST /api/trades/upload-csv
    // Postman : Body → form-data → key="file" type=File → bonds.csv
    @PostMapping("/upload-csv")
    public ResponseEntity<CsvUploadLog> uploadCsv(
            @RequestParam("file")                                   MultipartFile file,
            @RequestParam(value = "user", defaultValue = "system") String user) {
        CsvUploadLog result = csvService.ingestCsv(file, user);
        try {
            Map<String, Object> d = new LinkedHashMap<>();
            d.put("file",     result.getFilename() != null ? result.getFilename() : "");
            d.put("imported", String.valueOf(result.getImportedCount()));
            d.put("errors",   String.valueOf(result.getErrorCount()));
            d.put("status",   result.getStatus() != null ? result.getStatus() : "");
            auditService.log(user, "csv_upload", "IMPORT", result.getId(), d);
        } catch (Exception ignored) { /* audit non-bloquant */ }
        return ResponseEntity.ok(result);
    }

    // POST /api/trades/bond
    // {"isin":"XS2595028452","way":"BUY","nominal":5000000,"cleanPrice":1.006,"accrued":0.019}
    @PostMapping("/bond")
    public ResponseEntity<Trade> createBond(
            @RequestBody TradeCreateDto dto,
            HttpServletRequest req) {
        Trade saved = tradeService.createBondTrade(dto);
        try {
            Map<String, Object> d = new LinkedHashMap<>();
            d.put("isin",       dto.getIsin()       != null ? dto.getIsin()                      : "");
            d.put("way",        dto.getWay()        != null ? dto.getWay()                       : "");
            d.put("nominal",    dto.getNominal()    != null ? dto.getNominal().toPlainString()    : "");
            d.put("cleanPrice", dto.getCleanPrice() != null ? dto.getCleanPrice().toPlainString() : "");
            if (dto.getGSpread()      != null) d.put("gSpread",      dto.getGSpread().toPlainString());
            if (dto.getCounterparty() != null) d.put("counterparty", dto.getCounterparty());
            auditService.log(username(req), "trade", "INSERT", saved.getId(), d);
        } catch (Exception ignored) { /* audit non-bloquant */ }
        return ResponseEntity.ok(saved);
    }

    // POST /api/trades/future
    // {"ticker":"FVH5 Comdty","way":"SELL","nbContracts":461,"entryPrice":108.03}
    @PostMapping("/future")
    public ResponseEntity<Trade> createFuture(
            @RequestBody TradeCreateDto dto,
            HttpServletRequest req) {
        Trade saved = tradeService.createFutureTrade(dto);
        try {
            Map<String, Object> d = new LinkedHashMap<>();
            d.put("ticker",    dto.getTicker()      != null ? dto.getTicker()                       : "");
            d.put("way",       dto.getWay()         != null ? dto.getWay()                          : "");
            d.put("contracts", dto.getNbContracts() != null ? String.valueOf(dto.getNbContracts())  : "");
            d.put("entry",     dto.getEntryPrice()  != null ? dto.getEntryPrice().toPlainString()   : "");
            if (dto.getHedBondIsin() != null) d.put("hedBondIsin", dto.getHedBondIsin());
            auditService.log(username(req), "trade", "INSERT", saved.getId(), d);
        } catch (Exception ignored) { /* audit non-bloquant */ }
        return ResponseEntity.ok(saved);
    }

    // GET /api/trades
    // GET /api/trades?isin=XS2595028452&way=BUY
    // GET /api/trades?subAsset=Mor Bond
    @GetMapping
    public ResponseEntity<List<Trade>> getTrades(
            @RequestParam(required = false) String isin,
            @RequestParam(required = false) String way,
            @RequestParam(required = false) String subAsset) {
        return ResponseEntity.ok(tradeService.getTrades(isin, way, subAsset));
    }

    // GET /api/trades/42
    @GetMapping("/{id}")
    public ResponseEntity<Trade> getById(@PathVariable Long id) {
        return ResponseEntity.ok(tradeService.getById(id));
    }

    // DELETE /api/trades/42/cancel  → marque le trade comme annulé
    @DeleteMapping("/{id}/cancel")
    public ResponseEntity<Trade> cancel(
            @PathVariable Long id,
            HttpServletRequest req) {
        Trade cancelled = tradeService.cancelTrade(id);
        try {
            Map<String, Object> d = new LinkedHashMap<>();
            d.put("isin", cancelled.getAssetIdentifier() != null ? cancelled.getAssetIdentifier() : "");
            d.put("way",  cancelled.getWay()             != null ? cancelled.getWay()             : "");
            auditService.log(username(req), "trade", "DELETE", cancelled.getId(), d);
        } catch (Exception ignored) { /* audit non-bloquant */ }
        return ResponseEntity.ok(cancelled);
    }

    // ── username : X-Username header → enrichi par Keycloak après intégration ──
    private static String username(HttpServletRequest req) {
        String h = req.getHeader("X-Username");
        return (h != null && !h.isBlank()) ? h.trim() : "system";
    }
}
