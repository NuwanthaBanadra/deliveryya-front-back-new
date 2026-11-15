package com.kaleox.deliveryya.dto.paginatedDto;

import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.List;

@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class PaginatedDeliveryFeesDto {
    @NotNull
    Integer pageNumber;

    @NotNull
    Integer countPerPage;

    Long totalCount;
    Integer totalPages;

    // New filter fields
    Integer deliveryFeeId;

    Double deliveryFeeFrom;
    Double deliveryFeeTo;

    Double additionalFeeFrom;
    Double additionalFeeTo;

    Integer cityId;
    Integer districtId;

    String search;
    List<?> items;
}
