package com.kaleox.deliveryya.dto.order;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;

@Value
@Builder
public class DeliveryHistoryItemDto {
    Integer deliveryId;
    Integer orderId;
    String orderCode;
    String recipientName;
    String recipientMobile;
    String address;
    Double totalPrice;
    Double collectivePrice;
    String paymentStatus;
    Integer deliveryStatusId;
    String deliveryStatus;
    String note;
    LocalDateTime eventAt;
}
