package ma.attijariwafa.desk_international.controller;

import lombok.RequiredArgsConstructor;
import ma.attijariwafa.desk_international.entity.Instrument;
import ma.attijariwafa.desk_international.repository.InstrumentRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/instruments")
@RequiredArgsConstructor
public class InstrumentController {

    private final InstrumentRepository instrumentRepo;

    @GetMapping
    public ResponseEntity<List<Instrument>> getAll() {
        return ResponseEntity.ok(
                instrumentRepo.findByIsActiveTrueOrderBySubAssetAscMaturityDateAsc());
    }

    @GetMapping("/{isin}")
    public ResponseEntity<Instrument> getByIsin(@PathVariable String isin) {
        return instrumentRepo.findById(isin)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
