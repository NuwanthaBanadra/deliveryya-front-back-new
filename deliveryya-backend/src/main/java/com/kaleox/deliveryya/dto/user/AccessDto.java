package com.kaleox.deliveryya.dto.user;

import com.kaleox.deliveryya.dto.customDto.CommonIdNameDto;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.List;

/**
 * DTO for {@link com.kaleox.deliveryya.entities.Access}
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AccessDto implements Serializable {
    Integer id;
    String name;
    String desc;
    CommonIdNameDto accessLevel;
    CommonIdNameDto accessType;

    LocalDateTime updatedAt;
    LocalDateTime createdAt;
    String updatedBy;
    String createdBy;
    LocalDateTime exp;

    List<ApiDto> apis;
}