package com.kaleox.deliveryya.dto.user;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * DTO for {@link com.kaleox.deliveryya.entities.UserHasAccess}
 */

@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
@FieldDefaults(level = lombok.AccessLevel.PRIVATE)
public class GrantAccessToUserDto implements Serializable {
    Integer id;

    @NotNull
    Integer usersId;

//    @NotNull
//    Integer accessId;

    @NotNull
    Integer[] accessIds;

    LocalDateTime exp;

    @NotNull
    Boolean grantAccess;

//    @NotNull
//    Boolean grantAccess;
}