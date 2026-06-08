package ma.attijariwafa.desk_international.repository;

import ma.attijariwafa.desk_international.entity.CouponReceived;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.math.BigDecimal;
import java.util.Optional;

@Repository
public interface CouponReceivedRepository
        extends JpaRepository<CouponReceived, Long> {

    // Somme des coupons reçus pour un ISIN
    @Query("SELECT COALESCE(SUM(c.amount), 0) FROM CouponReceived c WHERE c.instrument.isin = :isin")
    Optional<BigDecimal> sumByIsin(@Param("isin") String isin);



}