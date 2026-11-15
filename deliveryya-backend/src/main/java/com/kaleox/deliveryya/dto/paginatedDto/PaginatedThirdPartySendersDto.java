package com.kaleox.deliveryya.dto.paginatedDto;

import com.kaleox.deliveryya.dto.order.ThirdPartySendersDto;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.List;

@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class PaginatedThirdPartySendersDto {

    @NotNull
    Integer pageNumber;

    @NotNull
    Integer countPerPage;

    Long totalCount;
    Integer totalPages;

    Integer id;
    String search;

    @Builder.Default
    Boolean searchAddress = false;

    @Builder.Default
    Boolean searchNote = false;

    List<ThirdPartySendersDto> items;
}

