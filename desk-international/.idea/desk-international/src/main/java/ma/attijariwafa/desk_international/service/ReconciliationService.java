package ma.attijariwafa.desk_international.service;

import lombok.RequiredArgsConstructor;
import ma.attijariwafa.desk_international.dto.*;
import ma.attijariwafa.desk_international.entity.*;
import ma.attijariwafa.desk_international.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Moteur de réconciliation Front Office / Back Office.
 *
 * Confronte deux sources INDÉPENDANTES :
 *   - Front Office : trades ouverts de la table {@code trade} (le blotter du desk),
 *   - Back Office  : enregistrements de la table {@code bo_trade} (règlement/compta),
 * et produit :
 *   - un rapprochement au niveau TRADE (matched / diff / unmatched FO / unmatched BO),
 *   - un rapprochement au niveau POSITION (net par ISIN),
 *   - une synthèse KPI (taux de matching, notionnel en écart, écarts ouverts/résolus).
 *
 * Le workflow d'investigation est persisté ({@code recon_break_status}) et re-fusionné
 * sur les écarts recalculés via une clé déterministe.
 */
@Service
@RequiredArgsConstructor
public class ReconciliationService {

    private final TradeRepository           tradeRepo;
    private final BoTradeRepository          boRepo;
    private final InstrumentRepository       instrumentRepo;
    private final ReconBreakStatusRepository statusRepo;

    private static final BigDecimal BPS = BigDecimal.valueOf(10000);

