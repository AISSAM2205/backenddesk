package ma.attijariwafa.desk_international.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class WsHeartbeatService {

    private final SimpMessagingTemplate messagingTemplate;

    @Scheduled(fixedRate = 30_000)
    public void pushHeartbeat() {
        messagingTemplate.convertAndSend("/topic/heartbeat",
                Map.of("ts", System.currentTimeMillis(), "type", "heartbeat"));
        log.debug("[WS] Heartbeat envoyé");
    }
}
