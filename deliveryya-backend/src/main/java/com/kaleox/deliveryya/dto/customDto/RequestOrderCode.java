package com.kaleox.deliveryya.dto.customDto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

@Data
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class RequestOrderCode {

    @NotNull(message = "Quantity is required")
    @Min(value = 1, message = "Quantity must be at least 1")
    @Max(value = 300, message = "Quantity must be at most 300")
    Integer qty;

    @NotNull(message = "Order Code Request Id is required")
    Integer orderCodeRequestId;

    Integer userId;

    Boolean printedBarcodesNeeded;
}
