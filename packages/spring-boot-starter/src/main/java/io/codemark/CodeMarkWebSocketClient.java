package io.codemark;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import org.springframework.web.socket.*;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;

import java.io.IOException;
import java.net.URI;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.function.BiConsumer;
import java.util.logging.Logger;

public class CodeMarkWebSocketClient implements WebSocketHandler {

    private static final Logger log = Logger.getLogger(CodeMarkWebSocketClient.class.getName());
    private static final Gson gson = new Gson();

    private final String serverUrl;
    private WebSocketSession session;
    private String adapterId;
    private final CopyOnWriteArrayList<BiConsumer<String, JsonObject>> messageHandlers = new CopyOnWriteArrayList<>();
    private final Map<String, SourceCallback> sourceCallbacks = new ConcurrentHashMap<>();

    public CodeMarkWebSocketClient(String serverUrl) {
        this.serverUrl = serverUrl;
    }

    public void connect() {
        try {
            StandardWebSocketClient client = new StandardWebSocketClient();
            client.execute(this, serverUrl).thenAccept(session -> {
                this.session = session;
                log.info("[CodeMark] Connected to Agent Server: " + serverUrl);
                register();
            }).exceptionally(ex -> {
                log.warning("[CodeMark] Connection failed: " + ex.getMessage());
                scheduleReconnect();
                return null;
            });
        } catch (Exception e) {
            log.warning("[CodeMark] Connection error: " + e.getMessage());
            scheduleReconnect();
        }
    }

    private void register() {
        JsonObject payload = new JsonObject();
        payload.addProperty("type", "backend");
        payload.addProperty("language", "java");
        payload.addProperty("framework", "spring-boot");
        send("adapter:register", payload);
    }

    private void scheduleReconnect() {
        new Thread(() -> {
            try {
                Thread.sleep(3000);
                connect();
            } catch (InterruptedException ignored) {}
        }).start();
    }

    public void send(String event, Object payload) {
        if (session == null || !session.isOpen()) return;
        try {
            JsonObject msg = new JsonObject();
            msg.addProperty("event", event);
            msg.add("payload", gson.toJsonTree(payload));
            msg.addProperty("timestamp", System.currentTimeMillis());
            session.sendMessage(new TextMessage(gson.toJson(msg)));
        } catch (IOException e) {
            log.warning("[CodeMark] Send failed: " + e.getMessage());
        }
    }

    public void onMessage(BiConsumer<String, JsonObject> handler) {
        messageHandlers.add(handler);
    }

    public void registerSourceCallback(String requestId, SourceCallback callback) {
        sourceCallbacks.put(requestId, callback);
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        this.session = session;
    }

    @Override
    public void handleMessage(WebSocketSession session, WebSocketMessage<?> message) {
        try {
            JsonObject msg = gson.fromJson(message.getPayload().toString(), JsonObject.class);
            String event = msg.get("event").getAsString();
            JsonObject payload = msg.has("payload") ? msg.getAsJsonObject("payload") : new JsonObject();

            switch (event) {
                case "adapter:registered":
                    this.adapterId = payload.get("adapterId").getAsString();
                    log.info("[CodeMark] Registered as " + adapterId);
                    break;
                case "backend:get-source":
                    handleSourceRequest(payload);
                    break;
                case "backend:restart":
                    log.info("[CodeMark] Restart requested by Agent Server");
                    break;
            }

            messageHandlers.forEach(h -> h.accept(event, payload));
        } catch (Exception e) {
            log.warning("[CodeMark] Message parse error: " + e.getMessage());
        }
    }

    private void handleSourceRequest(JsonObject payload) {
        String filePath = payload.get("filePath").getAsString();
        String requestId = payload.get("requestId").getAsString();

        try {
            String root = System.getProperty("user.dir");
            java.nio.file.Path fullPath = java.nio.file.Path.of(root, filePath);
            String content = java.nio.file.Files.readString(fullPath);

            JsonObject response = new JsonObject();
            response.addProperty("requestId", requestId);
            response.addProperty("content", content);
            send("backend:source-response", response);
        } catch (IOException e) {
            JsonObject response = new JsonObject();
            response.addProperty("requestId", requestId);
            response.addProperty("content", "");
            response.addProperty("error", e.getMessage());
            send("backend:source-response", response);
        }
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) {
        log.warning("[CodeMark] Transport error: " + exception.getMessage());
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus closeStatus) {
        log.info("[CodeMark] Connection closed, reconnecting...");
        scheduleReconnect();
    }

    @Override
    public boolean supportsPartialMessages() {
        return false;
    }

    public interface SourceCallback {
        void onResult(String content, String error);
    }
}
