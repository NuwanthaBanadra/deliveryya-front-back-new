package com.kaleox.deliveryya.dto.user;

import com.kaleox.deliveryya.dto.customDto.CommonIdNameDto;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.io.Serializable;
import java.util.List;

/**
 * DTO for {@link com.kaleox.deliveryya.entities.Access}
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class GrantedAccessesDto implements Serializable {

    Integer userId;
    Integer userRoleId;

    List<AccessHasUserRoleDto> AccessHasUserRoleList;


}