package ma.attijariwafa.desk_international.controller;

import lombok.RequiredArgsConstructor;
import ma.attijariwafa.desk_international.service.SseStreamService;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api/stream")
@RequiredArgsConstructor
public class SseController {

    private final SseStreamService sseService;

    // Le frontend sseService.js se connecte à /api/stream/positions
    @GetMapping(value = "/positions", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamPositions() {
        return sseService.addEmitter();
    }
}
