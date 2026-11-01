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
public class PaginatedUserDto {

    @NotNull
    Integer pageNumber;

    @NotNull
    Integer countPerPage;

    Long totalCount;
    Integer totalPages;

    Integer userId;
    Integer userRoleId;
    Integer verificationStatusId;
    Integer genderId;
    Boolean isActive;
    Boolean emailVerified;
    Boolean hasMarket;
    Boolean isEmployee;

    String search;
    List<?> items;
}

