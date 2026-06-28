package ma.attijariwafa.desk_international.repository;

import ma.attijariwafa.desk_international.entity.PricingConfig;

import org.springframework.data.jpa.repository.JpaRepository;

import org.springframework.data.jpa.repository.Query;

import org.springframework.data.repository.query.Param;

import org.springframework.stereotype.Repository;

import java.time.LocalDate;

import java.util.List;

import java.util.Optional;

@Repository

public interface PricingConfigRepository extends JpaRepository<PricingConfig, Long> {

    // JOIN FETCH p.instrument : charge l'Instrument EAGERLY même avec FetchType.LAZY
    // Obligatoire avec spring.jpa.open-in-view=false — sinon cfg.getIsin() lève
    // LazyInitializationException quand le stream est traité hors transaction.

    // 1. Tous les configs d'une date — JOIN FETCH évite le N+1 + LazyInit
    @Query("SELECT p FROM PricingConfig p JOIN FETCH p.instrument WHERE p.configDate = :configDate")
    List<PricingConfig> findByConfigDate(@Param("configDate") LocalDate configDate);

    // 2. Config par ISIN + date — JOIN FETCH pour accès sûr à instrument
    @Query("SELECT p FROM PricingConfig p JOIN FETCH p.instrument WHERE p.instrument.isin = :isin AND p.configDate = :configDate")
    Optional<PricingConfig> findByIsinAndConfigDate(@Param("isin") String isin, @Param("configDate") LocalDate configDate);

    // 3. Dernier snapshot de pricing pour un ISIN — utilisé par le PATCH /decision
    //    Pas besoin de JOIN FETCH ici : instrument n'est jamais accédé dans ce path
    Optional<PricingConfig> findTopByInstrumentIsinOrderByConfigDateDesc(String isin);

    // 4. Tous les pricings de la date la plus récente — fallback résilient
    //    JOIN FETCH garantit que instrument.isin est accessible hors transaction
    @Query("SELECT p FROM PricingConfig p JOIN FETCH p.instrument WHERE p.configDate = " +
           "(SELECT MAX(p2.configDate) FROM PricingConfig p2) " +
           "ORDER BY p.instrument.isin")
    List<PricingConfig> findLatest();

    // 5. Dernier pricing d'un ISIN (toutes dates) — fallback pour GET /api/pricing/{isin}
    //    JOIN FETCH (contrairement à findTopBy...) pour un accès sûr à instrument.isin
    //    hors transaction (open-in-view=false). Prendre .get(0) = le plus récent.
    @Query("SELECT p FROM PricingConfig p JOIN FETCH p.instrument WHERE p.instrument.isin = :isin " +
           "ORDER BY p.configDate DESC")
    List<PricingConfig> findLatestByIsin(@Param("isin") String isin);
}

