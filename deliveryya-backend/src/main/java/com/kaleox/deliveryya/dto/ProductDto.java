package com.kaleox.deliveryya.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.io.Serializable;
import java.util.List;

/**
 * DTO for {@link com.kaleox.deliveryya.entities.Product}
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ProductDto implements Serializable {
    Integer id;

    @NotNull
    @Size(max = 45)
    String name;

    @NotNull
    String desc;

    @NotNull
    @Size(max = 30)
    String code;

    @NotNull
    BrandDto brand;

    @NotNull
    CategoryDto category;

    // Kept for API filter/display compatibility; derived from category.markets.
    @NotNull
    Integer marketId;

    String sellingPrice;

    String showingPrice;

    Boolean isActive;

    Double rating;

    Double availableTotalStockQty;

    List<ProductImageDto> productImages;
}
