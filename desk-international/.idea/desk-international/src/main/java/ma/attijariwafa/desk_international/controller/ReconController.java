package ma.attijariwafa.desk_international.controller;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import ma.attijariwafa.desk_international.dto.BoUploadResultDto;
import ma.attijariwafa.desk_international.dto.ReconResultDto;
import ma.attijariwafa.desk_international.dto.ReconStatusUpdateDto;
import ma.attijariwafa.desk_international.entity.BoTrade;
import ma.attijariwafa.desk_international.entity.ReconBreakStatus;
import ma.attijariwafa.desk_international.repository.BoTradeRepository;
import ma.attijariwafa.desk_international.service.AuditService;
import ma.attijariwafa.desk_international.service.BoCsvImportService;
import ma.attijariwafa.desk_international.service.ReconciliationService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * API de réconciliation Front Office / Back Office.
 *   POST   /api/recon/upload-bo      → import du fichier Back Office (CSV)
 *   GET    /api/recon/run            → lance le rapprochement (trades + positions + KPI)
 *   PUT    /api/recon/breaks/status  → met à jour le workflow d'un écart
 *   GET    /api/recon/bo-trades      → jeu Back Office courant
 *   DELETE /api/recon/bo-trades      → purge le jeu Back Office
 */
@RestController
@RequestMapping("/api/recon")
@RequiredArgsConstructor
public class ReconController {

    private final ReconciliationService reconService;
    private final BoCsvImportService    boImport;
    private final BoTradeRepository     boRepo;
    private final AuditService          auditService;

    @PostMapping("/upload-bo")
    public ResponseEntity<BoUploadResultDto> uploadBo(
            @RequestParam("file")                                   MultipartFile file,
            @RequestParam(value = "user", defaultValue = "system") String user) {
        BoUploadResultDto res = boImport.ingest(file, user);
        try {
            Map<String, Object> d = new LinkedHashMap<>();
            d.put("file",     res.getFilename() != null ? res.getFilename() : "");
            d.put("imported", String.valueOf(res.getImported()));
            d.put("errors",   String.valueOf(res.getErrors()));
            d.put("status",   res.getStatus() != null ? res.getStatus() : "");
            auditService.log(user, "bo_trade", "IMPORT", res.getBatchId(), d);
        } catch (Exception ignored) { /* audit non-bloquant */ }
        return ResponseEntity.ok(res);
    }

    @GetMapping("/run")
    public ResponseEntity<ReconResultDto> run(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) BigDecimal tolNominal,
            @RequestParam(required = false) BigDecimal tolPriceBps) {
        return ResponseEntity.ok(reconService.run(
                date != null ? date : LocalDate.now(), tolNominal, tolPriceBps));
    }

    @PutMapping("/breaks/status")
    public ResponseEntity<ReconBreakStatus> updateStatus(
            @RequestBody ReconStatusUpdateDto dto,
            HttpServletRequest req) {
        String user = username(req);
        ReconBreakStatus saved = reconService.updateStatus(dto, user);
        try {
            Map<String, Object> d = new LinkedHashMap<>();
            d.put("breakKey", dto.getBreakKey());
            d.put("status",   saved.getStatus());
            if (dto.getAssignee() != null) d.put("assignee", dto.getAssignee());
            auditService.log(user, "recon_break_status", "UPDATE", saved.getId(), d);
        } catch (Exception ignored) { /* audit non-bloquant */ }
        return ResponseEntity.ok(saved);
    }

    @GetMapping("/bo-trades")
    public ResponseEntity<List<BoTrade>> boTrades() {
        return ResponseEntity.ok(boRepo.findAll());
    }

    @DeleteMapping("/bo-trades")
    public ResponseEntity<Void> clearBo() {
        boRepo.deleteAllInBatch();
        return ResponseEntity.noContent().build();
    }

    private static String username(HttpServletRequest req) {
        String h = req.getHeader("X-Username");
        return (h != null && !h.isBlank()) ? h.trim() : "system";
    }
}
