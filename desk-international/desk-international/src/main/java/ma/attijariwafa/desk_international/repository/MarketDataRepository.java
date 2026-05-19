package ma.attijariwafa.desk_international.repository;
import org.springframework.data.jpa.repository.Query;
import ma.attijariwafa.desk_international.entity.MarketData;
import ma.attijariwafa.desk_international.entity.MarketRates;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.data.repository.query.Param;
import java.time.LocalDate;
import java.util.Optional;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.Query;
// repository/MarketDataRepository.java
@Repository
public interface MarketDataRepository extends JpaRepository<MarketData, Long> {

    Optional<MarketData> findByInstrumentIsinAndDataDate(String isin, LocalDate date);

    // Dernier snapshot pour TOUS les ISINs actifs en 1 seule requête SQL
    // Évite N×1 queries (14 requêtes si on boucle par ISIN)
    @Query("SELECT md FROM MarketData md " +
            "WHERE md.dataDate = (SELECT MAX(md2.dataDate) FROM MarketData md2) " +
            "ORDER BY md.instrument.isin")
    List<MarketData> findLatestForAllIsins();
    // Utilisé dans PnLService pour calculer le dirty market
    @Query("SELECT m FROM MarketData m WHERE m.instrument.isin = :isin AND m.dataDate = :date")
    Optional<MarketData> findByIsinAndDate(@Param("isin") String isin,
                                           @Param("date") LocalDate date);

    List<MarketData> findByDataDateOrderByInstrumentIsin(LocalDate date);

    Optional<MarketData> findTopByInstrumentIsinOrderByDataDateDesc(String isin);
}

