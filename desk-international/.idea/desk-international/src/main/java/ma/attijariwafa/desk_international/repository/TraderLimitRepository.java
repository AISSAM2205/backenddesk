package ma.attijariwafa.desk_international.repository;

import ma.attijariwafa.desk_international.entity.TraderLimit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface TraderLimitRepository extends JpaRepository<TraderLimit, Long> {
    List<TraderLimit> findByUserId(Long userId);
    void deleteByUserId(Long userId);
}
