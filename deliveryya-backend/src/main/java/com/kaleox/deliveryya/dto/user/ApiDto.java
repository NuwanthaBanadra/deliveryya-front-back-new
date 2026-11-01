package com.kaleox.deliveryya.dto.user;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.kaleox.deliveryya.dto.customDto.CommonIdNameDto;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.List;
import java.util.Collections;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ApiDto {
    Integer id;
    String name;
    String desc;

    CommonIdNameDto apiMethod;

//    CommonIdNameDto accessType;
//    CommonIdNameDto accessLevel;

    @JsonInclude(JsonInclude.Include.ALWAYS)
    @Builder.Default
    List<CommonIdNameDto> apiFeatures = Collections.emptyList();
}
