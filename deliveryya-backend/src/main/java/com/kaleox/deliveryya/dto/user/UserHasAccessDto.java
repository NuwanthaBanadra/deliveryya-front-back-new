package com.kaleox.deliveryya.dto.user;

import com.kaleox.deliveryya.dto.customDto.CommonIdNameDto;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UserHasAccessDto implements Serializable {
    Integer id;
    String name;
    String desc;
    LocalDateTime exp;
    CommonIdNameDto accessLevel;
    CommonIdNameDto accessType;

    LocalDateTime updatedAt;
    LocalDateTime createdAt;
    String updatedBy;
    String createdBy;

    List<ApiDto> apis;
}
