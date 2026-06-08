// controller/TradeController.java
package ma.attijariwafa.desk_international.controller;

import lombok.RequiredArgsConstructor;
import ma.attijariwafa.desk_international.dto.TradeCreateDto;
import ma.attijariwafa.desk_international.entity.CsvUploadLog;
import ma.attijariwafa.desk_international.entity.Trade;
import ma.attijariwafa.desk_international.service.CsvImportService;
import ma.attijariwafa.desk_international.service.TradeService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.List;

@RestController
@RequestMapping("/api/trades")
@RequiredArgsConstructor
public class TradeController {

    private final TradeService     tradeService;
    private final CsvImportService csvService;

    // POST /api/trades/upload-csv
    // Postman : Body → form-data → key="file" type=File → bonds.csv
    @PostMapping("/upload-csv")
    public ResponseEntity<CsvUploadLog> uploadCsv(
            @RequestParam("file")                     MultipartFile file,
            @RequestParam(value="user", defaultValue="system") String user) {
        return ResponseEntity.ok(csvService.ingestCsv(file, user));
    }

    // POST /api/trades/bond
    // Postman : Body → raw JSON
    // {"isin":"XS2595028452","way":"BUY","nominal":5000000,"cleanPrice":1.006,"accrued":0.019}
    @PostMapping("/bond")
    public ResponseEntity<Trade> createBond(@RequestBody TradeCreateDto dto) {
        return ResponseEntity.ok(tradeService.createBondTrade(dto));
    }

    // POST /api/trades/future
    // {"ticker":"FVH5 Comdty","way":"SELL","nbContracts":461,"entryPrice":108.03}
    @PostMapping("/future")
    public ResponseEntity<Trade> createFuture(@RequestBody TradeCreateDto dto) {
        return ResponseEntity.ok(tradeService.createFutureTrade(dto));
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
    public ResponseEntity<Trade> cancel(@PathVariable Long id) {
        return ResponseEntity.ok(tradeService.cancelTrade(id));
    }
}
