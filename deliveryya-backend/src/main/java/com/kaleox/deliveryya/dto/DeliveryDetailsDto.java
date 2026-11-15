package com.kaleox.deliveryya.dto;

import com.kaleox.deliveryya.dto.customDto.CommonIdNameDto;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.io.Serializable;

@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class DeliveryDetailsDto implements Serializable {

    Integer id;

    @NotNull(message = "Address is required")
    @NotBlank(message = "Address is required")
    @Size(max = 100, message = "Address must not exceed 100 characters")
    String address;

    @NotNull(message = "Tag is required")
    @NotBlank(message = "Tag is required")
    @Size(max = 20, message = "Tag must not exceed 20 characters")
    String tag;

    Boolean permanent = false;

    @Size(max = 150, message = "Location must not exceed 150 characters")
    String location;

    @NotNull(message = "Primary mobile is required")
    @NotBlank(message = "Primary mobile is required")
    @Size(max = 20, message = "Primary mobile must not exceed 20 characters")
    String primaryMobile;

    @NotNull(message = "Secondary mobile is required")
    @NotBlank(message = "Secondary mobile is required")
    @Size(max = 20, message = "Secondary mobile must not exceed 20 characters")
    String secondaryMobile;

    @NotNull(message = "WhatsApp is required")
    @NotBlank(message = "WhatsApp is required")
    @Size(max = 100, message = "WhatsApp must not exceed 100 characters")
    String whatsapp;

    @Valid
    @NotNull(message = "City is required")
    CommonIdNameDto cities;
}

