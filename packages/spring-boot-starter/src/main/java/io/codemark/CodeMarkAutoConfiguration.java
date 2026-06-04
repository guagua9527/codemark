package io.codemark;

import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;

@AutoConfiguration
@EnableConfigurationProperties(CodeMarkProperties.class)
@ConditionalOnProperty(prefix = "codemark", name = "enabled", havingValue = "true", matchIfMissing = true)
public class CodeMarkAutoConfiguration {

    @Bean
    public CodeMarkWebSocketClient codemarkWebSocketClient(CodeMarkProperties properties) {
        CodeMarkWebSocketClient client = new CodeMarkWebSocketClient(properties.getServerUrl());
        client.connect();
        return client;
    }

    @Bean
    public CodeMarkRouteScanner codemarkRouteScanner(
            RequestMappingHandlerMapping handlerMapping,
            CodeMarkWebSocketClient wsClient) {
        return new CodeMarkRouteScanner(handlerMapping, wsClient);
    }

    @Bean
    public CodeMarkExceptionHandler codemarkExceptionHandler(CodeMarkWebSocketClient wsClient) {
        return new CodeMarkExceptionHandler(wsClient);
    }

    @Bean
    public WebMvcConfigurer codemarkWebConfigurer(CodeMarkWebSocketClient wsClient) {
        return new WebMvcConfigurer() {
            @Override
            public void addInterceptors(InterceptorRegistry registry) {
                registry.addInterceptor(new CodeMarkRequestInterceptor(wsClient))
                        .addPathPatterns("/**");
            }
        };
    }
}
