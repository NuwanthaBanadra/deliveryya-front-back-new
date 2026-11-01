package com.kaleox.deliveryya.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.io.Serializable;

/**
 * DTO for {@link com.kaleox.deliveryya.entities.ProductImage}
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ProductImageDto implements Serializable {
    Integer id;
    @NotNull
    @Size(max = 150)
    String url;
    Boolean isDefault;
    @NotNull
    ProductDto products;
}