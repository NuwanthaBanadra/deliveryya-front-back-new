package com.kaleox.deliveryya.dto.user;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
@FieldDefaults(level = lombok.AccessLevel.PRIVATE)
public class UpdateAccessDto {
    @NotNull
    Integer[] accessIds;
    @NotNull
    Integer userRoleId;


    @NotNull
    Boolean grantAccess;

}
