package com.kaleox.deliveryya.dto;

import com.kaleox.deliveryya.dto.delivery.MarketOrderItemDto;
import com.kaleox.deliveryya.dto.user.UserDto;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.List;

/**
 * DTO for {@link com.kaleox.deliveryya.entities.MarketOrder}
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class MarketOrderDto implements Serializable {
    private Integer id;
    @NotNull
    private Double qty;
    @NotNull
    private Double price;
    private Double discount;
    @NotNull
    private UserDto user;

    private List<MarketOrderItemDto> items;
}