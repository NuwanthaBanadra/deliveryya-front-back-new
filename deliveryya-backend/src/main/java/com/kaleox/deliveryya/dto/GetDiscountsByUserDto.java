package com.kaleox.deliveryya.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.io.Serializable;

/**
 * DTO for getting discounts by user ID
 */
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class GetDiscountsByUserDto implements Serializable {
    @NotNull(message = "User ID must not be null")
    Integer userId;
}
