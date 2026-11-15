package com.kaleox.deliveryya.service;

import com.kaleox.deliveryya.dto.paginatedDto.PaginatedNotificationDto;
import com.kaleox.deliveryya.dto.user.NotificationTemplateDto;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

public interface NotificationService {

    String sendNotification(NotificationTemplateDto dto);

    SseEmitter sendNotificationSse(NotificationTemplateDto dto);

    PaginatedNotificationDto getAllNotifications(PaginatedNotificationDto dto);

    void deleteNotification(Integer id, Integer userId);

    void markAsRead(Integer id, Integer userId);
}
