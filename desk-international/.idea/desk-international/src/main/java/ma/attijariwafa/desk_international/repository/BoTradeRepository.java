package ma.attijariwafa.desk_international.repository;

import ma.attijariwafa.desk_international.entity.BoTrade;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface BoTradeRepository extends JpaRepository<BoTrade, Long> {
}
