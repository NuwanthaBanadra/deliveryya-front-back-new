package com.kaleox.deliveryya.dto;

import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.io.Serializable;

/**
 * DTO for {@link com.kaleox.deliveryya.entities.DeliveryFee}
 */
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class DeliveryFeeDto implements Serializable {
    Integer id;
    @NotNull
    CityDto city;
    @NotNull
    Double fee;
    @NotNull
    Double additionalFee;
}
