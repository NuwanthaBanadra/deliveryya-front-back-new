package com.kaleox.deliveryya.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.io.Serializable;

@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class DeliveryFeeUpsertDto implements Serializable {
    @NotNull
    @Min(0)
    Integer id;

    @NotNull
    @Min(1)
    Integer cityId;

    @NotNull
    @PositiveOrZero
    Double fee;

    @NotNull
    @PositiveOrZero
    Double additionalFee;
}
