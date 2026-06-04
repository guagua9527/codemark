package io.codemark;

import com.google.gson.JsonObject;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.UUID;
import java.util.logging.Logger;

public class CodeMarkRequestInterceptor implements HandlerInterceptor {

    private static final Logger log = Logger.getLogger(CodeMarkRequestInterceptor.class.getName());

    private final CodeMarkWebSocketClient wsClient;

    public CodeMarkRequestInterceptor(CodeMarkWebSocketClient wsClient) {
        this.wsClient = wsClient;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        String requestId = request.getHeader("X-Request-ID");
        if (requestId == null || requestId.isEmpty()) {
            requestId = UUID.randomUUID().toString();
        }

        request.setAttribute("__codemark_request_id", requestId);
        request.setAttribute("__codemark_start_time", System.currentTimeMillis());
        response.setHeader("X-Request-ID", requestId);

        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
        String requestId = (String) request.getAttribute("__codemark_request_id");
        Long startTime = (Long) request.getAttribute("__codemark_start_time");

        long duration = startTime != null ? System.currentTimeMillis() - startTime : 0;

        JsonObject logEntry = new JsonObject();
        logEntry.addProperty("id", UUID.randomUUID().toString());
        logEntry.addProperty("requestId", requestId != null ? requestId : "");
        logEntry.addProperty("level", response.getStatus() >= 400 ? "error" : "info");
        logEntry.addProperty("message", String.format("%s %s %d %dms",
            request.getMethod(), request.getRequestURI(), response.getStatus(), duration));
        logEntry.addProperty("timestamp", System.currentTimeMillis());

        JsonObject payload = new JsonObject();
        payload.add("log", logEntry);
        wsClient.send("backend:log", payload);
    }
}
