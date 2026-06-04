package io.codemark;

import com.google.gson.JsonObject;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

import java.io.PrintWriter;
import java.io.StringWriter;
import java.util.UUID;
import java.util.logging.Logger;

@ControllerAdvice
public class CodeMarkExceptionHandler {

    private static final Logger log = Logger.getLogger(CodeMarkExceptionHandler.class.getName());

    private final CodeMarkWebSocketClient wsClient;

    public CodeMarkExceptionHandler(CodeMarkWebSocketClient wsClient) {
        this.wsClient = wsClient;
    }

    @ExceptionHandler(Throwable.class)
    public void handleException(Throwable ex, HttpServletRequest request) {
        String requestId = (String) request.getAttribute("__codemark_request_id");
        if (requestId == null) requestId = "";

        StringWriter sw = new StringWriter();
        ex.printStackTrace(new PrintWriter(sw));

        JsonObject error = new JsonObject();
        error.addProperty("id", UUID.randomUUID().toString());
        error.addProperty("source", "backend");
        error.addProperty("type", ex.getClass().getSimpleName());
        error.addProperty("message", ex.getMessage());
        error.addProperty("stack", sw.toString());
        error.addProperty("requestId", requestId);

        JsonObject payload = new JsonObject();
        payload.add("error", error);
        wsClient.send("backend:error", payload);

        log.warning("[CodeMark] Error captured: " + ex.getMessage());

        if (ex instanceof RuntimeException) {
            throw (RuntimeException) ex;
        }
        throw new RuntimeException(ex);
    }
}
