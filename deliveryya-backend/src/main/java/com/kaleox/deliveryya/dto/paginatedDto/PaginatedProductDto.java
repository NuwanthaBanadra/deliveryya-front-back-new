package com.kaleox.deliveryya.dto.paginatedDto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;
import java.util.List;

@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class PaginatedProductDto {

    private final String DEFAULT_GET_PRODUCT_PRICE_AS_STOCKS = "Middle";

    @NotNull
    Integer pageNumber;

    @NotNull
    Integer countPerPage;

    Long totalCount;
    Integer totalPages;
    Integer categoryId;
    Integer productId;
    Integer brandId;
    Integer marketId;

    Boolean orderByTopSales;
    Boolean orderByMaxPrice;
    Boolean orderByLowPrice;
    Boolean trendingProducts;
    Boolean getActiveStocksCount = true;
    Double fromPrice;
    Double toPrice;
    @Min(0)
    @Max(5)
    Integer orderByRate;
    LocalDateTime fromDate;
    LocalDateTime toDate;
    Boolean isActive;
    Boolean inStock;
    Boolean outOfStock;

    //Lowest, Middle, Highest
    String getProductPriceAsStocks = DEFAULT_GET_PRODUCT_PRICE_AS_STOCKS;

    String search;
    List<?> items;
}
