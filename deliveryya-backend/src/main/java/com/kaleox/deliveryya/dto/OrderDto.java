package com.kaleox.deliveryya.dto;

import com.kaleox.deliveryya.dto.customDto.CommonIdNameDto;
import com.kaleox.deliveryya.dto.customDto.CreateGroup;
import com.kaleox.deliveryya.dto.order.ThirdPartySendersDto;
import com.kaleox.deliveryya.dto.user.UserDto;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * DTO for {@link com.kaleox.deliveryya.entities.Order}
 */
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class OrderDto implements Serializable {
    Integer id;
    MarketOrderDto marketOrder;


    @NotNull
    @Min(0)
    Double discount;

    @Valid
    CommonIdNameDto stock;

    CommonIdNameDto paymentStatus;
    @NotNull
    CommonIdNameDto paymentType;

    @Min(0)
    Double deliveryFee;
    @NotNull
    @Min(0)
    Double collectivePrice;
    @NotNull
    Double qty;

    @NotNull
    @Min(0)
    Double totalPrice;
    String desc;

    DeliveryStatusDto deliveryStatus = DeliveryStatusDto.builder().id(1).build();

    @NotNull
    Double weight;

    @Valid
    @NotNull(groups = CreateGroup.class)
    DeliveryToDto deliveryTo;

    @NotNull
    OrderCodeDto orderCode;

    @Builder.Default
    Double paidAmount = 0.00;

    UserDto user;
    Integer userId;

    LocalDateTime createdAt;

    Boolean dontCollectDeliveryFeeFromCustomer = false;
    Boolean deliveryFeeCollected = false;

    @Valid
    ThirdPartySendersDto thirdPartySenders;
//    @AllArgsConstructor
//    @NoArgsConstructor
//    @Builder
//    @Data
//    @FieldDefaults(level = AccessLevel.PRIVATE)
//    public static class GetIdSubDto {
//        @NotNull
//        Integer id;
//    }
}