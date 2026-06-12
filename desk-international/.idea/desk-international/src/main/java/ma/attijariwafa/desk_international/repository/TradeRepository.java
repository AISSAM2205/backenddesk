package ma.attijariwafa.desk_international.repository;

import ma.attijariwafa.desk_international.entity.Trade;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface TradeRepository extends JpaRepository<Trade, Long> {

    // ✅ Renommé en BondInstrumentIsin
    // Trades d'un ISIN en ordre chronologique (crucial pour calcul WAP)
    List<Trade> findByBondInstrumentIsinOrderByTradeDateAscIdAsc(String isin);

    // ── REQUÊTES CRITIQUES POUR LE CALCUL WAP ─────────────────

    // ✅ t.instrument remplacé par t.bondInstrument
    // Dernier WAP dirty connu pour un ISIN (utilisé dans WapCalculatorService)
    @Query("SELECT t.wapDirty FROM Trade t WHERE t.bondInstrument.isin = :isin " +
            "AND t.way = 'BUY' ORDER BY t.id DESC LIMIT 1")
    Optional<BigDecimal> findLastWapDirtyByIsin(@Param("isin") String isin);

    // ✅ t.instrument remplacé par t.bondInstrument
    // Position nette par ISIN — même calcul que la vue v_position
    @Query("SELECT COALESCE(SUM(CASE t.way " +
            "WHEN 'BUY' THEN t.nominal " +
            "WHEN 'SELL' THEN -t.nominal ELSE 0 END), 0) " +
            "FROM Trade t WHERE t.bondInstrument.isin = :isin " +
            "AND t.subAsset IN ('Mor Bond', 'OCP Bond')")
    BigDecimal calculateNetNominalByIsin(@Param("isin") String isin);

    // ✅ JOIN FETCH t.instrument remplacé par t.bondInstrument
    // Trades par période (pour le rapport Blotter)
    @Query("SELECT t FROM Trade t JOIN FETCH t.bondInstrument " +
            "WHERE t.tradeDate BETWEEN :from AND :to " +
            "ORDER BY t.tradeDate DESC, t.id DESC")
    List<Trade> findByDateRange(@Param("from") LocalDate from,
                                @Param("to")   LocalDate to);

    // Tous les trades d'un import CSV spécifique
    List<Trade> findByUploadLogId(Long uploadLogId);

    // ✅ Renommé en BondInstrumentIsin
    // Trades d'un ISIN entre deux dates
    List<Trade> findByBondInstrumentIsinAndTradeDateBetween(
            String isin, LocalDate from, LocalDate to);

    // JOIN FETCH : initialise bondInstrument dans la requête pour que
    // Trade.getDescription() (colonne « Obligation » du Blotter) fonctionne à la
    // sérialisation JSON malgré open-in-view=false. LEFT pour garder les futures
    // (bondInstrument null).
    @Query("SELECT t FROM Trade t LEFT JOIN FETCH t.bondInstrument bi WHERE " +
            "(:isin IS NULL OR t.assetIdentifier = :isin OR bi.isin = :isin) AND " +
            "(:way IS NULL OR t.way = :way) AND " +
            "(:sub IS NULL OR t.subAsset = :sub) ORDER BY t.tradeDate DESC")
    List<Trade> findWithFilters(@Param("isin") String isin,
                                @Param("way")  String way,
                                @Param("sub")  String subAsset);

    // ✅ La bonne et unique version pour le WAP calculator !
    List<Trade> findByBondInstrumentIsinAndWayOrderByTradeDateAsc(String bondIsin, String way);

    // Position nette futures pour un bond donné (hedBondIsin)
    // SELL → négatif (contrats vendus = hedge short), BUY → positif
    // Utilisé par RiskService pour remplacer VPosition.getFuturesNetPosition() (toujours 0)
    @Query("SELECT COALESCE(SUM(CASE WHEN t.way = 'SELL' THEN -t.nbContracts " +
           "ELSE t.nbContracts END), 0) " +
           "FROM Trade t WHERE t.hedBondIsin = :isin " +
           "AND t.isClosed = false AND t.nbContracts IS NOT NULL")
    Integer findFuturesNetPositionByHedgeBond(@Param("isin") String isin);
}