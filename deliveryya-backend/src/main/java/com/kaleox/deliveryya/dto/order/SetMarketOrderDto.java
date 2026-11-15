package com.kaleox.deliveryya.dto.order;

import com.kaleox.deliveryya.dto.DeliveryToDto;
import com.kaleox.deliveryya.dto.customDto.CommonIdNameDto;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.io.Serializable;
import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class SetMarketOrderDto implements Serializable {

    @NotNull
    @Valid
    DeliveryToDto deliveryTo;

    @NotNull
    @Valid
    List<Stock> stocks;

//    @NotBlank
    String cuponCode;

    @NotNull
    @Valid
    CommonIdNameDto paymentType;

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    @Builder
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class Stock {

        @NotNull
        Integer id;

        @NotNull
        Double qty;
    }

}
