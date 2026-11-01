package com.kaleox.deliveryya.dto.order;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Value;

import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * DTO for {@link com.kaleox.deliveryya.entities.ThirdPartySenders}
 */
@Value
public class ThirdPartySendersDto implements Serializable {
    Integer id;

    @NotBlank
    @Size(max = 100)
    String name;

    @Size(max = 100)
    String address;

    String note;

    @Size(max = 20)
    String nic;

    @NotBlank
    @Size(max = 20)
    String first_mob;

    @NotBlank
    @Size(max = 20)
    String sec_mob;

    @NotBlank
    @Size(max = 20)
    String whatsapp;

    LocalDateTime createdAt;
    LocalDateTime updatedAt;
    String createdBy;
    String updatedBy;
}