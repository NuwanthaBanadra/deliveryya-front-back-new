package com.kaleox.deliveryya.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.io.Serializable;

/**
 * DTO for {@link com.kaleox.deliveryya.entities.Size}
 */
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class SizeDto implements Serializable {
    Integer id;
    @NotNull
    @Size(max = 30)
    String name;
    Integer productId;
    Integer marketId;
}