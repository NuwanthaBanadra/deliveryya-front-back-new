package com.kaleox.deliveryya.dto;

import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.io.Serializable;
import java.util.List;

/**
 * DTO for creating a discount with multiple cities
 */
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CreateDiscountDto implements Serializable {
    @NotNull
    Integer userId;
    
    @NotNull
    List<Integer> cityIds;
    
    @NotNull
    Double discount;
}
