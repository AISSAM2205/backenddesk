package ma.attijariwafa.desk_international.service;

import com.opencsv.CSVParserBuilder;
import com.opencsv.CSVReader;
import com.opencsv.CSVReaderBuilder;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import ma.attijariwafa.desk_international.dto.BoUploadResultDto;
import ma.attijariwafa.desk_international.entity.BoTrade;
import ma.attijariwafa.desk_international.repository.BoTradeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

/**
 * Importe le fichier Back Office (CSV) dans la table {@code bo_trade}.
 *
 * Format attendu (séparateur ';' ou ',', en-tête optionnel) :
 *   ISIN ; way(BUY/SELL) ; nominal ; cleanPrice ; tradeDate ; valueDate ; counterparty ; boRef
 *
 * Le prix peut être saisi en % du pair (101.47) ou en fraction (1.0147) : il est
 * normalisé en fraction pour être comparable au Front Office.
 *
 * Politique de snapshot : un import REMPLACE l'intégralité du jeu BO précédent
 * (un upload = un arrêté Back Office). Aucune accumulation, donc aucun faux match.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class BoCsvImportService {

    private final BoTradeRepository boRepo;

    private static final DateTimeFormatter FR = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    @Transactional
    public BoUploadResultDto ingest(MultipartFile file, String user) {
        long batchId = System.currentTimeMillis();
        int imported = 0;
        List<String> errors = new ArrayList<>();

        // Snapshot par arrêté : on purge le jeu BO précédent avant d'insérer.
        boRepo.deleteAllInBatch();

        char sep = detectSeparator(file);
        Charset charset = detectCharset(file);
        List<BoTrade> batch = new ArrayList<>();

        try (CSVReader reader = new CSVReaderBuilder(
                new InputStreamReader(file.getInputStream(), charset))
                .withCSVParser(new CSVParserBuilder().withSeparator(sep).build())
                .build()) {

            String[] row;
            boolean first = true;
            int line = 0;
            while ((row = reader.readNext()) != null) {
                line++;
                if (first) {
                    first = false;
                    if (looksLikeHeader(row)) continue;
                }
                if (isBlank(row)) continue;
                try {
                    batch.add(parse(row, batchId));
                    imported++;
                } catch (Exception e) {
                    errors.add("Ligne " + line + " : " + e.getMessage());
                }
            }
            boRepo.saveAll(batch);
        } catch (Exception e) {
            log.error("Lecture du fichier BO impossible", e);
            errors.add("Fichier illisible : " + e.getMessage());
        }

        return BoUploadResultDto.builder()
                .filename(file.getOriginalFilename())
                .imported(imported)
                .errors(errors.size())
                .batchId(batchId)
                .status(errors.isEmpty() ? "SUCCESS" : "PARTIAL")
                .errorMessages(errors)
                .build();
    }

    // ── Parsing d'une ligne ────────────────────────────────────────────────
    private BoTrade parse(String[] c, long batchId) {
        String isin = val(c, 0);
        String way  = val(c, 1);
        if (way != null) way = way.toUpperCase();
        if (!"BUY".equals(way) && !"SELL".equals(way))
            throw new IllegalArgumentException("sens invalide (BUY/SELL attendu)");

        BigDecimal nominal = num(val(c, 2));
        if (nominal == null) throw new IllegalArgumentException("nominal manquant");

        return BoTrade.builder()
                .isin(isin)
                .way(way)
                .nominal(nominal.abs())
                .cleanPrice(priceToFraction(num(val(c, 3))))
                .tradeDate(date(val(c, 4)))
                .valueDate(date(val(c, 5)))
                .counterparty(val(c, 6))
                .subAsset("Bond")
                .boRef(val(c, 7))
                .uploadBatchId(batchId)
                .build();
    }

    // % du pair (>5) → fraction. Déjà fraction sinon. 100 = puissance de 10 → division exacte.
    private static BigDecimal priceToFraction(BigDecimal p) {
        if (p == null) return null;
        return p.compareTo(BigDecimal.valueOf(5)) > 0 ? p.divide(BigDecimal.valueOf(100)) : p;
    }

    private static boolean looksLikeHeader(String[] r) {
        String j = String.join(",", r).toLowerCase();
        return j.contains("isin") || j.contains("way") || j.contains("sens") || j.contains("nominal");
    }

    private static boolean isBlank(String[] r) {
        for (String s : r) if (s != null && !s.isBlank()) return false;
        return true;
    }

    private static String val(String[] c, int i) {
        return (c.length > i && c[i] != null && !c[i].isBlank()) ? c[i].trim() : null;
    }

    private static BigDecimal num(String s) {
        if (s == null) return null;
        return new BigDecimal(s.replace(" ", "").replace(" ", "").replace(",", "."));
    }

    private static LocalDate date(String s) {
        if (s == null) return null;
        try { return LocalDate.parse(s, FR); } catch (Exception ignored) {}
        try { return LocalDate.parse(s); } catch (Exception ignored) {}
        return null;
    }

    private char detectSeparator(MultipartFile f) {
        try {
            String head = new String(f.getInputStream().readNBytes(512), StandardCharsets.UTF_8);
            long sc = head.chars().filter(ch -> ch == ';').count();
            long cc = head.chars().filter(ch -> ch == ',').count();
            return sc > cc ? ';' : ',';
        } catch (Exception e) {
            return ',';
        }
    }

    private Charset detectCharset(MultipartFile f) {
        try {
            byte[] bom = f.getInputStream().readNBytes(3);
            if (bom.length >= 3 && bom[0] == (byte) 0xEF && bom[1] == (byte) 0xBB && bom[2] == (byte) 0xBF)
                return StandardCharsets.UTF_8;
        } catch (Exception ignored) {}
        return StandardCharsets.UTF_8;
    }
}
