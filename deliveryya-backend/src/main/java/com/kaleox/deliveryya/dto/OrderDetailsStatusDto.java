package com.kaleox.deliveryya.dto;

import lombok.*;
import lombok.experimental.FieldDefaults;

@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class OrderDetailsStatusDto {

    Integer totalOrders;
    Integer pendingOrders;
    Integer deliveredOrders;
    Integer deliveringOrders;
    Integer cancelledOrders;
    Integer returningOrders;
    Integer returnedOrders;

}
