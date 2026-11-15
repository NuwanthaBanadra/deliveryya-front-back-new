package com.kaleox.deliveryya.config;

import com.kaleox.deliveryya.controller.LiveLocationController;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Lazy;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;
import org.springframework.web.socket.handler.TextWebSocketHandler;

@Configuration
@EnableWebSocket
@RequiredArgsConstructor
@Slf4j
public class RawWebSocketConfig implements WebSocketConfigurer {

    @Lazy
    private final LiveLocationController liveLocationController;

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(new TextWebSocketHandler() {
            @Override
            public void handleTextMessage(WebSocketSession session, TextMessage message) {
                String payload = message.getPayload();
                log.info("Received raw WebSocket message from {}", session.getId());
                if (session.getPrincipal() != null) {
                    liveLocationController.processRawLocationUpdate(session.getPrincipal(), payload);
                } else {
                    log.warn("Unauthenticated raw websocket message from {}", session.getId());
                }
            }

            @Override
            public void afterConnectionEstablished(WebSocketSession session) {
                log.info("Raw WebSocket connected: {}", session.getId());
            }

            @Override
            public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
                log.info("Raw WebSocket disconnected: {}", session.getId());
            }

        }, "/ws-raw")
        .setAllowedOriginPatterns("*");
    }
}
