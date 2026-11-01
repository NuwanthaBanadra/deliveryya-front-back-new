package com.kaleox.deliveryya.dto.user;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UpdateUserRoleOrDeleteDto {

    @NotNull(message = "User id is required")
    @Min(value = 1, message = "User id must be greater than 0")
    Integer userId;

    @Min(value = 1, message = "User role id must be greater than 0")
    Integer userRoleId;

    @Min(value = 1, message = "Verification status id must be greater than 0")
    Integer verificationStatusId;

    Boolean isActive;
    Boolean isEmployee;
    Boolean hasMarket;

    Boolean isDeleted;
}

