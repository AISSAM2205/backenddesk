package ma.attijariwafa.desk_international.repository;

import ma.attijariwafa.desk_international.entity.MarketRates;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Optional;

// repository/MarketRatesRepository.java
@Repository
public interface MarketRatesRepository extends JpaRepository<MarketRates, Long> {

    // Dernier snapshot (le plus récent)
    Optional<MarketRates> findTopByOrderByRateDateDesc();

    Optional<MarketRates> findByRateDate(LocalDate rateDate);
}
