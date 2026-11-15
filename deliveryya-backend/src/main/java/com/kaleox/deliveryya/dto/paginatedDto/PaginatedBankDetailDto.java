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
public class PaginatedBankDetailDto {

    @NotNull
    Integer pageNumber;

    @NotNull
    Integer countPerPage;

    Long totalCount;
    Integer totalPages;

    Integer marketId;
    Integer userId;
    Integer bankDetailId;
    Integer bankId;
    Boolean isActive;

    String search;
    List<?> items;
}

