package com.kaleox.deliveryya.dto.paginatedDto;

import com.kaleox.deliveryya.dto.user.UserRequestDto;
import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import java.util.List;

@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class PaginatedUserRequestDto {

    @NotNull
    Integer pageNumber;

    @NotNull
    Integer countPerPage;

    Long totalCount;
    Integer totalPages;

    Integer userRequestId;
    Integer userId;
    Integer userRequestTypeId;
    Boolean isAccepted;
    Boolean isRead;
    String search;
    List<UserRequestDto> items;
}

