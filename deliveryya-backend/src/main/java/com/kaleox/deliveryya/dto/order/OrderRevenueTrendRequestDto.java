package com.kaleox.deliveryya.dto.order;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class OrderRevenueTrendRequestDto {
    @NotNull
    private LocalDate fromDate;

    @NotNull
    private LocalDate toDate;

    private Integer userId;
    private List<Integer> deliveryStatusIds;
    private List<Integer> paymentTypeIds;

    @Builder.Default
    private Boolean includeOrderCount = true;

    @Builder.Default
    private Boolean includeTotalPrice = false;

    @Builder.Default
    private Boolean includeCollectivePrice = false;

    @Builder.Default
    private Boolean includeDeliveryFee = false;

    @Builder.Default
    private Boolean includeIncome = false;
}

