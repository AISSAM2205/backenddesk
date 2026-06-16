package ma.attijariwafa.desk_international.controller;

import lombok.RequiredArgsConstructor;
import ma.attijariwafa.desk_international.entity.PnlDaily;
import ma.attijariwafa.desk_international.repository.PnlDailyRepository;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/pnl-daily")
@RequiredArgsConstructor
public class PnlDailyController {

    private final PnlDailyRepository pnlDailyRepo;

    // L'URL finale devient /api/pnl-daily/history pour lever l'ambiguïté
    @GetMapping("/history")
    public ResponseEntity<List<PnlDaily>> getHistory(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(
                pnlDailyRepo.findBySnapshotDateBetweenOrderBySnapshotDateAsc(from, to));
    }
}