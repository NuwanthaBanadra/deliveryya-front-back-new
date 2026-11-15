package com.kaleox.deliveryya.dto.user;

import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.io.Serializable;

/**
 * DTO for {@link com.kaleox.deliveryya.entities.UserRole}
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UserRoleDto implements Serializable {
    @NotNull
    Integer id;

    @NotNull
    String name;

    @NotNull
    Integer level;
}