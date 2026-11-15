package com.kaleox.deliveryya.dto;

import com.kaleox.deliveryya.dto.user.UserDto;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.io.Serializable;

/**
 * DTO for {@link com.kaleox.deliveryya.entities.UserData}
 */
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UserDataDto implements Serializable {
    Integer id;

    @NotNull
    @Size(max = 20)
    String primaryMobile;

    @Size(max = 20)
    String secondaryMobile;

    @Size(max = 20)
    String whatsapp;

    @Size(max = 10)
    String postalCode;

    String address;

    @NotNull
    CityDto cities;

    Boolean isPnoVerified;
}
