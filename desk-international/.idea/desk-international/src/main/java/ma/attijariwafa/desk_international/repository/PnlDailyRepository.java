package ma.attijariwafa.desk_international.repository;

import ma.attijariwafa.desk_international.entity.PnlDaily;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

// repository/PnlDailyRepository.java
@Repository
public interface PnlDailyRepository extends JpaRepository<PnlDaily, Long> {

    Optional<PnlDaily> findBySnapshotDate(LocalDate date);

    List<PnlDaily> findBySnapshotDateBetweenOrderBySnapshotDateAsc(
            LocalDate from, LocalDate to);

    Optional<PnlDaily> findTopByOrderBySnapshotDateDesc();
}