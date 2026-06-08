package ma.attijariwafa.desk_international.controller;

import lombok.RequiredArgsConstructor;
import ma.attijariwafa.desk_international.entity.ExternalPnlSnapshot;
import ma.attijariwafa.desk_international.repository.ExternalPnlSnapshotRepository;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/external")
@RequiredArgsConstructor
public class ExternalController {

    private final ExternalPnlSnapshotRepository extRepo;

    // GET /api/external/cln?date=2025-05-20
    // Retourne les positions CLN externes (gérées par desk structuré, snapshot)
    @GetMapping("/cln")
    public ResponseEntity<List<ExternalPnlSnapshot>> getCln(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(resolve("CLN", date));
    }

    // GET /api/external/egp?date=2025-05-20
    // Retourne les positions EGP Bills externes (gérées par desk local, snapshot)
    @GetMapping("/egp")
    public ResponseEntity<List<ExternalPnlSnapshot>> getEgp(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(resolve("EGP_BILL", date));
    }

    // GET /api/external/all?date=2025-05-20
    @GetMapping("/all")
    public ResponseEntity<List<ExternalPnlSnapshot>> getAll(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        LocalDate d = date != null ? date : LocalDate.now();
        List<ExternalPnlSnapshot> data = extRepo.findByAssetCategoryAndSnapshotDate("CLN", d);
        data.addAll(extRepo.findByAssetCategoryAndSnapshotDate("EGP_BILL", d));
        if (data.isEmpty()) {
            data = extRepo.findLatestByCategory("CLN");
            data.addAll(extRepo.findLatestByCategory("EGP_BILL"));
        }
        return ResponseEntity.ok(data);
    }

    // Cherche la date exacte, fallback sur la dernière date disponible
    private List<ExternalPnlSnapshot> resolve(String category, LocalDate date) {
        LocalDate d = date != null ? date : LocalDate.now();
        List<ExternalPnlSnapshot> data =
                extRepo.findByAssetCategoryAndSnapshotDate(category, d);
        if (data.isEmpty()) {
            data = extRepo.findLatestByCategory(category);
        }
        return data;
    }
}
