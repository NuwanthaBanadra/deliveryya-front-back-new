package com.kaleox.deliveryya.service.impl;

import com.kaleox.deliveryya.config.BusinessException;
import com.kaleox.deliveryya.dto.NotificationDto;
import com.kaleox.deliveryya.dto.paginatedDto.PaginatedNotificationDto;
import com.kaleox.deliveryya.dto.user.NotificationTemplateDto;
import com.kaleox.deliveryya.entities.AccessToken;
import com.kaleox.deliveryya.entities.Notification;
import com.kaleox.deliveryya.entities.User;
import com.kaleox.deliveryya.repo.AccessTokenRepo;
import com.kaleox.deliveryya.repo.NotificationRepo;
import com.kaleox.deliveryya.repo.UserRepo;
import com.kaleox.deliveryya.service.NotificationService;
import com.kaleox.deliveryya.utill.FirebaseAuthUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class NotificationServiceImpl implements NotificationService {

    private final RestTemplate restTemplate = new RestTemplate();
    private final String FCM_API_URL = "https://fcm.googleapis.com/v1/projects/deliveryya-3b144/messages:send";

    private final UserRepo userRepo;
    private final AccessTokenRepo accessTokenRepo;
    private final NotificationRepo notificationRepo;

    private record NotificationSendResult(int sentCount, int failedCount, int removedUnregisteredCount, int totalTargetTokens) {
    }

    @Override
    public String sendNotification(NotificationTemplateDto dto) {
        NotificationSendResult result = processNotification(dto, null);

        return "Notifications sent successfully. Sent: " + result.sentCount
                + ", Failed: " + result.failedCount
                + ", Removed unregistered tokens: " + result.removedUnregisteredCount;
    }

    @Override
    public SseEmitter sendNotificationSse(NotificationTemplateDto dto) {
        SseEmitter emitter = new SseEmitter(0L);

        CompletableFuture.runAsync(() -> {
            try {
                sendEvent(emitter, "started", Map.of("message", "Notification sending started"));

                NotificationSendResult result = processNotification(dto, (processed, total, sent, failed, removed) -> {
                    int progress = total == 0 ? 100 : (processed * 100) / total;
                    sendEvent(emitter, "progress", Map.of(
                            "processedTokens", processed,
                            "totalTokens", total,
                            "progress", progress,
                            "sent", sent,
                            "failed", failed,
                            "removedUnregistered", removed
                    ));
                });

                sendEvent(emitter, "completed", Map.of(
                        "message", "Notifications sent successfully",
                        "sent", result.sentCount,
                        "failed", result.failedCount,
                        "removedUnregistered", result.removedUnregisteredCount,
                        "totalTokens", result.totalTargetTokens
                ));
                emitter.complete();
            } catch (Exception ex) {
                try {
                    sendEvent(emitter, "error", Map.of("message", ex.getMessage() != null ? ex.getMessage() : "Notification sending failed"));
                } catch (Exception eventException) {
                    log.warn("Failed to send SSE error event", eventException);
                }
                emitter.completeWithError(ex);
            }
        });

        return emitter;
    }

    private NotificationSendResult processNotification(NotificationTemplateDto dto, ProgressCallback progressCallback) {
        HttpHeaders headers = new HttpHeaders();
        String accessToken = FirebaseAuthUtil.getAccessToken();

        headers.setBearerAuth(accessToken);
        headers.setContentType(MediaType.APPLICATION_JSON);

        List<Integer> requestedUserIds = dto.getToUsers();
        if (requestedUserIds == null || requestedUserIds.isEmpty()) {
            throw new BusinessException("toUsers is required", null);
        }

        Set<Integer> uniqueUserIds = new LinkedHashSet<>(requestedUserIds);
        Map<Integer, User> usersById = userRepo.findAllById(uniqueUserIds).stream()
                .collect(Collectors.toMap(User::getId, user -> user));

        if (usersById.size() != uniqueUserIds.size()) {
            List<Integer> missingUsers = uniqueUserIds.stream()
                    .filter(userId -> !usersById.containsKey(userId))
                    .toList();
            throw new BusinessException("Retrieving User not found for ids: " + missingUsers, null);
        }

        List<Integer> notifyTo = dto.getNotifyTo();

        Map<Integer, List<AccessToken>> filteredTokensByUser = new LinkedHashMap<>();
        int totalTargetTokens = 0;

        for (Integer userId : uniqueUserIds) {
            User user = usersById.get(userId);
            List<AccessToken> tokens = accessTokenRepo.findAllByUsers(user);

            List<AccessToken> filteredTokens;
            if (notifyTo == null || notifyTo.isEmpty()) {
                filteredTokens = tokens;
            } else {
                filteredTokens = tokens.stream()
                        .filter(token -> notifyTo.stream().anyMatch(id -> id.equals(token.getTokenType().getId())))
                        .toList();
            }

            filteredTokensByUser.put(userId, filteredTokens);
            totalTargetTokens += filteredTokens.size();
        }

        int sentNotificationsCount = 0;
        int failedNotificationsCount = 0;
        int removedUnregisteredTokensCount = 0;
        int processedTokensCount = 0;

        for (Integer userId : uniqueUserIds) {
            User user = usersById.get(userId);

            if (dto.getNotificationType().equals("MESSAGE")) {
                notificationRepo.save(Notification.builder()
                        .users(user)
                        .title(dto.getTitle())
                        .message(dto.getMessage())
                        .isRead(false)
                        .build());
            }

            List<AccessToken> accessTokenList = filteredTokensByUser.getOrDefault(userId, new ArrayList<>());
            if (accessTokenList.isEmpty()) {
                continue;
            }

            // Iterate over tokens
            for (AccessToken token : accessTokenList) {

                // ✅ Build v1 API payload
                String payload = "{"
                        + "\"message\":{"
                        + "\"token\":\"" + token.getToken() + "\","
                        + "\"notification\":{"
                        + "\"title\":\"" + dto.getTitle() + "\","
                        + "\"body\":\"" + dto.getMessage() + "\""
                        + "},"
                        + "\"data\":{"
                        + "\"type\":\"" + dto.getNotificationType() + "\""
                        + "}"
                        + "}"
                        + "}";

                HttpEntity<String> request = new HttpEntity<>(payload, headers);
                try {
                    restTemplate.postForEntity(FCM_API_URL, request, String.class);
                    sentNotificationsCount++;
                } catch (HttpClientErrorException.NotFound ex) {
                    String responseBody = ex.getResponseBodyAsString();
                    if (responseBody.contains("UNREGISTERED")) {
                        accessTokenRepo.delete(token);
                        removedUnregisteredTokensCount++;
                        continue;
                    }
                    failedNotificationsCount++;
                    log.warn("FCM 404 while sending notification to token id {}", token.getId(), ex);
                } catch (RestClientException ex) {
                    failedNotificationsCount++;
                    log.warn("FCM send failed for token id {}", token.getId(), ex);
                }

                processedTokensCount++;
                if (progressCallback != null) {
                    progressCallback.onProgress(processedTokensCount, totalTargetTokens, sentNotificationsCount, failedNotificationsCount, removedUnregisteredTokensCount);
                }
            }
        }

        if (sentNotificationsCount == 0) {
            throw new BusinessException("Could not send notifications. No valid device tokens were available for requested users/devices", null);
        }

        return new NotificationSendResult(sentNotificationsCount, failedNotificationsCount, removedUnregisteredTokensCount, totalTargetTokens);
    }

    private void sendEvent(SseEmitter emitter, String eventName, Object payload) {
        try {
            emitter.send(SseEmitter.event().name(eventName).data(payload));
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }

    @FunctionalInterface
    private interface ProgressCallback {
        void onProgress(int processedTokens, int totalTokens, int sent, int failed, int removedUnregistered);
    }

    @Override
    public PaginatedNotificationDto getAllNotifications(PaginatedNotificationDto dto) {
        Pageable pageable = PageRequest.of(dto.getPageNumber(), dto.getCountPerPage(), Sort.by("id").descending());
        Page<Notification> notifications = notificationRepo.findAllByUsersId(dto.getUserId(), pageable);

        List<NotificationDto> notificationDtos = notifications.stream().map(notification -> NotificationDto.builder()
                .id(notification.getId())
                .title(notification.getTitle())
                .message(notification.getMessage())
                .isRead(notification.getIsRead())
                .userId(notification.getUsers().getId())
                .build()).toList();

        dto.setTotalCount(notifications.getTotalElements());
        dto.setTotalPages(notifications.getTotalPages());
        dto.setItems(notificationDtos);

        return dto;
    }

    @Override
    public void deleteNotification(Integer id, Integer userId) {
        Notification notification = notificationRepo.findById(id)
                .orElseThrow(() -> new BusinessException("Notification not found", null));

//        if (!notification.getUsers().getId().equals(userId)) {
//            throw new BusinessException("You are not authorized to delete this notification", null);
//        }

        notificationRepo.delete(notification);
    }

    @Override
    public void markAsRead(Integer id, Integer userId) {
        Notification notification = notificationRepo.findById(id)
                .orElseThrow(() -> new BusinessException("Notification not found", null));

        if (!notification.getUsers().getId().equals(userId)) {
            throw new BusinessException("You are not authorized to mark this notification as read", null);
        }

        notification.setIsRead(true);
        notificationRepo.save(notification);
    }
}
