package ma.attijariwafa.desk_international.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import ma.attijariwafa.desk_international.entity.*;
import ma.attijariwafa.desk_international.repository.*;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;
import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;
import ma.attijariwafa.desk_international.repository.TBillPositionRepository;

/**
 * Charge des données Bloomberg réalistes au démarrage de l'application.
 * Idempotent : skip si la table instrument n'est pas vide.
 * Remplacer par un vrai connecteur Bloomberg quand disponible.
 */
@Slf4j
@Component
@Order(1)
@RequiredArgsConstructor
public class BloombergMockDataLoader implements ApplicationRunner {

    private final InstrumentRepository              instrumentRepo;
    private final MarketRatesRepository             marketRatesRepo;
    private final MarketDataRepository              marketDataRepo;
    private final RiskMetricsRepository             riskMetricsRepo;
    private final PricingConfigRepository           pricingConfigRepo;
    private final TradeRepository                   tradeRepo;
    private final CouponReceivedRepository          couponRepo;
    private final AppUserRepository                 userRepo;
    private final PortfolioLimitRepository          limitRepo;
    private final TraderLimitRepository             traderLimitRepo;
    private final PnlDailyRepository                pnlDailyRepo;
    private final TBillPositionRepository           tbillRepo;
    private final ExternalPnlSnapshotRepository     extSnapshotRepo;
    private final AuditLogRepository                auditLogRepo;
    private final JdbcTemplate                      jdbcTemplate;

