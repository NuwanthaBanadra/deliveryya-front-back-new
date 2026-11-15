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
public class PaginatedApiDto {
    @NotNull
    Integer pageNumber;

    @NotNull
    Integer countPerPage;

    Integer accessId;

    Long totalCount;
    Integer totalPages;

    String search;
    List<?> items;
}

