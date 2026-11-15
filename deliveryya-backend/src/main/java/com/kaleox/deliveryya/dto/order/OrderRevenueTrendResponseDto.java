package com.kaleox.deliveryya.dto.order;

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
public class OrderRevenueTrendResponseDto {
    private LocalDate fromDate;
    private LocalDate toDate;
    private Integer userId;
    private List<TrendPointDto> points;

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class TrendPointDto {
        private LocalDate date;
        private Long orderCount;
        private Double totalPrice;
        private Double collectivePrice;
        private Double deliveryFee;
        private Double income;
    }
}

