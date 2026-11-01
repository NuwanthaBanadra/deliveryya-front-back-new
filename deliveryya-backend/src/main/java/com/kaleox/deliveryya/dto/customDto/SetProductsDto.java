package com.kaleox.deliveryya.dto.customDto;

import com.kaleox.deliveryya.dto.ProductDto;
import com.kaleox.deliveryya.dto.StockDto;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import java.util.List;


@Data
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class SetProductsDto {

    @Valid
    @NotNull
    ProductDto products;

    @Valid
    @NotNull
    List<StockDto> stocks;

    @NotNull
    List<String> imageUrls;

}
