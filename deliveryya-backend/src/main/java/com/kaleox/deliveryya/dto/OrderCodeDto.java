package com.kaleox.deliveryya.dto;

import com.kaleox.deliveryya.dto.user.UserDto;
import com.kaleox.deliveryya.entities.OrderCode;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.io.Serializable;

/**
 * DTO for {@link OrderCode}
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class OrderCodeDto implements Serializable {

    @NotNull
    Integer id;
    @NotNull
    String code;
    @NotNull
    UserDto users;
    Boolean field;
}