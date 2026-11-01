package com.kaleox.deliveryya.dto;

import com.kaleox.deliveryya.dto.customDto.CommonIdNameDto;
import com.kaleox.deliveryya.dto.customDto.CreateGroup;
import com.kaleox.deliveryya.dto.customDto.UpdateGroup;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.io.Serializable;

/**
 * DTO for {@link com.kaleox.deliveryya.entities.Complain}
 */
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ComplainDto implements Serializable {

    @NotNull(groups = UpdateGroup.class)
    Integer id;

    @NotBlank
    @Size(max = 100)
    String subject;

    @NotBlank
    String complain;

    Boolean isSolve;

    String response;

    @Valid
    @NotNull(groups = CreateGroup.class)
    CommonIdNameDto complainType;

    @Valid
    CommonIdNameDto complainStatus;

    @NotBlank(groups = CreateGroup.class)
    String code;

    Integer orderId;

    OrderDto order;
}

