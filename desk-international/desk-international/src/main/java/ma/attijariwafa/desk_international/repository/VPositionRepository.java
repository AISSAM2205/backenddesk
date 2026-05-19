package ma.attijariwafa.desk_international.repository;
import org.springframework.data.jpa.repository.Query;
import ma.attijariwafa.desk_international.entity.VPosition;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

// repository/VPositionRepository.java — VUE SQL (lecture seule)
@Repository
public interface VPositionRepository extends JpaRepository<VPosition, String> {

    // findAll() retourne toutes positions actives (la vue filtre net != 0)
    List<VPosition> findByCurrency(String currency);
    List<VPosition> findBySubAsset(String subAsset);
    Optional<VPosition> findByIsin(String isin);
    // Positions avec nominal > 0 (bonds que le desk détient actuellement)
    @Query("SELECT v FROM VPosition v WHERE v.netNominal > 0 ORDER BY v.netNominal DESC")
    List<VPosition> findAllActive();

}