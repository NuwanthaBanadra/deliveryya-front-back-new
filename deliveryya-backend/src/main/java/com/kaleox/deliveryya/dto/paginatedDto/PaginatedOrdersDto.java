package com.kaleox.deliveryya.dto.paginatedDto;

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
public class PaginatedOrdersDto {
    @NotNull
    Integer pageNumber;

    @NotNull
    Integer countPerPage;

    Long totalCount;
    Integer totalPages;

//    Integer brandId;
//    Integer categoryId;
//    Integer marketId;

    Integer cityId;
    Integer orderId;
    Integer userId;
    Integer markerOrderId;
    Integer deliveryStatusId;
    Integer paymentStatusId;
    Integer paymentTypeId;

    Integer thirdPartySendersId;
    Boolean searchThoughThirdPartyName = true;
    Boolean searchThoughThirdPartyNic = true;
    Boolean searchThoughThirdPartyNote = true;
    Boolean searchThoughThirdPartyAddress = true;
    Boolean searchThoughThirdPartyMobileNumbers = true;
    Boolean searchThoughDeliveryToFullName = true;
    Boolean searchThoughDeliveryToAddress = true;
    Boolean searchThoughDeliveryToMobileNumbers = true;
    Boolean searchThoughDeliveryTo = true;
    Boolean searchThoughMarketName = true;
    Boolean searchThoughMarketOrderName = true;


    String orderCode;
    Integer sendingUserId;
    Integer receivingUserId;

    Double minPrice;
    Double maxPrice;

    LocalDateTime fromDate;
    LocalDateTime toDate;

    Boolean dontCollectDeliveryFeeFromCustomer;

    String search;
    List<?> items;
}
