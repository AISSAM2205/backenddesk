// exception/GlobalExceptionHandler.java
// Mettre dans le package exception/ qui existe déjà dans ton projet
package ma.attijariwafa.desk_international.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import java.time.LocalDateTime;
import java.util.Map;

// @RestControllerAdvice = intercepte les exceptions de TOUS les controllers
// Au lieu d'une stacktrace HTML, le frontend reçoit un JSON propre
@RestControllerAdvice
public class GlobalExceptionHandler {

    // IllegalArgumentException → 400 Bad Request
    // Ex : ISIN inconnu, way invalide
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleBadRequest(
            IllegalArgumentException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                "timestamp", LocalDateTime.now().toString(),
                "status",    400,
                "error",     "Bad Request",
                "message",   ex.getMessage()
        ));
    }

    // RuntimeException → 500 Internal Server Error
    // Ex : taux manquants, données Bloomberg absentes
    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String, Object>> handleServerError(
            RuntimeException ex) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "timestamp", LocalDateTime.now().toString(),
                "status",    500,
                "error",     "Internal Server Error",
                "message",   ex.getMessage() != null ? ex.getMessage() : "Erreur interne"
        ));
    }
}
