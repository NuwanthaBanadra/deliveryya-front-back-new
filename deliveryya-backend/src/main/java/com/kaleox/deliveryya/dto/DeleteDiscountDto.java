package com.kaleox.deliveryya.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.io.Serializable;

/**
 * DTO for deleting a discount
 */
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class DeleteDiscountDto implements Serializable {
    @NotNull(message = "User ID must not be null")
    Integer userId;

    @NotNull(message = "City ID must not be null")
    Integer cityId;
}
