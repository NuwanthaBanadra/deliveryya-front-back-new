package com.kaleox.deliveryya.dto.order;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UpdateOrderDetailsDto {
    Integer orderId;
    String orderCode;

    Double discount;
    Double qty;
    Double totalPrice;
    String desc;
    Double weight;
    Integer paymentTypeId;
    Double paidAmount;
    Boolean dontCollectDeliveryFeeFromCustomer;

    Boolean removeThirdPartySender;
    ThirdPartySendersDto thirdPartySenders;
}

