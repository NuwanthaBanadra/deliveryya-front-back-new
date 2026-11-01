package com.kaleox.deliveryya.dto.order;

import com.kaleox.deliveryya.dto.DeliveryToDto;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
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
public class UpdateDeliveryToDetailsDto {
    Integer orderId;
    String orderCode;

    @Valid
    @NotNull
    DeliveryToDto deliveryTo;
}

