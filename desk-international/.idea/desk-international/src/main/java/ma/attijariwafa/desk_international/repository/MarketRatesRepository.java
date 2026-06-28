package ma.attijariwafa.desk_international.repository;

import ma.attijariwafa.desk_international.entity.MarketRates;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

// repository/MarketRatesRepository.java
@Repository
public interface MarketRatesRepository extends JpaRepository<MarketRates, Long> {

    // Dernier snapshot (le plus récent)
    Optional<MarketRates> findTopByOrderByRateDateDesc();

    Optional<MarketRates> findByRateDate(LocalDate rateDate);

    // Persistance des FX par le simulateur : UPDATE DIRECT par id (pas de merge
    // d'entité → aucun problème de version / d'entité détachée périmée même en
    // exécution concurrente). N'écrit QUE les FX ; sofr_10y, SOFR, ESTR, etc.
    // restent intacts.
    @Modifying
    @Transactional
    @Query("UPDATE MarketRates m SET m.usdMad = :usdMad, m.eurUsd = :eurUsd, " +
           "m.usdEgp = :usdEgp, m.eurMad = :eurMad WHERE m.id = :id")
    void updateFx(@Param("id") Long id,
                  @Param("usdMad") BigDecimal usdMad,
                  @Param("eurUsd") BigDecimal eurUsd,
                  @Param("usdEgp") BigDecimal usdEgp,
                  @Param("eurMad") BigDecimal eurMad);
}
