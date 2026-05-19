// controller/PositionController.java
package ma.attijariwafa.desk_international.controller;

import lombok.RequiredArgsConstructor;
import ma.attijariwafa.desk_international.dto.PositionDto;
import ma.attijariwafa.desk_international.service.PositionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/positions")
@RequiredArgsConstructor
public class PositionController {

    private final PositionService posService;

    // GET /api/positions  → toutes les positions (actives + fermées)
    @GetMapping
    public ResponseEntity<List<PositionDto>> getAll() {
        return ResponseEntity.ok(posService.getAllPositions());
    }

    // GET /api/positions/active  → uniquement les positions > 0
    @GetMapping("/active")
    public ResponseEntity<List<PositionDto>> getActive() {
        return ResponseEntity.ok(posService.getAllActivePositions());
    }

    // GET /api/positions/XS2595028452
    // Attendu : netNominal=73460000, lastWapDirty=1.030299...
    @GetMapping("/{isin}")
    public ResponseEntity<PositionDto> getByIsin(@PathVariable String isin) {
        return posService.getPositionByIsin(isin)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