    @Override
    public void run(ApplicationArguments args) {
        LocalDate today = LocalDate.now();
        boolean todayDataExists = !marketDataRepo.findByDataDateOrderByInstrumentIsin(today).isEmpty();
        if (todayDataExists) {
            log.info("[Bloomberg Mock] Données du jour ({}) déjà présentes — skip.", today);
            return;
        }
        log.info("[Bloomberg Mock] Chargement données de démonstration pour {}...", today);
        // Purge all existing data to avoid duplicate key errors on re-seed
        auditLogRepo.deleteAll();
        extSnapshotRepo.deleteAll();
        pnlDailyRepo.deleteAll();
        couponRepo.deleteAll();
        tradeRepo.deleteAll();
        riskMetricsRepo.deleteAll();
        marketDataRepo.deleteAll();
        marketRatesRepo.deleteAll();
        pricingConfigRepo.deleteAll();
        traderLimitRepo.deleteAll();
        limitRepo.deleteAll();
        tbillRepo.deleteAll();
        instrumentRepo.deleteAll();
        Map<String, Instrument> ins = seedInstruments(today);
        seedUsers();
        seedLimits(today);
        seedTraderLimits();
        seedMarketRates(today);
        seedMarketData(ins, today);
        seedRiskMetrics(ins, today);
        seedPricingConfig(ins, today);
        seedBondTrades(ins, today);
        seedFuturesTrades();
        seedCoupons(ins);
        seedPnlDaily(today);
        seedTBills(today);
        seedExternalSnapshots(today);
        seedAuditLog(today);
        log.info("[Bloomberg Mock] ✓ 11 instruments · 13 trades · 15 coupons · 3 T-Bills · 8 limits · 5 traders · external snapshots · 12 audit logs chargés.");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 1. INSTRUMENTS
    // ─────────────────────────────────────────────────────────────────────────
    private Map<String, Instrument> seedInstruments(LocalDate today) {
        List<Instrument> list = List.of(
            inst("XS2595028452", "MOROC 5.95 07/22/2031",    "MOROCCO",  "USD", "Mor Bond", "5.9500", (short)2, LocalDate.of(2031,7,22),  LocalDate.of(2021,7,22),  1_500_000_000L),
            inst("XS2080771806", "MOROC 3.00 03/15/2032",    "MOROCCO",  "USD", "Mor Bond", "3.0000", (short)2, LocalDate.of(2032,3,15),  LocalDate.of(2020,2,27),  1_000_000_000L),
            inst("XS2368905890", "MOROC 4.00 12/15/2050",    "MOROCCO",  "USD", "Mor Bond", "4.0000", (short)2, LocalDate.of(2050,12,15), LocalDate.of(2020,12,14), 1_000_000_000L),
            inst("XS2189848XT7", "MOROC 1.375 04/04/2030",   "MOROCCO",  "EUR", "Mor Bond", "1.3750", (short)1, LocalDate.of(2030,4,4),  LocalDate.of(2021,4,8),    750_000_000L),
            inst("XS2337058901", "OCP 3.75 06/23/2031",      "OCP SA",   "USD", "OCP Bond", "3.7500", (short)2, LocalDate.of(2031,6,23),  LocalDate.of(2021,6,9),    700_000_000L),
            inst("XS1743523562", "OCP 5.625 04/25/2048",     "OCP SA",   "USD", "OCP Bond", "5.6250", (short)2, LocalDate.of(2048,4,25),  LocalDate.of(2018,4,25),   500_000_000L),
            inst("XS2398769001", "MOROC 3.50 09/16/2031",    "MOROCCO",  "EUR", "Mor Bond", "3.5000", (short)1, LocalDate.of(2031,9,16),  LocalDate.of(2021,9,16),  1_000_000_000L),
            inst("XS2400000001", "CLN MOROC 5.00 05/15/2027","AWB DESK",     "USD", "CLN MOROC","5.0000", (short)2, LocalDate.of(2027,5,15),  LocalDate.of(2024,5,15),   100_000_000L),
            inst("XS2500000002", "CLN SAUDI ARAMCO 4.75 2028","SAUDI ARAMCO","USD", "CLN GCC",  "4.7500", (short)2, LocalDate.of(2028,3,20),  LocalDate.of(2025,3,20),   500_000_000L),
            inst("EG0000123456", "EGP T-Bill 91J",            "EGYPT",        "EGP", "EGP Bill", "0.0000", (short)4, today.plusDays(61),       today.minusDays(30),       500_000_000L),
            inst("EG0000654321", "EGP T-Bill 182J",           "EGYPT",        "EGP", "EGP Bill", "0.0000", (short)2, today.plusDays(152),      today.minusDays(30),       300_000_000L)
        );
        List<Instrument> saved = instrumentRepo.saveAll(list);
        Map<String, Instrument> map = new LinkedHashMap<>();
        saved.forEach(i -> map.put(i.getIsin(), i));
        return map;
    }

    private static Instrument inst(String isin, String desc, String issuer, String ccy, String sub,
                                    String rate, short freq, LocalDate mat, LocalDate iss, long out) {
        return Instrument.builder()
                .isin(isin).description(desc).issuer(issuer).currency(ccy).subAsset(sub)
                .couponRate(new BigDecimal(rate)).couponFrequency(freq)
                .maturityDate(mat).issueDate(iss).nominalOutstanding(out).isActive(true).build();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. USERS
    // ─────────────────────────────────────────────────────────────────────────
    private void seedUsers() {
        Set<String> existing = userRepo.findAll().stream()
                .map(AppUser::getUsername).collect(Collectors.toSet());
        BCryptPasswordEncoder enc = new BCryptPasswordEncoder();
        List<AppUser> candidates = List.of(
            AppUser.builder().username("trader").email("trader@attijariwafa.ma")
                .passwordHash(enc.encode("AWB2025!")).role("TRADER")
                .fullName("Desk Trader International").isActive(true).build(),
            AppUser.builder().username("admin").email("admin@attijariwafa.ma")
                .passwordHash(enc.encode("Admin2025!")).role("ADMIN")
                .fullName("Administrateur Système").isActive(true).build(),
            AppUser.builder().username("direction").email("direction@attijariwafa.ma")
                .passwordHash(enc.encode("AWB2025!")).role("READONLY")
                .fullName("Direction Financière").isActive(true).build(),
            AppUser.builder().username("maitif").email("m.aitif@attijariwafa.ma")
                .passwordHash(enc.encode("AWB2025!")).role("TRADER")
                .fullName("Mohamed Aitif").isActive(true).build(),
            AppUser.builder().username("hbenali").email("h.benali@attijariwafa.ma")
                .passwordHash(enc.encode("AWB2025!")).role("TRADER")
                .fullName("Hassan Benali").isActive(true).build()
        );
        List<AppUser> toInsert = candidates.stream()
                .filter(u -> !existing.contains(u.getUsername()))
                .collect(Collectors.toList());
        if (!toInsert.isEmpty()) userRepo.saveAll(toInsert);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. PORTFOLIO LIMITS (exposure) + ANNUAL TARGETS
    // ─────────────────────────────────────────────────────────────────────────
    private void seedLimits(LocalDate today) {
        LocalDate eff = LocalDate.of(today.getYear(), 1, 1);
        limitRepo.saveAll(List.of(
            // Regulatory exposure limits
            lim("Eurobonds (EUR)", "EXPOSURE", "EUR", "EUROBONDS", "var(--eb)",  "280.00", "7.00", eff),
            lim("CLN Maroc (USD)", "EXPOSURE", "USD", "CLN_MOROC", "var(--cln)", "50.00",  "5.00", eff),
            lim("CLN GCC (USD)",   "EXPOSURE", "USD", "CLN_GCC",   "#7C3AED",    "30.00",  "5.00", eff),
            lim("EGP Bills (USD)", "EXPOSURE", "USD", "EGP_BILLS", "var(--egp)", "20.00",  "1.00", eff),
            // Annual P&L targets (USD millions)
            lim("Eurobond Maroc",  "TARGET",   "USD", "MOROC",     "var(--eb)",  "35.00",  null,   eff),
            lim("Eurobond OCP",    "TARGET",   "USD", "OCP",       "#9B3EEF",    "15.00",  null,   eff),
            lim("CLN",             "TARGET",   "USD", "CLN",       "var(--cln)", "24.00",  null,   eff),
            lim("EGP Bills",       "TARGET",   "USD", "EGP",       "var(--egp)", "60.00",  null,   eff)
        ));
    }

    private static PortfolioLimit lim(String name, String type, String ccy, String cat, String color,
                                       String amount, String dur, LocalDate eff) {
        return PortfolioLimit.builder()
            .portfolioName(name).limitType(type).currency(ccy).category(cat).colorToken(color)
            .limitMeur(new BigDecimal(amount))
            .maxDurationYears(dur != null ? new BigDecimal(dur) : null)
            .effectiveDate(eff).isActive(true).build();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3b. PER-TRADER LIMITS (all users, with realistic used_amount from positions)
    //
    // Exposed amounts derived from seeded trades:
    //   EUROBONDS EUR: XS2189848XT7 10M EUR + XS2398769001 8M EUR = 18 000 000 EUR
    //   CLN_MOROC USD: XS2400000001 3 000 000 USD
    //   EGP USD equiv: EG0000123456 50M EGP / 48.85 ≈ 1 023 541 USD
    // ─────────────────────────────────────────────────────────────────────────
    private void seedTraderLimits() {
        // "trader" — lead trader, carries EUR bond book + CLN + EGP
        userRepo.findByUsernameAndIsActiveTrue("trader").ifPresent(u ->
            traderLimitRepo.saveAll(List.of(
                tl(u, "EUROBONDS", "50000000",  "18000000", "EUR"),
                tl(u, "CLN_MOROC", "20000000",  "3000000",  "USD"),
                tl(u, "CLN_GCC",   "15000000",  "0",        "USD"),
                tl(u, "EGP",       "10000000",  "1023541",  "USD")
            ))
        );
        // "maitif" — senior trader, manages most of the USD bond book
        userRepo.findByUsernameAndIsActiveTrue("maitif").ifPresent(u ->
            traderLimitRepo.saveAll(List.of(
                tl(u, "EUROBONDS", "80000000",  "43460000", "EUR"),
                tl(u, "CLN_MOROC", "25000000",  "3000000",  "USD"),
                tl(u, "CLN_GCC",   "20000000",  "0",        "USD"),
                tl(u, "EGP",       "10000000",  "0",        "USD")
            ))
        );
        // "hbenali" — junior trader, small USD book + EGP follow-up
        userRepo.findByUsernameAndIsActiveTrue("hbenali").ifPresent(u ->
            traderLimitRepo.saveAll(List.of(
                tl(u, "EUROBONDS", "30000000",  "8000000",  "EUR"),
                tl(u, "CLN_MOROC", "10000000",  "0",        "USD"),
                tl(u, "CLN_GCC",   "10000000",  "0",        "USD"),
                tl(u, "EGP",       "5000000",   "1023541",  "USD")
            ))
        );
        // "admin" — admin oversight limits (aggregated view)
        userRepo.findByUsernameAndIsActiveTrue("admin").ifPresent(u ->
            traderLimitRepo.saveAll(List.of(
                tl(u, "EUROBONDS", "280000000", "109460000","EUR"),
                tl(u, "CLN_MOROC", "50000000",  "3000000",  "USD"),
                tl(u, "CLN_GCC",   "30000000",  "0",        "USD"),
                tl(u, "EGP",       "20000000",  "2047082",  "USD")
            ))
        );
        // "direction" has no trading limits — READONLY user
    }

    private static TraderLimit tl(AppUser user, String type, String limit, String used, String ccy) {
        return TraderLimit.builder()
            .user(user).instrumentType(type)
            .limitAmount(new BigDecimal(limit))
            .usedAmount(new BigDecimal(used))
            .currency(ccy).build();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 4. MARKET RATES (45 business days back so any history query finds data)
    // ─────────────────────────────────────────────────────────────────────────
    private void seedMarketRates(LocalDate today) {
        List<MarketRates> list = new ArrayList<>();
        LocalDate d = today;
        int count = 0;
        while (count < 45) {
            if (d.getDayOfWeek() != DayOfWeek.SATURDAY && d.getDayOfWeek() != DayOfWeek.SUNDAY) {
                list.add(MarketRates.builder()
                        .rateDate(d)
                        .eurMad(new BigDecimal("10.889100"))
                        .usdMad(new BigDecimal("10.034700"))
                        .eurUsd(new BigDecimal("1.085100"))
                        .estrRate(new BigDecimal("3.9000"))   // stocké en % : 3.90%
                        .sofrRate(new BigDecimal("5.3300"))   // stocké en % : 5.33%
                        .usdEgp(new BigDecimal("48.850000"))
                        .cbeRate(new BigDecimal("27.2500"))   // taux directeur CBE, en % : 27.25%
                        .shockBps(10).build());
                count++;
            }
            d = d.minusDays(1);
        }
        marketRatesRepo.saveAll(list);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 5. MARKET DATA  (today only — PnlService fallback handles older dates)
    // ─────────────────────────────────────────────────────────────────────────
    private void seedMarketData(Map<String, Instrument> ins, LocalDate today) {
        //                      isin              pxMid       accrued      pxBid       pxAsk       gBid   gAsk   iBid   iAsk
        List<MarketData> list = List.of(
            md(ins.get("XS2595028452"), today, "1.027500","0.020880","1.020025","1.015025","141.0","131.0","122.0","112.0"),
            md(ins.get("XS2080771806"), today, "0.874500","0.011250","0.868250","0.863250","185.0","177.0","162.0","154.0"),
            md(ins.get("XS2368905890"), today, "0.712500","0.006670","0.706250","0.700250","225.0","217.0","198.0","190.0"),
            md(ins.get("XS2189848XT7"), today, "0.896300","0.003060","0.891300","0.886300","120.0","112.0","105.0","097.0"),
            md(ins.get("XS2337058901"), today, "0.925000","0.010420","0.919000","0.913500","195.0","185.0","170.0","160.0"),
            md(ins.get("XS1743523562"), today, "0.947500","0.023440","0.941500","0.935500","235.0","225.0","208.0","198.0"),
            md(ins.get("XS2398769001"), today, "0.938500","0.011270","0.933000","0.927500","145.0","137.0","128.0","120.0"),
            md(ins.get("XS2400000001"), today, "1.012500","0.012500","1.007500","1.002000","155.0","145.0","138.0","128.0"),
            md(ins.get("XS2500000002"), today, "1.005000","0.011875","0.999500","0.994000","188.0","178.0","162.0","152.0"),
            md(ins.get("EG0000123456"), today, "0.985900","0.000000","0.984900","0.983900","0.0",  "0.0",  "0.0",  "0.0"),
            md(ins.get("EG0000654321"), today, "0.972000","0.000000","0.971000","0.970000","0.0",  "0.0",  "0.0",  "0.0")
        );
        marketDataRepo.saveAll(list);
    }

    private static MarketData md(Instrument inst, LocalDate date,
                                  String pxMid, String accr, String bid, String ask,
                                  String gBid, String gAsk, String iBid, String iAsk) {
        return MarketData.builder().instrument(inst).dataDate(date)
                .pxMid(new BigDecimal(pxMid)).pxLast(new BigDecimal(pxMid))
                .accruedBloomberg(new BigDecimal(accr))
                .pxBidAwb(new BigDecimal(bid)).pxAskAwb(new BigDecimal(ask))
                .gSpreadBid(new BigDecimal(gBid)).gSpreadAsk(new BigDecimal(gAsk))
                .iSpreadBid(new BigDecimal(iBid)).iSpreadAsk(new BigDecimal(iAsk)).build();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 6. RISK METRICS
    // ─────────────────────────────────────────────────────────────────────────
    private void seedRiskMetrics(Map<String, Instrument> ins, LocalDate today) {
        // modDur   dv01PerM  ytm(%)   hedge   ctdIsin         durCtd   convFact  contractSize  convexity
        List<RiskMetrics> list = List.of(
            rm(ins.get("XS2595028452"), today,"2.795300","5.320000","5.7200","FVZ5","US91282CME36","4.230000","0.936300",100000,"9.50"),
            rm(ins.get("XS2080771806"), today,"5.314200","7.971300","6.1400","TYZ5","US91282CKT73","8.210000","0.721400",100000,"36.50"),
            rm(ins.get("XS2368905890"), today,"14.23000","7.115000","6.1500","TYZ5","US91282CKT73","8.210000","0.721400",100000,"285.0"),
            rm(ins.get("XS2189848XT7"), today,"3.950000","3.950000","4.4500","RXZ5","DE0001102580","6.120000","0.887500",100000,"18.50"),
            rm(ins.get("XS2337058901"), today,"4.620000","4.620000","5.9900","FVZ5","US91282CME36","4.230000","0.936300",100000,"27.00"),
            rm(ins.get("XS1743523562"), today,"13.05000","3.915000","6.0100","TYZ5","US91282CKT73","8.210000","0.721400",100000,"218.0"),
            rm(ins.get("XS2398769001"), today,"4.720000","3.776000","4.5800","RXZ5","DE0001102580","6.120000","0.887500",100000,"27.50"),
            rm(ins.get("XS2400000001"), today,"1.250000","0.375000","4.6500", null,  null,           null,      null,     100000,"1.80"),
            rm(ins.get("XS2500000002"), today,"1.680000","0.504000","5.1200", null,  null,           null,      null,     100000,"3.20"),
            rm(ins.get("EG0000123456"), today,"0.240000","0.012000","24.500", null,  null,           null,      null,     100000,"0.07"),
            rm(ins.get("EG0000654321"), today,"0.470000","0.014100","25.000", null,  null,           null,      null,     100000,"0.25")
        );
        riskMetricsRepo.saveAll(list);
    }

    private static RiskMetrics rm(Instrument inst, LocalDate date,
                                   String modDur, String dv01PerM,
                                   String ytm,        // en % : ex "5.7200" pour 5.72%
                                   String hedgeFut, String ctdIsin,
                                   String durCtd, String convFact, int contractSize,
                                   String convexity) {
        return RiskMetrics.builder().instrument(inst).metricsDate(date)
                .modifiedDuration(new BigDecimal(modDur))
                .dv01PerMillion(new BigDecimal(dv01PerM))
                .ytmMid(new BigDecimal(ytm))
                .hedgeFuture(hedgeFut).ctdIsin(ctdIsin)
                .durationCtd(durCtd    != null ? new BigDecimal(durCtd)    : null)
                .convFactor( convFact  != null ? new BigDecimal(convFact)  : null)
                .contractSize(contractSize)
                .convexity(convexity   != null ? new BigDecimal(convexity) : null)
                .build();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 7. PRICING CONFIG
    // ─────────────────────────────────────────────────────────────────────────
    private void seedPricingConfig(Map<String, Instrument> ins, LocalDate today) {
        //                        isin               gBid    gAsk   histAvg  target  decision
        List<PricingConfig> list = List.of(
            pc(ins.get("XS2595028452"), today, "141.0","131.0","136.0","130.0","BUY"),
            pc(ins.get("XS2080771806"), today, "185.0","177.0","181.0","175.0","BUY"),
            pc(ins.get("XS2368905890"), today, "225.0","217.0","221.0","215.0","BUY"),
            pc(ins.get("XS2189848XT7"), today, "120.0","112.0","116.0","118.0","HOLD"),
            pc(ins.get("XS2337058901"), today, "195.0","185.0","190.0","185.0","BUY"),
            pc(ins.get("XS1743523562"), today, "235.0","225.0","230.0","225.0","BUY"),
            pc(ins.get("XS2398769001"), today, "145.0","137.0","141.0","148.0","HOLD"),
            pc(ins.get("XS2400000001"), today, "155.0","145.0","150.0","148.0","BUY"),
            pc(ins.get("XS2500000002"), today, "188.0","178.0","183.0","180.0","HOLD"),
            pc(ins.get("EG0000123456"), today,   "0.0",  "0.0",  "0.0",  "0.0","HOLD"),
            pc(ins.get("EG0000654321"), today,   "0.0",  "0.0",  "0.0",  "0.0","HOLD")
        );
        pricingConfigRepo.saveAll(list);
    }

    private static PricingConfig pc(Instrument inst, LocalDate date,
                                     String gBid, String gAsk, String hist, String target, String dec) {
        return PricingConfig.builder().instrument(inst).configDate(date)
                .gSpreadBid(new BigDecimal(gBid)).gSpreadAsk(new BigDecimal(gAsk))
                .historicalAvgSpread(new BigDecimal(hist)).targetSpread(new BigDecimal(target))
                .decision(dec).shockBps(10).build();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 8. BOND TRADES  (establish positions visible in v_position view)
    // ─────────────────────────────────────────────────────────────────────────
    private void seedBondTrades(Map<String, Instrument> ins, LocalDate today) {
        List<Trade> trades = new ArrayList<>();

        // MOROC 5.95 2031 — two BUY legs → total 73 460 000 USD
        // wapDirty trade 2 = (50M×1.030299 + 23.46M×1.036250) / 73.46M = 1.032185
        trades.add(bond(ins.get("XS2595028452"), LocalDate.of(2024,1,15), LocalDate.of(2024,1,17),
                "BUY","50000000","1.001361","0.028938","1.030299","1.030299","141.00","Société Générale"));
        trades.add(bond(ins.get("XS2595028452"), LocalDate.of(2024,6,5),  LocalDate.of(2024,6,7),
                "BUY","23460000","1.014750","0.021500","1.036250","1.032185","139.50","Deutsche Bank"));

        // MOROC 3.00 2032 — 15 000 000 USD
        trades.add(bond(ins.get("XS2080771806"), LocalDate.of(2024,2,20), LocalDate.of(2024,2,22),
                "BUY","15000000","0.872500","0.007500","0.880000","0.880000","180.00","JPMorgan"));

        // MOROC 4.00 2050 — 5 000 000 USD
        trades.add(bond(ins.get("XS2368905890"), LocalDate.of(2024,4,10), LocalDate.of(2024,4,12),
                "BUY","5000000","0.703333","0.006667","0.710000","0.710000","220.00","BNP Paribas"));

        // MOROC 1.375 2030 EUR — 10 000 000 EUR
        trades.add(bond(ins.get("XS2189848XT7"), LocalDate.of(2024,3,12), LocalDate.of(2024,3,14),
                "BUY","10000000","0.886937","0.003063","0.890000","0.890000","118.00","Citibank"));

        // OCP 3.75 2031 — 10 000 000 USD
        trades.add(bond(ins.get("XS2337058901"), LocalDate.of(2024,5,8),  LocalDate.of(2024,5,10),
                "BUY","10000000","0.919583","0.010417","0.930000","0.930000","192.00","HSBC"));

        // OCP 5.625 2048 — 3 000 000 USD
        trades.add(bond(ins.get("XS1743523562"), LocalDate.of(2024,7,22), LocalDate.of(2024,7,24),
                "BUY","3000000","0.936562","0.023438","0.960000","0.960000","228.00","Barclays"));

        // MOROC 3.50 2031 EUR — 8 000 000 EUR
        trades.add(bond(ins.get("XS2398769001"), LocalDate.of(2024,9,1),  LocalDate.of(2024,9,3),
                "BUY","8000000","0.928730","0.011270","0.940000","0.940000","144.00","Natixis"));

        // CLN MOROC 2027 — 3 000 000 USD
        trades.add(bond(ins.get("XS2400000001"), LocalDate.of(2025,1,10), LocalDate.of(2025,1,14),
                "BUY","3000000","1.007500","0.012500","1.020000","1.020000","152.00","AWB Internal"));

        // EGP T-Bill 91J — 50 000 000 EGP
        trades.add(bond(ins.get("EG0000123456"), today.minusDays(30), today.minusDays(28),
                "BUY","50000000","0.939000","0.000000","0.939000","0.939000","0.00","Banque Misr"));

        // EGP T-Bill 182J — 30 000 000 EGP
        trades.add(bond(ins.get("EG0000654321"), today.minusDays(30), today.minusDays(28),
                "BUY","30000000","0.960000","0.000000","0.960000","0.960000","0.00","CIB Egypt"));

        tradeRepo.saveAll(trades);
    }

    private static Trade bond(Instrument inst, LocalDate tradeDate, LocalDate valueDate,
                               String way, String nominal, String cleanPx, String accr,
                               String dirtyPx, String wapDirty, String gSpread, String cpty) {
        return Trade.builder()
                .bondInstrument(inst).subAsset(inst.getSubAsset())
                .tradeDate(tradeDate).valueDate(valueDate)
                .way(way).nominal(new BigDecimal(nominal))
                .cleanPrice(new BigDecimal(cleanPx)).accrued(new BigDecimal(accr))
                .dirtyPrice(new BigDecimal(dirtyPx)).wapDirty(new BigDecimal(wapDirty))
                .wapClean(new BigDecimal(cleanPx)).gSpread(new BigDecimal(gSpread))
                .counterparty(cpty).isClosed(false).build();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 9. FUTURES TRADES  (hedge book — SELL positions)
    // ─────────────────────────────────────────────────────────────────────────
    private void seedFuturesTrades() {
        tradeRepo.saveAll(List.of(
            future("FVZ5", LocalDate.of(2024,9,18), "SELL", 80, "107.2500","106.3750","XS2595028452"),
            future("TYZ5", LocalDate.of(2024,9,18), "SELL", 50, "109.0000","108.1875","XS2080771806"),
            future("RXZ5", LocalDate.of(2024,9,18), "SELL", 30, "133.5000","132.6200","XS2189848XT7")
        ));
    }

    private static Trade future(String ticker, LocalDate tradeDate, String way,
                                 int nbContracts, String entryStr, String lastStr, String hedIsin) {
        BigDecimal cs     = new BigDecimal("100000");
        BigDecimal entry  = new BigDecimal(entryStr).divide(new BigDecimal("100"));
        BigDecimal last   = new BigDecimal(lastStr).divide(new BigDecimal("100"));
        BigDecimal mtm    = entry.subtract(last)
                .multiply(new BigDecimal(nbContracts)).multiply(cs);
        return Trade.builder()
                .assetIdentifier(ticker).subAsset("Future")
                .tradeDate(tradeDate).valueDate(tradeDate.plusDays(1))
                .way(way).nominal(cs.multiply(new BigDecimal(nbContracts)))
                .nbContracts(nbContracts).contractSize(cs)
                .cleanPrice(entry).dirtyPrice(entry).lastPrice(last)
                .mtmPnl(mtm).hedBondIsin(hedIsin).isClosed(false).build();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 10. COUPONS REÇUS  (driver principal du P&L économique positif)
    // ─────────────────────────────────────────────────────────────────────────
    private void seedCoupons(Map<String, Instrument> ins) {
        // MOROC 5.95 2031 — semi-annual Jul 22 / Jan 22
        // Nominal 73 460 000 USD × 5.95%/2 = 2 185 435 USD par paiement
        Instrument m595  = ins.get("XS2595028452");
        Instrument m300  = ins.get("XS2080771806");
        Instrument m400  = ins.get("XS2368905890");
        Instrument m1375 = ins.get("XS2189848XT7");
        Instrument ocp375 = ins.get("XS2337058901");
        Instrument ocp562 = ins.get("XS1743523562");
        Instrument m350  = ins.get("XS2398769001");
        Instrument cln   = ins.get("XS2400000001");

        List<CouponReceived> coupons = List.of(
            // MOROC 5.95 — 4 paiements semi-annuels depuis Jul 2024
            coupon(m595,  LocalDate.of(2024,7,22),  "2185435.00", "USD"),
            coupon(m595,  LocalDate.of(2025,1,22),  "2185435.00", "USD"),
            coupon(m595,  LocalDate.of(2025,7,22),  "2185435.00", "USD"),
            coupon(m595,  LocalDate.of(2026,1,22),  "2185435.00", "USD"),

            // MOROC 3.00 — 15 000 000 × 3%/2 = 225 000 USD
            coupon(m300,  LocalDate.of(2025,3,15),   "225000.00", "USD"),
            coupon(m300,  LocalDate.of(2025,9,15),   "225000.00", "USD"),
            coupon(m300,  LocalDate.of(2026,3,15),   "225000.00", "USD"),

            // MOROC 4.00 — 5 000 000 × 4%/2 = 100 000 USD
            coupon(m400,  LocalDate.of(2025,6,15),   "100000.00", "USD"),
            coupon(m400,  LocalDate.of(2025,12,15),  "100000.00", "USD"),

            // MOROC 1.375 EUR — annual: 10 000 000 × 1.375% = 137 500 EUR
            coupon(m1375, LocalDate.of(2025,4,4),    "137500.00", "EUR"),
            coupon(m1375, LocalDate.of(2026,4,4),    "137500.00", "EUR"),

            // OCP 3.75 — 10 000 000 × 3.75%/2 = 187 500 USD
            coupon(ocp375, LocalDate.of(2025,6,23),  "187500.00", "USD"),
            coupon(ocp375, LocalDate.of(2025,12,23), "187500.00", "USD"),

            // OCP 5.625 — 3 000 000 × 5.625%/2 = 84 375 USD
            coupon(ocp562, LocalDate.of(2025,4,25),   "84375.00", "USD"),
            coupon(ocp562, LocalDate.of(2025,10,25),  "84375.00", "USD"),

            // MOROC 3.50 EUR — annual: 8 000 000 × 3.50% = 280 000 EUR
            coupon(m350,  LocalDate.of(2025,9,16),   "280000.00", "EUR"),

            // CLN — 3 000 000 × 5%/2 = 75 000 USD
            coupon(cln,   LocalDate.of(2025,5,15),    "75000.00", "USD"),
            coupon(cln,   LocalDate.of(2025,11,15),   "75000.00", "USD")
        );
        couponRepo.saveAll(coupons);
    }

    private static CouponReceived coupon(Instrument inst, LocalDate date,
                                          String amount, String ccy) {
        return CouponReceived.builder()
                .instrument(inst).paymentDate(date)
                .amount(new BigDecimal(amount)).currency(ccy).build();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 11. PNL DAILY HISTORY (30 business days)
    // ─────────────────────────────────────────────────────────────────────────
    private void seedPnlDaily(LocalDate today) {
        List<LocalDate> days = businessDays(today.minusDays(1), 30);
        List<PnlDaily> records = new ArrayList<>();

        // Random-walk reproductible : dérive haussière + volatilité quotidienne.
        // Graine fixe → même courbe à chaque seed (démo stable, mais réaliste
        // avec des replis, contrairement à l'ancienne droite parfaite +600k/j).
        Random rng = new Random(20260609L);
        final double base  = 14_000_000d; // P&L éco de départ (MAD)
        final double trend = 600_000d;    // dérive moyenne par jour ouvré
        final double vol   = 1_100_000d;  // volatilité quotidienne (écart-type)
        double cum = base;

        for (int i = 0; i < days.size(); i++) {
            // P&L du jour = tendance + choc gaussien (jour 0 = base, sans choc)
            double dayPnl = (i == 0) ? 0d : trend + rng.nextGaussian() * vol;
            cum += dayPnl;

            BigDecimal pnlEco  = BigDecimal.valueOf(Math.round(cum));
            BigDecimal pnlJour = BigDecimal.valueOf(Math.round(i == 0 ? trend : dayPnl));
            int doy = days.get(i).getDayOfYear();

            BigDecimal finUsd  = new BigDecimal("109000").multiply(BigDecimal.valueOf(doy));
            BigDecimal finEur  = new BigDecimal("21000").multiply(BigDecimal.valueOf(doy));
            BigDecimal finTot  = finUsd.add(finEur);

            records.add(PnlDaily.builder()
                    .snapshotDate(days.get(i))
                    .pnlEcoMad(pnlEco)
                    .pnlJourMad(pnlJour)
                    .pnlTotalGestionMad(pnlEco.add(finTot))
                    .positionUsd(new BigDecimal("109460000"))
                    .positionEurUsd(new BigDecimal("16590000"))
                    .tauxEur(new BigDecimal("0.039000"))
                    .tauxUsd(new BigDecimal("0.053300"))
                    .finUsdMad(finUsd).finEurMad(finEur)
                    .finTotalMad(finTot).finCumulMad(finTot)
                    .plBondUsd(pnlEco.multiply(new BigDecimal("0.78")))
                    .plBondEur(pnlEco.multiply(new BigDecimal("0.14")))
                    .plFutUsd(pnlEco.multiply(new BigDecimal("0.05")))
                    .plFutEur(pnlEco.multiply(new BigDecimal("0.03")))
                    .build());
        }
        pnlDailyRepo.saveAll(records);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 12. T-BILLS OFFSHORE (USD + EUR)
    //     Positions en USD Treasury Bills et BTF français.
    //     FX exprimé en USD/MAD et EUR/MAD (pas USD/EGP).
    //     Remplacer par un vrai connecteur Bloomberg quand disponible.
    // ─────────────────────────────────────────────────────────────────────────
    private void seedTBills(LocalDate today) {
        tbillRepo.saveAll(List.of(
            //          isin             emetteur                  devise  date   nominal      yldNet yldBrut dur
            //          plYield   plFx    plEco    funding
            //          fxMoyen fxCurrent fxBkAvec fxBkSans fxStopLoss
            //          maturity                   dateInit                   limit
            tbill("US912796ZT70", "US Treasury",           "USD", today,
                  "50000000", "5.42", "5.85", "0.25",
                  "680000",   "-45000",  "635000", "-210000",
                  "9.9200",   "10.0350", "9.7850", "9.8300", "9.5000",
                  LocalDate.of(2025, 6, 17), LocalDate.of(2024, 12, 17), "100000000"),

            tbill("US912796YH08", "US Treasury",           "USD", today,
                  "30000000", "5.28", "5.70", "0.50",
                  "396000",   "-28000",  "368000", "-126000",
                  "9.8750",   "10.0350", "9.7350", "9.7900", "9.5000",
                  LocalDate.of(2025, 9, 15), LocalDate.of(2024, 9, 15),  "100000000"),

            tbill("FR0013519668", "Trésor Français (BTF)", "EUR", today,
                  "20000000", "3.15", "3.80", "0.25",
                  "157500",   "12000",   "169500", "-63000",
                  "10.6500",  "10.8890", "10.5200","10.5700","10.2000",
                  LocalDate.of(2025, 7, 10), LocalDate.of(2025, 1, 10),  "50000000")
        ));
    }

    private static TBillPosition tbill(
            String isin, String emetteur, String devise, LocalDate today,
            String nominal, String yldNet, String yldBrut, String dur,
            String plYield, String plFx, String plEco, String funding,
            String fxMoyen, String fxCurrent, String fxBkAvec, String fxBkSans, String fxStop,
            LocalDate maturity, LocalDate dateInit, String limit) {
        return TBillPosition.builder()
                .isin(isin).emetteur(emetteur).devise(devise).snapshotDate(today)
                .nominal(new BigDecimal(nominal))
                .yieldNet(new BigDecimal(yldNet)).yieldBrut(new BigDecimal(yldBrut))
                .duration(new BigDecimal(dur))
                .plYieldUsd(new BigDecimal(plYield)).plFxUsd(new BigDecimal(plFx))
                .plEcoUsd(new BigDecimal(plEco)).fundingUsd(new BigDecimal(funding))
                .fxMoyen(new BigDecimal(fxMoyen)).fxCurrent(new BigDecimal(fxCurrent))
                .fxBreakevenAvec(new BigDecimal(fxBkAvec)).fxBreakevenSans(new BigDecimal(fxBkSans))
                .fxStopLoss(new BigDecimal(fxStop))
                .maturityDate(maturity).dateInitiation(dateInit)
                .limitNominal(new BigDecimal(limit))
                .build();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 13. EXTERNAL PNL SNAPSHOTS  (CLN desk structuré + EGP desk local)
    //     Ces snapshots alimentent /api/external/cln et /api/external/egp
    //     utilisés par le frontend pour pnl.cln et pnl.egp.
    //     Valeurs calculées sur la base des positions seedées : WAP, prix marché,
    //     coupons reçus et coût de financement SOFR/ESTR au 31/05/2026.
    // ─────────────────────────────────────────────────────────────────────────
    private void seedExternalSnapshots(LocalDate today) {
        List<ExternalPnlSnapshot> list = new ArrayList<>();

        // ── CLN MOROC 5.00 05/15/2027 — 3 000 000 USD ──────────────────────
        // WAP dirty = 1.020000 | Marché dirty = 1.025000
        // Latent = 3M × (1.025 - 1.020) = +15 000 USD
        // Coupons reçus : May-2025 + Nov-2025 = 2 × 75 000 = +150 000 USD
        // P&L total USD = 165 000
        // Funding (SOFR 5.33% · 152j/360) = 3M × 0.0533 × 0.4222 = 67 600 USD
        // P&L éco USD = 97 400 | × USD/MAD 10.034 = 977 312 MAD ≈ 977 000 MAD
        list.add(ExternalPnlSnapshot.builder()
                .isin("XS2400000001")
                .description("CLN MOROC 5.00 05/15/2027")
                .assetCategory("CLN")
                .snapshotDate(today)
                .nominalUsd(new BigDecimal("3000000"))
                .couponRate(new BigDecimal("0.050000"))
                .counterparty("AWB Internal / Desk Structuré")
                .maturityDate(LocalDate.of(2027, 5, 15))
                .plRealizedUsd(BigDecimal.ZERO)
                .plLatentUsd(new BigDecimal("15000.00"))
                .plEcoUsd(new BigDecimal("97400.00"))
                .plEcoMad(new BigDecimal("977312.00"))
                .fundingUsd(new BigDecimal("-67600.00"))
                .duration(new BigDecimal("1.2500"))
                .source("MOCK_BLOOMBERG")
                .build());

        // ── EGP T-Bill 91J — 50 000 000 EGP (≈ 1 023 541 USD) ──────────────
        // WAP = 0.939000 | Marché = 0.985900 (accrété vers pair)
        // Latent EGP = 50M × (0.9859 - 0.939) = +2 345 000 EGP
        // EGP/MAD = USD/MAD ÷ USD/EGP = 10.034 / 48.85 = 0.20538
        // P&L éco MAD ≈ 2 345 000 × 0.20538 = +481 615 MAD ≈ 481 600 MAD
        // couponRate = yield implicite T-bill 91J = 24.50% → stocké en fraction (0.245000)
        // wapFxEntry = USD/EGP au jour d'achat (il y a 30j) = 48.850000 (taux constant mock)
        list.add(ExternalPnlSnapshot.builder()
                .isin("EG0000123456")
                .description("EGP T-Bill 91J")
                .assetCategory("EGP_BILL")
                .snapshotDate(today)
                .nominalUsd(new BigDecimal("1023541.00"))
                .couponRate(new BigDecimal("0.245000"))
                .wapFxEntry(new BigDecimal("48.850000"))
                .counterparty("Banque Misr")
                .maturityDate(today.plusDays(61))
                .plRealizedUsd(BigDecimal.ZERO)
                .plLatentUsd(new BigDecimal("48056.00"))
                .plEcoUsd(new BigDecimal("48056.00"))
                .plEcoMad(new BigDecimal("481615.00"))
                .fundingUsd(BigDecimal.ZERO)
                .duration(new BigDecimal("0.2500"))
                .source("MOCK_BLOOMBERG")
                .build());

        // ── EGP T-Bill 182J — 30 000 000 EGP (≈ 614 125 USD) ───────────────
        // WAP = 0.960000 | Marché = 0.972000
        // Latent EGP = 30M × (0.972 - 0.960) = +360 000 EGP
        // P&L éco MAD ≈ 360 000 × 0.20538 = +73 937 MAD ≈ 73 900 MAD
        // couponRate = yield implicite T-bill 182J = 25.00% → stocké en fraction (0.250000)
        // wapFxEntry = USD/EGP au jour d'achat = 48.850000
        list.add(ExternalPnlSnapshot.builder()
                .isin("EG0000654321")
                .description("EGP T-Bill 182J")
                .assetCategory("EGP_BILL")
                .snapshotDate(today)
                .nominalUsd(new BigDecimal("614125.00"))
                .couponRate(new BigDecimal("0.250000"))
                .wapFxEntry(new BigDecimal("48.850000"))
                .counterparty("CIB Egypt")
                .maturityDate(today.plusDays(152))
                .plRealizedUsd(BigDecimal.ZERO)
                .plLatentUsd(new BigDecimal("7390.00"))
                .plEcoUsd(new BigDecimal("7390.00"))
                .plEcoMad(new BigDecimal("73937.00"))
                .fundingUsd(BigDecimal.ZERO)
                .duration(new BigDecimal("0.4700"))
                .source("MOCK_BLOOMBERG")
                .build());

        extSnapshotRepo.saveAll(list);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 14. AUDIT LOG  (12 entrées historiques réalistes)
    //
    //     @PrePersist dans AuditLog écrase toujours createdAt = now().
    //     On bypasse JPA en utilisant JdbcTemplate (INSERT natif PostgreSQL)
    //     pour pouvoir seeder des timestamps historiques exacts.
    //     La colonne created_at est déclarée updatable=false côté Hibernate,
    //     mais un INSERT natif n'est pas soumis à cette contrainte.
    // ─────────────────────────────────────────────────────────────────────────
    private void seedAuditLog(LocalDate today) {
        final String SQL =
            "INSERT INTO audit_log (username, table_name, action, record_id, details, ip_address, created_at) " +
            "VALUES (?, ?, ?, ?, ?::jsonb, ?, ?)";
        // Base = minuit aujourd'hui, les timestamps sont calculés en jours passés + heure
        LocalDateTime base = today.atStartOfDay();

        // 1 — Création des instruments Eurobonds (il y a 30 jours, 09h00)
        jdbcTemplate.update(SQL, "admin", "instrument", "INSERT", null,
            json("isin","XS2595028452","description","MOROC 5.95 2031","action","creation instrument"),
            null, ts(base, 30, 9));

        // 2 — Création instrument CLN Maroc (il y a 28 jours, 10h30)
        jdbcTemplate.update(SQL, "admin", "instrument", "INSERT", null,
            json("isin","XS2400000001","description","CLN MOROC 5.00 2027","action","creation instrument"),
            null, ts(base, 28, 10));

        // 3 — Création instrument CLN GCC (il y a 22 jours, 11h00)
        jdbcTemplate.update(SQL, "admin", "instrument", "INSERT", null,
            json("isin","XS2500000002","description","CLN SAUDI ARAMCO 4.75 2028","action","creation instrument"),
            null, ts(base, 22, 11));

        // 4 — Création compte trader Mohamed Aitif (il y a 25 jours, 09h15)
        jdbcTemplate.update(SQL, "admin", "app_user", "INSERT", null,
            json("username","maitif","fullName","Mohamed Aitif","role","TRADER"),
            null, ts(base, 25, 9));

        // 5 — Création compte trader Hassan Benali (il y a 25 jours, 09h30)
        jdbcTemplate.update(SQL, "admin", "app_user", "INSERT", null,
            json("username","hbenali","fullName","Hassan Benali","role","TRADER"),
            null, ts(base, 25, 9));

        // 6 — Trade BUY MOROC 5.95 — Mohamed Aitif (il y a 20 jours, 08h45)
        jdbcTemplate.update(SQL, "maitif", "trade", "INSERT", 1L,
            json("isin","XS2595028452","nominal","50000000","way","BUY","gSpread","141.00"),
            "10.0.2.45", ts(base, 20, 8));

        // 7 — Trade BUY MOROC 3.00 — Hassan Benali (il y a 18 jours, 08h50)
        jdbcTemplate.update(SQL, "hbenali", "trade", "INSERT", 3L,
            json("isin","XS2080771806","nominal","15000000","way","BUY","gSpread","180.00"),
            "10.0.2.46", ts(base, 18, 8));

        // 8 — Mise à jour limite EUROBONDS du trader maitif (il y a 15 jours, 14h00)
        jdbcTemplate.update(SQL, "admin", "trader_limit", "UPDATE", null,
            json("user","maitif","instrumentType","EUROBONDS","from","40000000","to","80000000","currency","EUR"),
            null, ts(base, 15, 14));

        // 9 — Mise à jour limite portefeuille Eurobonds (il y a 10 jours, 16h00)
        jdbcTemplate.update(SQL, "admin", "portfolio_limit", "UPDATE", null,
            json("portfolioName","Eurobonds (EUR)","field","limitMeur","from","250.00","to","280.00"),
            null, ts(base, 10, 16));

        // 10 — Import CSV blotter (il y a 5 jours, 09h05)
        jdbcTemplate.update(SQL, "trader", "csv_upload", "IMPORT", null,
            json("file","blotter_20260527.csv","imported","60","errors","0","source","Bloomberg"),
            "10.0.2.43", ts(base, 5, 9));

        // 11 — Trade BUY OCP 5.625 — Hassan Benali (il y a 2 jours, 08h55)
        jdbcTemplate.update(SQL, "hbenali", "trade", "INSERT", 7L,
            json("isin","XS1743523562","nominal","3000000","way","BUY","gSpread","228.00"),
            "10.0.2.46", ts(base, 2, 8));

        // 12 — Réactivation compte direction (hier, 11h00)
        jdbcTemplate.update(SQL, "admin", "app_user", "UPDATE", null,
            json("username","direction","field","isActive","from","false","to","true"),
            null, ts(base, 1, 11));
    }

    /** Construit un timestamp SQL à partir d'une base minuit moins N jours à heure H. */
    private static Timestamp ts(LocalDateTime base, int minusDays, int hour) {
        return Timestamp.valueOf(base.minusDays(minusDays).withHour(hour).withMinute(0).withSecond(0));
    }

    /** Sérialise des paires clé/valeur en JSON string pour la colonne JSONB. */
    private static String json(String... kv) {
        StringBuilder b = new StringBuilder("{");
        for (int i = 0; i + 1 < kv.length; i += 2) {
            if (i > 0) b.append(',');
            b.append('"').append(kv[i]).append("\":\"").append(kv[i + 1]).append('"');
        }
        return b.append('}').toString();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // HELPER
    // ─────────────────────────────────────────────────────────────────────────
    private static List<LocalDate> businessDays(LocalDate end, int count) {
        List<LocalDate> days = new ArrayList<>();
        LocalDate d = end;
        while (days.size() < count) {
            if (d.getDayOfWeek() != DayOfWeek.SATURDAY && d.getDayOfWeek() != DayOfWeek.SUNDAY) {
                days.add(d);
            }
            d = d.minusDays(1);
        }
        Collections.reverse(days);
        return days;
    }
}