    // ════════════════════════════════════════════════════════════════════════
    // RUN
    // ════════════════════════════════════════════════════════════════════════
    @Transactional
    public ReconResultDto run(LocalDate date, BigDecimal tolNominal, BigDecimal tolPriceBps) {
        if (tolNominal == null)  tolNominal  = BigDecimal.ZERO;
        if (tolPriceBps == null) tolPriceBps = BigDecimal.ONE;

        // Auto-seed démo : si aucun jeu BO n'a encore été importé, on en génère un
        // réaliste à partir du Front Office (matched + quelques écarts volontaires).
        if (boRepo.count() == 0) seedDemoBoFromFo();

        List<Trade>   foBonds  = foUniverse();
        List<BoTrade> boTrades = new ArrayList<>(boRepo.findAll());

        Map<String, ReconBreakStatus> statusMap = statusRepo.findAll().stream()
                .collect(Collectors.toMap(ReconBreakStatus::getBreakKey, s -> s, (a, b) -> a));
        Map<String, String> descCache = new HashMap<>();

        // ── Rapprochement TRADE (greedy one-to-one par isin + sens) ──────────
        List<BoTrade> pool = new ArrayList<>(boTrades);
        List<ReconTradeBreakDto> tradeRows = new ArrayList<>();

        for (Trade fo : foBonds) {
            String isin = fo.getIsin();
            String way  = up(fo.getWay());
            BoTrade best = null;
            BigDecimal bestDelta = null;
            for (BoTrade bo : pool) {
                if (isin == null || !isin.equalsIgnoreCase(bo.getIsin())) continue;
                if (!Objects.equals(way, up(bo.getWay()))) continue;
                BigDecimal d = nz(fo.getNominal()).subtract(nz(bo.getNominal())).abs();
                if (best == null || d.compareTo(bestDelta) < 0) {
                    best = bo;
                    bestDelta = d;
                }
            }
            if (best != null) {
                pool.remove(best);
                tradeRows.add(buildMatched(fo, best, tolNominal, tolPriceBps, statusMap, descCache));
            } else {
                tradeRows.add(buildUnmatchedFo(fo, statusMap, descCache));
            }
        }
        for (BoTrade bo : pool) {
            tradeRows.add(buildUnmatchedBo(bo, statusMap, descCache));
        }

        // ── Rapprochement POSITION (net par ISIN) ────────────────────────────
        Map<String, BigDecimal> foNet = new HashMap<>();
        for (Trade fo : foBonds)
            if (fo.getIsin() != null)
                foNet.merge(fo.getIsin(), signed(fo.getWay(), fo.getNominal()), BigDecimal::add);
        Map<String, BigDecimal> boNet = new HashMap<>();
        for (BoTrade bo : boTrades)
            if (bo.getIsin() != null)
                boNet.merge(bo.getIsin(), signed(bo.getWay(), bo.getNominal()), BigDecimal::add);

        Set<String> allIsins = new TreeSet<>();
        allIsins.addAll(foNet.keySet());
        allIsins.addAll(boNet.keySet());

        List<ReconPositionBreakDto> posRows = new ArrayList<>();
        int positionBreaks = 0;
        for (String isin : allIsins) {
            BigDecimal fN = foNet.getOrDefault(isin, BigDecimal.ZERO);
            BigDecimal bN = boNet.getOrDefault(isin, BigDecimal.ZERO);
            BigDecimal delta = fN.subtract(bN);
            boolean ok = delta.abs().compareTo(tolNominal) <= 0;
            if (!ok) positionBreaks++;
            String key = "P:" + isin;
            ReconBreakStatus st = statusMap.get(key);
            posRows.add(ReconPositionBreakDto.builder()
                    .breakKey(key)
                    .isin(isin)
                    .description(desc(isin, descCache))
                    .currency(currency(isin))
                    .foNet(fN)
                    .boNet(bN)
                    .deltaNominal(delta)
                    .matchType(ok ? "MATCHED" : "BREAK")
                    .status(st != null ? st.getStatus() : "OPEN")
                    .assignee(st != null ? st.getAssignee() : null)
                    .comment(st != null ? st.getComment() : null)
                    .build());
        }

        // ── Synthèse ─────────────────────────────────────────────────────────
        int matched = count(tradeRows, "MATCHED");
        int diff    = count(tradeRows, "MATCHED_WITH_DIFF");
        int unFo    = count(tradeRows, "UNMATCHED_FO");
        int unBo    = count(tradeRows, "UNMATCHED_BO");
        int total   = tradeRows.size();
        double rate  = total == 0 ? 100.0 : matched * 100.0 / total;

        BigDecimal notionalAtRisk = BigDecimal.ZERO;
        for (ReconTradeBreakDto r : tradeRows) {
            switch (r.getMatchType()) {
                case "MATCHED_WITH_DIFF" -> notionalAtRisk = notionalAtRisk.add(nz(r.getDeltaNominal()).abs());
                case "UNMATCHED_FO"      -> notionalAtRisk = notionalAtRisk.add(nz(r.getFoNominal()).abs());
                case "UNMATCHED_BO"      -> notionalAtRisk = notionalAtRisk.add(nz(r.getBoNominal()).abs());
                default -> { }
            }
        }

        List<String> breakStatuses = new ArrayList<>();
        tradeRows.stream().filter(r -> !"MATCHED".equals(r.getMatchType()))
                .forEach(r -> breakStatuses.add(r.getStatus()));
        posRows.stream().filter(r -> "BREAK".equals(r.getMatchType()))
                .forEach(r -> breakStatuses.add(r.getStatus()));
        int resolved = (int) breakStatuses.stream()
                .filter(s -> "RESOLVED".equals(s) || "FALSE_POSITIVE".equals(s)).count();
        int open = breakStatuses.size() - resolved;

        ReconSummaryDto summary = ReconSummaryDto.builder()
                .date(date)
                .runAt(LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME))
                .foCount(foBonds.size())
                .boCount(boTrades.size())
                .matched(matched)
                .matchedWithDiff(diff)
                .unmatchedFo(unFo)
                .unmatchedBo(unBo)
                .positionBreaks(positionBreaks)
                .matchRatePct(Math.round(rate * 100.0) / 100.0)
                .notionalAtRisk(notionalAtRisk.setScale(2, RoundingMode.HALF_UP))
                .openBreaks(open)
                .resolvedBreaks(resolved)
                .tolNominal(tolNominal)
                .tolPriceBps(tolPriceBps)
                .build();

