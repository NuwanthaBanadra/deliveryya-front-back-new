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
public class PaginatedBrandDto {
    @NotNull
    Integer pageNumber;

    @NotNull
    Integer countPerPage;

    Long totalCount;
    Integer totalPages;

    Integer brandId;
    Integer categoryId;
    Integer marketId;
    Boolean isActive;

    String search;
    List<?> items;
}
