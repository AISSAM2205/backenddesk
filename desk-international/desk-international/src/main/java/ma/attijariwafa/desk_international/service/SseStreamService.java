package ma.attijariwafa.desk_international.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
@Slf4j
public class SseStreamService {

    private final List<SseEmitter> emitters = new CopyOnWriteArrayList<>();

    public SseEmitter addEmitter() {
        SseEmitter emitter = new SseEmitter(300_000L); // 5 minutes timeout
        emitter.onCompletion(() -> emitters.remove(emitter));
        emitter.onTimeout(()    -> emitters.remove(emitter));
        emitter.onError(e      -> emitters.remove(emitter));
        emitters.add(emitter);

        // Envoyer un heartbeat immédiat pour confirmer la connexion
        sendHeartbeat(emitter);
        return emitter;
    }

    // Heartbeat toutes les 30 secondes → le frontend appelle loadAll() à la réception
    @Scheduled(fixedRate = 30_000)
    public void pushHeartbeat() {
        if (emitters.isEmpty()) return;
        log.debug("[SSE] Push heartbeat à {} clients", emitters.size());
        emitters.forEach(this::sendHeartbeat);
    }

    private void sendHeartbeat(SseEmitter emitter) {
        try {
            // Pas de .name() → géré par onmessage du frontend → déclenche loadAll()
            emitter.send(SseEmitter.event()
                    .data(Map.of("ts", System.currentTimeMillis(), "type", "heartbeat"))
                    .id(String.valueOf(System.currentTimeMillis())));
        } catch (IOException e) {
            emitters.remove(emitter);
            emitter.completeWithError(e);
        }
    }

    public int getConnectedClients() {
        return emitters.size();
    }
}
