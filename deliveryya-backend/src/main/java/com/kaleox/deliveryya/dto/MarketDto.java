package com.kaleox.deliveryya.dto;

import com.kaleox.deliveryya.dto.user.UserDto;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * DTO for {@link com.kaleox.deliveryya.entities.Market}
 */
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class MarketDto implements Serializable {
    Integer id;
    @NotNull
    @Size(max = 45)
    String name;
    String location;

    @Size(max = 150)
    String logoUrl;

    @Size(max = 150)
    String coverImgUrl;

    @NotNull
    @Size(max = 150)
    String desc;

    @NotNull
    @Size(max = 100)
    String address;

    @NotNull
    @Size(max = 20)
    @JsonProperty("first_num")
    String firstNum;

     @NotNull
     @Size(max = 20)
     @JsonProperty("second_num")
     String secondNum;

    @NotNull
    @Size(max = 20)
    @JsonProperty("whats_app")
    String whatsApp;

    @NotNull
    UserDto users;

    String infoMessage;

    Boolean isActive;

    @NotNull
    MarketCategoryDto marketCategory;

    LocalDateTime createdAt;
    LocalDateTime updatedAt;
    String createdBy;
    String madeBy;
    String updatedBy;
}