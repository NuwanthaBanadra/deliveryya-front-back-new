package com.kaleox.deliveryya.dto;

import com.kaleox.deliveryya.dto.user.UserDto;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.io.Serializable;

/**
 * DTO for {@link com.kaleox.deliveryya.entities.Discount}
 */
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class DiscountDto implements Serializable {
    Integer id;
    @NotNull
    UserDto user;
    @NotNull
    CityDto city;
    @NotNull
    Double discount;
}
