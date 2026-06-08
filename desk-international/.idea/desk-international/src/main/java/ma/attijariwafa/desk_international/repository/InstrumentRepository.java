package ma.attijariwafa.desk_international.repository;

import ma.attijariwafa.desk_international.entity.Instrument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;
@Repository
public interface InstrumentRepository extends JpaRepository<Instrument, String> {

    List<Instrument> findByIsActiveTrueOrderBySubAssetAscMaturityDateAsc() ;
    List<Instrument> findByCurrencyAndIsActiveTrue(String currency) ;
    List<Instrument> findBySubAssetAndIsActiveTrue(String subAsset) ;
    boolean existsAllByIsin(String isin) ;
}