        return ReconResultDto.builder()
                .summary(summary)
                .trades(tradeRows)
                .positions(posRows)
                .build();
    }

    // ════════════════════════════════════════════════════════════════════════
    // WORKFLOW
    // ════════════════════════════════════════════════════════════════════════
    @Transactional
    public ReconBreakStatus updateStatus(ReconStatusUpdateDto dto, String user) {
        if (dto == null || dto.getBreakKey() == null || dto.getBreakKey().isBlank())
            throw new IllegalArgumentException("breakKey requis");
        ReconBreakStatus st = statusRepo.findByBreakKey(dto.getBreakKey())
                .orElseGet(() -> ReconBreakStatus.builder().breakKey(dto.getBreakKey()).build());
        st.setStatus(dto.getStatus() == null ? "OPEN" : dto.getStatus().toUpperCase());
        st.setAssignee(dto.getAssignee());
        st.setComment(dto.getComment());
        st.setUpdatedBy(user);
        return statusRepo.save(st);
    }

    // ════════════════════════════════════════════════════════════════════════
    // SEED DÉMO (BO dérivé du FO, avec écarts volontaires)
    // ════════════════════════════════════════════════════════════════════════
    @Transactional
    public void seedDemoBoFromFo() {
        List<Trade> fo = foUniverse().stream()
                .filter(t -> t.getIsin() != null)
                .sorted(Comparator.comparing(t -> nz(t.getNominal())))
                .collect(Collectors.toList());
        if (fo.isEmpty()) return;

        long batch = System.currentTimeMillis();
        List<BoTrade> bo = new ArrayList<>();

        for (int i = 0; i < fo.size(); i++) {
            Trade t = fo.get(i);
            if (i == 0) continue;                          // omission → UNMATCHED_FO
            BigDecimal nominal = nz(t.getNominal());
            BigDecimal price   = t.getCleanPrice();
            if (i == 1 && price != null)                   // écart de prix (+20 bps)
                price = price.add(BigDecimal.valueOf(0.0020));
            if (i == 2)                                     // écart de quantité (+500k)
                nominal = nominal.add(BigDecimal.valueOf(500000));
            bo.add(BoTrade.builder()
                    .isin(t.getIsin())
                    .way(up(t.getWay()))
                    .nominal(nominal)
                    .cleanPrice(price)
                    .tradeDate(t.getTradeDate())
                    .valueDate(t.getValueDate())
                    .counterparty(t.getCounterparty())
                    .subAsset(t.getSubAsset())
                    .boRef("BO-" + t.getId())
                    .uploadBatchId(batch)
                    .build());
        }

        // Enregistrement BO « fantôme » : un ISIN actif non traité au FO → UNMATCHED_BO
        instrumentRepo.findAll().stream()
                .filter(in -> Boolean.TRUE.equals(in.getIsActive()))
                .map(Instrument::getIsin)
                .filter(isin -> fo.stream().noneMatch(t -> isin.equalsIgnoreCase(t.getIsin())))
                .findFirst()
                .ifPresent(isin -> bo.add(BoTrade.builder()
                        .isin(isin)
                        .way("BUY")
                        .nominal(BigDecimal.valueOf(5_000_000))
                        .cleanPrice(BigDecimal.ONE)
                        .tradeDate(LocalDate.now().minusDays(2))
                        .valueDate(LocalDate.now())
                        .counterparty("CITI")
                        .subAsset("Bond")
                        .boRef("BO-GHOST")
                        .uploadBatchId(batch)
                        .build()));

        boRepo.saveAll(bo);
    }

    // ════════════════════════════════════════════════════════════════════════
    // BUILDERS
    // ════════════════════════════════════════════════════════════════════════
    private ReconTradeBreakDto buildMatched(Trade fo, BoTrade bo, BigDecimal tolNom, BigDecimal tolBps,
                                            Map<String, ReconBreakStatus> sm, Map<String, String> dc) {
        BigDecimal dNom = nz(fo.getNominal()).subtract(nz(bo.getNominal()));
        BigDecimal dBps = priceDeltaBps(fo.getCleanPrice(), bo.getCleanPrice());
        boolean dateMis = !Objects.equals(fo.getTradeDate(), bo.getTradeDate());
        boolean nomOk = dNom.abs().compareTo(tolNom) <= 0;
        boolean pxOk  = dBps == null || dBps.abs().compareTo(tolBps) <= 0;
        boolean clean = nomOk && pxOk && !dateMis;

        List<String> reasons = new ArrayList<>();
        if (!nomOk)  reasons.add("écart nominal");
        if (!pxOk)   reasons.add("écart prix");
        if (dateMis) reasons.add("date trade");

        String key = "T:" + fo.getIsin() + ":" + up(fo.getWay()) + ":FO" + fo.getId() + ":BO" + bo.getId();
        ReconBreakStatus st = sm.get(key);

        return ReconTradeBreakDto.builder()
                .breakKey(key)
                .matchType(clean ? "MATCHED" : "MATCHED_WITH_DIFF")
                .isin(fo.getIsin()).description(descFromTrade(fo, dc)).subAsset(fo.getSubAsset()).way(up(fo.getWay()))
                .foId(fo.getId()).foNominal(fo.getNominal()).foCleanPrice(fo.getCleanPrice())
                .foTradeDate(fo.getTradeDate()).foValueDate(fo.getValueDate()).foCounterparty(fo.getCounterparty())
                .boId(bo.getId()).boNominal(bo.getNominal()).boCleanPrice(bo.getCleanPrice())
                .boTradeDate(bo.getTradeDate()).boValueDate(bo.getValueDate())
                .boCounterparty(bo.getCounterparty()).boRef(bo.getBoRef())
                .deltaNominal(dNom).deltaPriceBps(dBps).dateMismatch(dateMis)
                .breakReason(clean ? null : String.join(", ", reasons))
                .status(st != null ? st.getStatus() : "OPEN")
                .assignee(st != null ? st.getAssignee() : null)
                .comment(st != null ? st.getComment() : null)
                .build();
    }

    private ReconTradeBreakDto buildUnmatchedFo(Trade fo, Map<String, ReconBreakStatus> sm, Map<String, String> dc) {
        String key = "T:FO:" + fo.getId();
        ReconBreakStatus st = sm.get(key);
        return ReconTradeBreakDto.builder()
                .breakKey(key)
                .matchType("UNMATCHED_FO")
                .isin(fo.getIsin()).description(descFromTrade(fo, dc)).subAsset(fo.getSubAsset()).way(up(fo.getWay()))
                .foId(fo.getId()).foNominal(fo.getNominal()).foCleanPrice(fo.getCleanPrice())
                .foTradeDate(fo.getTradeDate()).foValueDate(fo.getValueDate()).foCounterparty(fo.getCounterparty())
                .breakReason("présent au Front Office, absent du Back Office")
                .status(st != null ? st.getStatus() : "OPEN")
                .assignee(st != null ? st.getAssignee() : null)
                .comment(st != null ? st.getComment() : null)
                .build();
    }

    private ReconTradeBreakDto buildUnmatchedBo(BoTrade bo, Map<String, ReconBreakStatus> sm, Map<String, String> dc) {
        String key = "T:BO:" + bo.getId();
        ReconBreakStatus st = sm.get(key);
        return ReconTradeBreakDto.builder()
                .breakKey(key)
                .matchType("UNMATCHED_BO")
                .isin(bo.getIsin()).description(desc(bo.getIsin(), dc)).subAsset(bo.getSubAsset()).way(up(bo.getWay()))
                .boId(bo.getId()).boNominal(bo.getNominal()).boCleanPrice(bo.getCleanPrice())
                .boTradeDate(bo.getTradeDate()).boValueDate(bo.getValueDate())
                .boCounterparty(bo.getCounterparty()).boRef(bo.getBoRef())
                .breakReason("présent au Back Office, absent du Front Office")
                .status(st != null ? st.getStatus() : "OPEN")
                .assignee(st != null ? st.getAssignee() : null)
                .comment(st != null ? st.getComment() : null)
                .build();
    }

    // ════════════════════════════════════════════════════════════════════════
    // HELPERS
    // ════════════════════════════════════════════════════════════════════════
    private List<Trade> foUniverse() {
        return tradeRepo.findOpenWithInstrument().stream()
                .filter(t -> t.getIsin() != null)
                .filter(t -> t.getSubAsset() == null || !t.getSubAsset().toLowerCase().contains("future"))
                .collect(Collectors.toList());
    }

    private static int count(List<ReconTradeBreakDto> rows, String type) {
        return (int) rows.stream().filter(r -> type.equals(r.getMatchType())).count();
    }

    private static BigDecimal priceDeltaBps(BigDecimal fo, BigDecimal bo) {
        if (fo == null || bo == null) return null;
        return fo.subtract(bo).multiply(BPS).setScale(2, RoundingMode.HALF_UP);
    }

    private static String up(String s) { return s == null ? null : s.toUpperCase(); }

    private static BigDecimal nz(BigDecimal v) { return v == null ? BigDecimal.ZERO : v; }

    private static BigDecimal signed(String way, BigDecimal nominal) {
        BigDecimal n = nz(nominal).abs();
        return "SELL".equalsIgnoreCase(way) ? n.negate() : n;
    }

    private String descFromTrade(Trade t, Map<String, String> cache) {
        String d = null;
        try { d = t.getDescription(); } catch (Exception ignored) { }
        if (d == null) return desc(t.getIsin(), cache);
        if (t.getIsin() != null) cache.putIfAbsent(t.getIsin(), d);
        return d;
    }

    private String desc(String isin, Map<String, String> cache) {
        if (isin == null) return null;
        return cache.computeIfAbsent(isin, k ->
                instrumentRepo.findById(k).map(Instrument::getDescription).orElse(null));
    }

    private String currency(String isin) {
        if (isin == null) return null;
        return instrumentRepo.findById(isin).map(Instrument::getCurrency).orElse(null);
    }
}
