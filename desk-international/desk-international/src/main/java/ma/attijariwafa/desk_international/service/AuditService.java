package ma.attijariwafa.desk_international.service;

import lombok.RequiredArgsConstructor;
import ma.attijariwafa.desk_international.entity.AuditLog;
import ma.attijariwafa.desk_international.repository.AuditLogRepository;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
@RequiredArgsConstructor
public class AuditService {

    private final AuditLogRepository auditRepo;

    public void log(String username, String tableName, String action, Long recordId, Map<String, Object> details) {
        auditRepo.save(AuditLog.builder()
            .username(username)
            .tableName(tableName)
            .action(action)
            .recordId(recordId)
            .details(details)
            .build());
    }
}
