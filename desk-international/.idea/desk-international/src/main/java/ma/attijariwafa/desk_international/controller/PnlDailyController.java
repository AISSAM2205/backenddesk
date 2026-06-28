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
        List<PnlDaily> window =
                pnlDailyRepo.findBySnapshotDateBetweenOrderBySnapshotDateAsc(from, to);
        // Repli résilient : si la fenêtre demandée [from, to] ne recoupe AUCUN
        // snapshot seedé (décalage de dates démo — la base a été seedée à une
        // date différente de celle du navigateur), on renvoie TOUT l'historique
        // persisté plutôt que vide. Ainsi la courbe P&L et les stats de risque
        // (VaR/ES/drawdown) affichent TOUJOURS des données backend réelles, sans
        // qu'aucun repli fabriqué côté front ne soit nécessaire.
        if (window.isEmpty()) {
            window = pnlDailyRepo.findAllByOrderBySnapshotDateAsc();
        }
        return ResponseEntity.ok(window);
    }
}