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
public class PaginatedPaymentRecodeDto {

    @NotNull
    Integer pageNumber;

    @NotNull
    Integer countPerPage;

    Long totalCount;
    Integer totalPages;

    Integer paymentRecodeId;
    Integer bankId;
    Integer orderId;
    Integer bankDetailId;
    Integer paymentTypeId;
    Integer marketId;

    Boolean isReturn;
    String code;
    Integer verificationStatusId;
    Integer clientId;

    Integer createdById;

    LocalDateTime fromDate;
    LocalDateTime toDate;

    Double minAmount;
    Double maxAmount;

    String search;
    List<?> items;
}

