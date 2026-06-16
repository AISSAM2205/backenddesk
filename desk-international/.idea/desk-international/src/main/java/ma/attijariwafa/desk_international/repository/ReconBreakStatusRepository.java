package ma.attijariwafa.desk_international.repository;

import ma.attijariwafa.desk_international.entity.ReconBreakStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ReconBreakStatusRepository extends JpaRepository<ReconBreakStatus, Long> {
    Optional<ReconBreakStatus> findByBreakKey(String breakKey);
}
