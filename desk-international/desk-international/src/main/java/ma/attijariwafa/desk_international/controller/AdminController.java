package ma.attijariwafa.desk_international.controller;

import lombok.RequiredArgsConstructor;
import ma.attijariwafa.desk_international.entity.*;
import ma.attijariwafa.desk_international.repository.*;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Administration REST API.
 *
 * Traders    : GET/POST/PUT/DELETE /api/admin/traders
 *              GET/PUT              /api/admin/traders/{id}/limits
 * Instruments: GET                  /api/admin/instruments/{type}
 *              POST/PUT/DELETE      /api/admin/instruments
 * Limits     : GET/PUT              /api/admin/portfolio-limits
 * Audit      : GET                  /api/admin/audit
 */
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AppUserRepository        userRepo;
    private final TraderLimitRepository    traderLimitRepo;
    private final PortfolioLimitRepository portfolioLimitRepo;
    private final InstrumentRepository     instrumentRepo;
    private final AuditLogRepository       auditRepo;

    // ─── Role → default permissions mapping ──────────────────────────
    private static final Map<String, List<String>> ROLE_PERMS = Map.of(
        "ADMIN",    List.of("ADMIN", "EUROBOND_ACCESS", "CLN_ACCESS", "EGP_ACCESS", "BLOTTER_ACCESS"),
        "TRADER",   List.of("EUROBOND_ACCESS", "CLN_ACCESS", "EGP_ACCESS", "BLOTTER_ACCESS"),
        "READONLY", List.of("EUROBOND_ACCESS", "CLN_ACCESS", "EGP_ACCESS")
    );

    // ─────────────────────────────────────────────────────────────────
    // TRADERS
    // ─────────────────────────────────────────────────────────────────

    @GetMapping("/traders")
    public ResponseEntity<List<Map<String, Object>>> getTraders() {
        List<AppUser> users = userRepo.findAll();
        List<Map<String, Object>> result = users.stream()
            .map(u -> buildTraderDto(u, traderLimitRepo.findByUserId(u.getId())))
            .collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    @PostMapping("/traders")
    public ResponseEntity<Map<String, Object>> createTrader(@RequestBody Map<String, Object> dto) {
        BCryptPasswordEncoder enc = new BCryptPasswordEncoder();
        String firstName = str(dto, "firstName");
        String lastName  = str(dto, "lastName");
        String username  = str(dto, "username");
        String email     = str(dto, "email");
        String role      = resolveRole(dto);
        String status    = str(dto, "status");

        if (userRepo.existsByUsername(username)) {
            return ResponseEntity.badRequest().build();
        }

        AppUser user = AppUser.builder()
            .username(username)
            .email(email)
            .fullName((firstName + " " + lastName).trim())
            .role(role)
            .isActive(!"INACTIF".equals(status) && !"BLOQUE".equals(status))
            .passwordHash(enc.encode("AWB2025!"))
            .build();
        userRepo.save(user);
        return ResponseEntity.ok(buildTraderDto(user, Collections.emptyList()));
    }

    @PutMapping("/traders/{id}")
    public ResponseEntity<Map<String, Object>> updateTrader(
            @PathVariable Long id,
            @RequestBody Map<String, Object> dto) {

        return userRepo.findById(id).map(user -> {
            String firstName = str(dto, "firstName");
            String lastName  = str(dto, "lastName");
            if (!firstName.isEmpty() || !lastName.isEmpty()) {
                user.setFullName((firstName + " " + lastName).trim());
            }
            if (dto.containsKey("email"))  user.setEmail(str(dto, "email"));
            if (dto.containsKey("status")) {
                String s = str(dto, "status");
                user.setIsActive(!"INACTIF".equals(s) && !"BLOQUE".equals(s));
            }
            if (dto.containsKey("role") || dto.containsKey("permissions")) {
                user.setRole(resolveRole(dto));
            }
            userRepo.save(user);
            return ResponseEntity.ok(buildTraderDto(user, traderLimitRepo.findByUserId(user.getId())));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/traders/{id}")
    public ResponseEntity<Void> deleteTrader(@PathVariable Long id) {
        return userRepo.findById(id).map(user -> {
            user.setIsActive(false);
            userRepo.save(user);
            return ResponseEntity.ok().<Void>build();
        }).orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/traders/{id}/limits")
    public ResponseEntity<Map<String, Object>> getTraderLimits(@PathVariable Long id) {
        List<TraderLimit> limits = traderLimitRepo.findByUserId(id);
        return ResponseEntity.ok(limitsToMap(limits));
    }

    @PutMapping("/traders/{id}/limits")
    public ResponseEntity<Void> updateTraderLimits(
            @PathVariable Long id,
            @RequestBody Map<String, Object> dto) {

        userRepo.findById(id).orElse(null);
        traderLimitRepo.deleteByUserId(id);

        AppUser userRef = userRepo.getReferenceById(id);
        List<TraderLimit> newLimits = new ArrayList<>();

        for (Map.Entry<String, Object> e : dto.entrySet()) {
            String key = e.getKey().toUpperCase();
            @SuppressWarnings("unchecked")
            Map<String, Object> entry = (Map<String, Object>) e.getValue();
            BigDecimal limitAmt = bd(entry, "limit");
            BigDecimal usedAmt  = bd(entry, "used");
            String currency     = str(entry, "currency");
            if (currency.isEmpty()) currency = "USD";
            if (limitAmt != null) {
                newLimits.add(TraderLimit.builder()
                    .user(userRef)
                    .instrumentType(key)
                    .limitAmount(limitAmt)
                    .usedAmount(usedAmt != null ? usedAmt : BigDecimal.ZERO)
                    .currency(currency)
                    .build());
            }
        }
        traderLimitRepo.saveAll(newLimits);
        return ResponseEntity.ok().build();
    }

    // ─────────────────────────────────────────────────────────────────
    // INSTRUMENTS (admin-level CRUD)
    // ─────────────────────────────────────────────────────────────────

    @GetMapping("/instruments/{type}")
    public ResponseEntity<List<Map<String, Object>>> getInstrumentsByType(@PathVariable String type) {
        String pattern = switch (type.toLowerCase()) {
            case "eurobonds" -> "Bond";
            case "cln"       -> "CLN";
            case "egp"       -> "EGP";
            default          -> null;
        };
        if (pattern == null) return ResponseEntity.badRequest().build();
        final String p = pattern;
        List<Map<String, Object>> list = instrumentRepo.findAll().stream()
            .filter(i -> Boolean.TRUE.equals(i.getIsActive()) && i.getSubAsset().contains(p))
            .map(i -> instrumentToFrontend(i, type))
            .collect(Collectors.toList());
        return ResponseEntity.ok(list);
    }

    @PostMapping("/instruments")
    public ResponseEntity<Instrument> createInstrument(@RequestBody Map<String, Object> dto) {
        Instrument inst = mapToInstrument(null, dto);
        if (inst == null || inst.getIsin() == null || inst.getIsin().isBlank())
            return ResponseEntity.badRequest().build();
        if (instrumentRepo.existsById(inst.getIsin()))
            return ResponseEntity.badRequest().build();
        return ResponseEntity.ok(instrumentRepo.save(inst));
    }

    @PutMapping("/instruments/{isin}")
    public ResponseEntity<Instrument> updateInstrument(
            @PathVariable String isin,
            @RequestBody Map<String, Object> dto) {
        return instrumentRepo.findById(isin).map(existing -> {
            Instrument updated = mapToInstrument(existing, dto);
            return ResponseEntity.ok(instrumentRepo.save(updated));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/instruments/{isin}")
    public ResponseEntity<Void> deleteInstrument(@PathVariable String isin) {
        return instrumentRepo.findById(isin).map(i -> {
            i.setIsActive(false);
            instrumentRepo.save(i);
            return ResponseEntity.ok().<Void>build();
        }).orElse(ResponseEntity.notFound().build());
    }

    // ─────────────────────────────────────────────────────────────────
    // PORTFOLIO LIMITS (regulatory limits + annual targets)
    // ─────────────────────────────────────────────────────────────────

    @GetMapping("/portfolio-limits")
    public ResponseEntity<List<PortfolioLimit>> getPortfolioLimits() {
        return ResponseEntity.ok(portfolioLimitRepo.findByIsActiveTrueOrderByPortfolioName());
    }

    @PutMapping("/portfolio-limits/{id}")
    public ResponseEntity<PortfolioLimit> updatePortfolioLimit(
            @PathVariable Long id,
            @RequestBody Map<String, Object> dto) {
        return portfolioLimitRepo.findById(id).map(lim -> {
            if (dto.containsKey("limitMeur")) {
                Object v = dto.get("limitMeur");
                lim.setLimitMeur(v instanceof Number ? BigDecimal.valueOf(((Number)v).doubleValue()) : new BigDecimal(v.toString()));
            }
            if (dto.containsKey("maxDurationYears")) {
                Object v = dto.get("maxDurationYears");
                lim.setMaxDurationYears(v instanceof Number ? BigDecimal.valueOf(((Number)v).doubleValue()) : new BigDecimal(v.toString()));
            }
            return ResponseEntity.ok(portfolioLimitRepo.save(lim));
        }).orElse(ResponseEntity.notFound().build());
    }

    // ─────────────────────────────────────────────────────────────────
    // AUDIT LOG
    // ─────────────────────────────────────────────────────────────────

    @GetMapping("/audit")
    public ResponseEntity<List<AuditLog>> getAuditLog() {
        return ResponseEntity.ok(auditRepo.findTop50ByOrderByCreatedAtDesc());
    }

    // ─────────────────────────────────────────────────────────────────
    // Private helpers
    // ─────────────────────────────────────────────────────────────────

    private Map<String, Object> buildTraderDto(AppUser u, List<TraderLimit> limits) {
        String fn = u.getFullName() != null ? u.getFullName() : "";
        String[] parts = fn.split(" ", 2);
        Map<String, Object> dto = new LinkedHashMap<>();
        dto.put("id",          u.getId());
        dto.put("firstName",   parts.length > 0 ? parts[0] : "");
        dto.put("lastName",    parts.length > 1 ? parts[1] : "");
        dto.put("name",        fn);
        dto.put("username",    u.getUsername());
        dto.put("email",       u.getEmail());
        dto.put("role",        u.getRole());
        dto.put("department",  "FIXED_INCOME");
        dto.put("status",      Boolean.TRUE.equals(u.getIsActive()) ? "ACTIF" : "INACTIF");
        dto.put("permissions", ROLE_PERMS.getOrDefault(u.getRole(), Collections.emptyList()));
        dto.put("createdAt",   u.getCreatedAt() != null ? u.getCreatedAt().toLocalDate().toString() : "");
        dto.put("limits",      limitsToMap(limits));
        return dto;
    }

    private Map<String, Object> limitsToMap(List<TraderLimit> limits) {
        Map<String, Object> map = new LinkedHashMap<>();
        for (TraderLimit l : limits) {
            String key = l.getInstrumentType().toLowerCase();
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("limit",    l.getLimitAmount());
            entry.put("currency", l.getCurrency());
            entry.put("used",     l.getUsedAmount());
            map.put(key, entry);
        }
        return map;
    }

    private String resolveRole(Map<String, Object> dto) {
        if (dto.containsKey("role")) {
            String r = str(dto, "role").toUpperCase();
            if (r.equals("ADMIN") || r.equals("READONLY") || r.equals("TRADER")) return r;
        }
        @SuppressWarnings("unchecked")
        List<String> perms = dto.containsKey("permissions") ? (List<String>) dto.get("permissions") : Collections.emptyList();
        if (perms.contains("ADMIN")) return "ADMIN";
        return "TRADER";
    }

    private Map<String, Object> instrumentToFrontend(Instrument i, String type) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("isin",        i.getIsin());
        m.put("description", i.getDescription());
        m.put("issuer",      i.getIssuer());
        m.put("currency",    i.getCurrency());
        m.put("maturity",    i.getMaturityDate() != null ? i.getMaturityDate().toString() : null);
        m.put("coupon",      i.getCouponRate());
        m.put("subAsset",    i.getSubAsset());
        if ("cln".equals(type)) {
            m.put("id",       i.getIsin());
            m.put("reference",i.getIssuer());
            m.put("region",   i.getSubAsset().contains("MOROC") ? "MOROC" : "GCC");
            m.put("premium",  i.getCouponRate());
            m.put("spread",   0);
        }
        if ("egp".equals(type)) {
            m.put("id",           i.getIsin());
            m.put("yield",        i.getCouponRate());
            m.put("duration_days", 182);
        }
        return m;
    }

    private Instrument mapToInstrument(Instrument existing, Map<String, Object> dto) {
        Instrument i = existing != null ? existing : new Instrument();
        if (dto.containsKey("isin"))           i.setIsin(str(dto, "isin"));
        if (dto.containsKey("description"))    i.setDescription(str(dto, "description"));
        if (dto.containsKey("issuer"))         i.setIssuer(str(dto, "issuer"));
        if (dto.containsKey("currency"))       i.setCurrency(str(dto, "currency"));
        if (dto.containsKey("subAsset"))       i.setSubAsset(str(dto, "subAsset"));
        if (dto.containsKey("coupon"))         i.setCouponRate(bd(dto, "coupon"));
        if (dto.containsKey("couponRate"))     i.setCouponRate(bd(dto, "couponRate"));
        if (dto.containsKey("maturity")) {
            String d = str(dto, "maturity");
            if (!d.isEmpty()) i.setMaturityDate(LocalDate.parse(d));
        }
        if (i.getCouponFrequency() == null)    i.setCouponFrequency((short)2);
        if (i.getIsActive() == null)           i.setIsActive(true);
        return i;
    }

    private static String str(Map<String, Object> m, String key) {
        Object v = m.get(key);
        return v != null ? v.toString().trim() : "";
    }

    private static BigDecimal bd(Map<String, Object> m, String key) {
        Object v = m.get(key);
        if (v == null) return null;
        try { return v instanceof Number ? BigDecimal.valueOf(((Number)v).doubleValue()) : new BigDecimal(v.toString()); }
        catch (Exception e) { return null; }
    }
}
