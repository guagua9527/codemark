package io.codemark;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.mvc.method.RequestMappingInfo;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;

import java.lang.reflect.Method;
import java.util.Map;
import java.util.logging.Logger;

public class CodeMarkRouteScanner implements InitializingBean {

    private static final Logger log = Logger.getLogger(CodeMarkRouteScanner.class.getName());

    private final RequestMappingHandlerMapping handlerMapping;
    private final CodeMarkWebSocketClient wsClient;

    public CodeMarkRouteScanner(RequestMappingHandlerMapping handlerMapping, CodeMarkWebSocketClient wsClient) {
        this.handlerMapping = handlerMapping;
        this.wsClient = wsClient;
    }

    @Override
    public void afterPropertiesSet() {
        scanAndPushRoutes();
    }

    public void scanAndPushRoutes() {
        Map<RequestMappingInfo, HandlerMethod> map = handlerMapping.getHandlerMethods();
        JsonArray routes = new JsonArray();

        for (Map.Entry<RequestMappingInfo, HandlerMethod> entry : map.entrySet()) {
            RequestMappingInfo info = entry.getKey();
            HandlerMethod handler = entry.getValue();

            Method method = handler.getMethod();
            Class<?> clazz = handler.getBeanType();

            String handlerFile = getSourceFile(clazz);
            int handlerLine = getMethodLine(method);

            for (String path : info.getPathPatternsCondition().getPatternValues()) {
                for (org.springframework.web.bind.annotation.RequestMethod httpMethod :
                        info.getMethodsCondition().getMethods()) {
                    JsonObject route = new JsonObject();
                    route.addProperty("method", httpMethod.name());
                    route.addProperty("path", path);
                    route.addProperty("handlerFile", handlerFile);
                    route.addProperty("handlerLine", handlerLine);

                    JsonArray middleware = new JsonArray();
                    route.add("middlewareChain", middleware);

                    routes.add(route);
                }
            }
        }

        JsonObject payload = new JsonObject();
        payload.add("routes", routes);
        wsClient.send("backend:routes", payload);
        log.info("[CodeMark] Pushed " + routes.size() + " routes to Agent Server");
    }

    private String getSourceFile(Class<?> clazz) {
        try {
            return clazz.getProtectionDomain().getCodeSource().getLocation().getPath()
                + clazz.getName().replace('.', '/') + ".java";
        } catch (Exception e) {
            return clazz.getName().replace('.', '/') + ".java";
        }
    }

    private int getMethodLine(Method method) {
        return 0;
    }
}
