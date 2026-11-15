package com.kaleox.deliveryya.dto.delivery;

import com.kaleox.deliveryya.dto.StockDto;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;
import lombok.Value;

import java.io.Serializable;

/**
 * DTO for {@link com.kaleox.deliveryya.entities.MarketOrderItem}
 */
@Value
@Builder
public class MarketOrderItemDto implements Serializable {
    Integer id;
    @NotNull
    Double qty;
    @NotNull
    Double price;
    @NotNull
    Integer stockId;

    Integer marketOrderId;
}