package ma.attijariwafa.desk_international.repository;

import ma.attijariwafa.desk_international.entity.TBillPosition;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Repository
public interface TBillPositionRepository extends JpaRepository<TBillPosition, Long> {

    /** Toutes les positions pour une date de snapshot exacte */
    List<TBillPosition> findBySnapshotDate(LocalDate snapshotDate);

    /** Positions filtrées par devise pour une date donnée */
    List<TBillPosition> findByDeviseAndSnapshotDate(String devise, LocalDate snapshotDate);

    /**
     * Fallback : retourne les positions de la dernière date disponible.
     * Utilisé si aucune donnée n'existe pour la date demandée (ex: week-end).
     */
    @Query("SELECT t FROM TBillPosition t WHERE t.snapshotDate = " +
           "(SELECT MAX(t2.snapshotDate) FROM TBillPosition t2)")
    List<TBillPosition> findLatest();

    /** Somme du nominal en USD pour une date (pour les KPIs dashboard) */
    @Query("SELECT COALESCE(SUM(t.nominal), 0) FROM TBillPosition t " +
           "WHERE t.snapshotDate = :date AND t.devise = :devise")
    BigDecimal sumNominalByDeviseAndDate(String devise, LocalDate date);

    /** Somme du P&L économique en USD pour une date */
    @Query("SELECT COALESCE(SUM(t.plEcoUsd), 0) FROM TBillPosition t " +
           "WHERE t.snapshotDate = :date")
    BigDecimal sumPlEcoUsdByDate(LocalDate date);
}
