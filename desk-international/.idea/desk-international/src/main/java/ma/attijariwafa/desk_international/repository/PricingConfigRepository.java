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

    // 1. La méthode qu'il vous manquait pour que le PricingService fonctionne (Renvoie une Liste avec son Vrai Type)

    List<PricingConfig> findByConfigDate(LocalDate configDate);


    // 2. La méthode qu'on a corrigée avec HQL pour PostgreSQL
    @Query("SELECT p FROM PricingConfig p WHERE p.instrument.isin = :isin AND p.configDate = :configDate")
    Optional<PricingConfig> findByIsinAndConfigDate(@Param("isin") String isin, @Param("configDate") LocalDate configDate);

    // 3. Dernier snapshot de pricing pour un ISIN — utilisé par le PATCH /decision
    Optional<PricingConfig> findTopByInstrumentIsinOrderByConfigDateDesc(String isin);

    // 4. Tous les pricings de la date la plus récente — fallback résilient
    //    (évite SIGNAL/G-Spread vides si l'app tourne un jour postérieur au seed)
    @Query("SELECT p FROM PricingConfig p WHERE p.configDate = " +
           "(SELECT MAX(p2.configDate) FROM PricingConfig p2) " +
           "ORDER BY p.instrument.isin")
    List<PricingConfig> findLatest();
}

