package ma.attijariwafa.desk_international.repository;

import ma.attijariwafa.desk_international.entity.AppUser;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

// repository/AppUserRepository.java
@Repository
public interface AppUserRepository extends JpaRepository<AppUser, Long> {

    Optional<AppUser> findByUsernameAndIsActiveTrue(String username);

    boolean existsByUsername(String username);
    boolean existsByEmail(String email);
}