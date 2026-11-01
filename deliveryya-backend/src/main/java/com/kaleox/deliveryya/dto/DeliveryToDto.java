package com.kaleox.deliveryya.dto;

import com.kaleox.deliveryya.dto.customDto.CommonIdNameDto;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.io.Serializable;

/**
 * DTO for {@link com.kaleox.deliveryya.entities.DeliveryTo}
 */
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class DeliveryToDto implements Serializable {
    Integer id;

    @NotNull
    String address;
    @NotNull
    String primaryMobile;
    @NotNull
    String secondaryMobile;
    @NotNull
    String whatsapp;
    @NotNull
    String fullName;

    String location;

    CommonIdNameDto order;

    @Valid
    @NotNull
    CommonIdNameDto city;

    @Valid
    CommonIdNameDto user;
}