package com.kaleox.deliveryya.dto.paginatedDto;

import com.kaleox.deliveryya.dto.order.OrderCodeRequestDto;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.List;

@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class PaginatedOrderCodeRequestDto {
    @NotNull
    Integer pageNumber;

    @NotNull
    Integer countPerPage;

    Long totalCount;
    Integer totalPages;

    Integer id;
    Integer userId;
    Boolean printed;
    Boolean printedBarcodesNeeded;

    List<OrderCodeRequestDto> items;
}

