package com.kaleox.deliveryya.dto;

import com.kaleox.deliveryya.dto.customDto.UpdateGroup;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.io.Serializable;

/**
 * DTO for {@link com.kaleox.deliveryya.entities.Stock}
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class StockDto implements Serializable {

    Integer id;

    @NotNull
    Double cost;

    Double showingPrice;

    @NotNull
    Double sellingPrice;

    @NotNull
    Double qty;

    @NotNull
    UnitDto unit;

    @NotNull(groups = UpdateGroup.class)
    ProductDto products;

    @Size(max = 45)
    String emi;

    @NotNull
    @Size(max = 10)
    String color;

    SizeDto sizes;

    @NotNull
    Double wpu;

    Boolean isActive = false;
}