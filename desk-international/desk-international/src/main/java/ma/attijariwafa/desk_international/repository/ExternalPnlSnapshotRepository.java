package ma.attijariwafa.desk_international.repository;

import ma.attijariwafa.desk_international.entity.ExternalPnlSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Repository
public interface ExternalPnlSnapshotRepository
        extends JpaRepository<ExternalPnlSnapshot, Long> {

    List<ExternalPnlSnapshot> findByAssetCategoryAndSnapshotDate(
            String assetCategory, LocalDate date);

    // Fallback : retourne tous les enregistrements de la date la plus récente disponible
    @Query("SELECT e FROM ExternalPnlSnapshot e WHERE e.assetCategory = :cat " +
           "AND e.snapshotDate = (SELECT MAX(e2.snapshotDate) FROM ExternalPnlSnapshot e2 " +
           "                      WHERE e2.assetCategory = :cat)")
    List<ExternalPnlSnapshot> findLatestByCategory(@Param("cat") String category);

    @Query("SELECT COALESCE(SUM(e.plEcoMad), 0) FROM ExternalPnlSnapshot e " +
           "WHERE e.snapshotDate = :date AND e.assetCategory = :cat")
    BigDecimal sumPlEcoMadByCategory(
            @Param("date") LocalDate date, @Param("cat") String category);

    @Query("SELECT COALESCE(SUM(e.nominalUsd), 0) FROM ExternalPnlSnapshot e " +
           "WHERE e.snapshotDate = :date AND e.assetCategory = :cat")
    BigDecimal sumNominalByCategory(
            @Param("date") LocalDate date, @Param("cat") String category);
}
