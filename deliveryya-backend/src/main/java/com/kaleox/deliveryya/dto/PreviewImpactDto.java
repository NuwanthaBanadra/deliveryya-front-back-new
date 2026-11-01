package com.kaleox.deliveryya.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PreviewImpactDto {
    private Integer stockCount;
    private Integer imageCount;
    private Integer feedbackCount;
    private Integer orderItemCount;
    private List<String> blocksDeletion;
    private List<String> willBeDeleted;
    private List<BrandDetailDto> brandDetails;
    private Integer totalProductCount;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BrandDetailDto {
        private Integer brandId;
        private String brandName;
        private Integer productCount;
    }
}
