package com.kaleox.deliveryya.dto.paginatedDto;

import com.kaleox.deliveryya.dto.user.UserDto;
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
public class PaginatedGrantedUsersDto {
    @NotNull
    Integer pageNumber;

    @NotNull
    Integer countPerPage;

    Long totalCount;
    Integer totalPages;

    Integer accessId;
    Boolean expired;
    Boolean notExpired;
    LocalDateTime expiredFrom;
    LocalDateTime expiredAt;

    List<UserDto> items;
}

