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
public class PaginatedGrantedAccessesDto {
    @NotNull
    Integer pageNumber;

    @NotNull
    Integer countPerPage;

    Long totalCount;
    Integer totalPages;

    Integer accessId;

    Integer accessTypeId;
    Integer accessLevelId;

    Integer userRoleId;
    Integer userId;
    List<Integer> apiIds;

    Boolean includeLinkedApis;
    Boolean includeGrantMeta;

    String search;
    List<?> items;
}
