package com.kaleox.deliveryya.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UpdateStockDto {

    @NotNull
    Integer productId;

    @Valid
    @NotNull
    List<StockDto> stockDtoList;
}
