package ma.attijariwafa.desk_international.repository;

import ma.attijariwafa.desk_international.entity.PortfolioLimit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

// repository/PortfolioLimitRepository.java
@Repository
public interface PortfolioLimitRepository extends JpaRepository<PortfolioLimit, Long> {

    List<PortfolioLimit> findByIsActiveTrueOrderByPortfolioName();

    Optional<PortfolioLimit> findByPortfolioNameAndIsActiveTrue(String name);
}