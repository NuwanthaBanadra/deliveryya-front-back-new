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
public class PaginatedComplainDto {
    @NotNull
    Integer pageNumber;

    @NotNull
    Integer countPerPage;

    Long totalCount;
    Integer totalPages;

    Integer complainId;
    Integer orderId;
    Integer placedUserId;

    Integer userId;
    Integer complainTypeId;
    Integer complainStatusId;
    Integer isSolve; // null or negative = ignore, 0 = false, 1 or positive = true

    String search;
    List<?> items;
}

