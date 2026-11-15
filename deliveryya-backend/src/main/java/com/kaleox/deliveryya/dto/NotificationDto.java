package com.kaleox.deliveryya.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class NotificationDto {
    private Integer id;
    private String title;
    private String message;
    private Boolean isRead;
    private Integer userId;
}

