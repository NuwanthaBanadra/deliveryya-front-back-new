package com.kaleox.deliveryya.dto.order;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class OrderDashboardSummaryDto {
    private Long totalOrderCount;
    private Double totalOrderValue;
    private Double totalIncome;
    private Double thisMonthIncome;
    private Double lastMonthIncome;
    private List<DeliveryStatusSummaryDto> statuses;

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class DeliveryStatusSummaryDto {
        private Integer deliveryStatusId;
        private String deliveryStatusName;
        private Long orderCount;
        private Double totalOrderValue;
        private Double totalIncome;
    }
}

