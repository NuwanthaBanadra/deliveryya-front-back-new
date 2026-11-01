package com.kaleox.deliveryya.dto;

import com.kaleox.deliveryya.dto.user.UserDto;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.io.Serializable;

/**
 * DTO for {@link com.kaleox.deliveryya.entities.DeliveryDetail}
 */
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class DeliveryDetailDto implements Serializable {
    Integer id;
    @NotNull
    @Size(max = 100)
    String address;

    @NotNull
    @Size(max = 20)
    String tag;

    @NotNull
    Boolean permanent;
    @NotNull
    UserDto users;
    @NotNull
    @Size(max = 20)
    String primaryMobile;
    @NotNull
    @Size(max = 20)
    String secondaryMobile;
    @NotNull
    @Size(max = 100)
    String whatsapp;
    @NotNull
    CityDto cities;

    String location;
}