package ma.attijariwafa.desk_international.repository;

import ma.attijariwafa.desk_international.entity.RiskMetrics;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface RiskMetricsRepository extends JpaRepository<RiskMetrics, Long> {

    Optional<RiskMetrics> findTopByInstrumentIsinOrderByMetricsDateDesc(String isin);

    @Query("SELECT r FROM RiskMetrics r WHERE r.metricsDate = " +
            "(SELECT MAX(r2.metricsDate) FROM RiskMetrics r2) " +
            "ORDER BY r.instrument.isin")
    List<RiskMetrics> findLatestForAllIsins();
    // Risk metrics d'un ISIN pour une date précise
// "instrument.isin" car @ManyToOne dans RiskMetrics s'appelle "instrument"
    @Query("SELECT r FROM RiskMetrics r WHERE r.instrument.isin = :isin AND r.metricsDate = :date")
    Optional<RiskMetrics> findByIsinAndDate(@Param("isin") String isin,
                                            @Param("date") LocalDate date);

}