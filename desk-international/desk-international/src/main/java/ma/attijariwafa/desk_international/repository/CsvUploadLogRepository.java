package ma.attijariwafa.desk_international.repository;

import ma.attijariwafa.desk_international.entity.CsvUploadLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

// repository/CsvUploadLogRepository.java
@Repository
public interface CsvUploadLogRepository extends JpaRepository<CsvUploadLog, Long> {

    List<CsvUploadLog> findTop10ByOrderByUploadedAtDesc();

    List<CsvUploadLog> findByStatusNotOrderByUploadedAtDesc(String status);
}