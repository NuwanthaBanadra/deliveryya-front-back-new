package com.kaleox.deliveryya.dto.order;

import com.kaleox.deliveryya.dto.OrderDto;
import com.kaleox.deliveryya.entities.Delivery;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import java.util.List;

@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
@FieldDefaults(level = lombok.AccessLevel.PRIVATE)
public class OrderHistoryDto {
    OrderDto order;

    List<Delivery> history;
}
