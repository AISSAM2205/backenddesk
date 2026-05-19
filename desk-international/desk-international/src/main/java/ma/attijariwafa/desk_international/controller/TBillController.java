package ma.attijariwafa.desk_international.controller;

import lombok.RequiredArgsConstructor;
import ma.attijariwafa.desk_international.entity.TBillPosition;
import ma.attijariwafa.desk_international.repository.TBillPositionRepository;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.List;

/**
 * Expose les positions T-Bills offshore (USD + EUR).
 * GET /api/tbills           → toutes les positions (date = aujourd'hui, fallback dernière dispo)
 * GET /api/tbills?date=...  → positions pour une date précise
 * GET /api/tbills/usd       → uniquement les T-Bills USD
 * GET /api/tbills/eur       → uniquement les T-Bills EUR
 */
@RestController
@RequestMapping("/api/tbills")
@RequiredArgsConstructor
public class TBillController {

    private final TBillPositionRepository tbillRepo;

    @GetMapping
    public ResponseEntity<List<TBillPosition>> getAll(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(resolve(null, date));
    }

    @GetMapping("/usd")
    public ResponseEntity<List<TBillPosition>> getUsd(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(resolve("USD", date));
    }

    @GetMapping("/eur")
    public ResponseEntity<List<TBillPosition>> getEur(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(resolve("EUR", date));
    }

    /** Résout la date : cherche la date exacte, fallback sur la dernière date disponible */
    private List<TBillPosition> resolve(String devise, LocalDate date) {
        LocalDate d = date != null ? date : LocalDate.now();
        List<TBillPosition> data = devise != null
                ? tbillRepo.findByDeviseAndSnapshotDate(devise, d)
                : tbillRepo.findBySnapshotDate(d);
        if (data.isEmpty()) {
            data = tbillRepo.findLatest();
            if (devise != null) {
                final String dev = devise;
                data = data.stream().filter(t -> dev.equals(t.getDevise())).toList();
            }
        }
        return data;
    }
}
