package com.kaleox.deliveryya.dto.user;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CreateAccessRequestDto {
    @NotBlank
    String name;

    @NotBlank
    String desc;

    @NotNull
    @Min(1)
    Integer accessLevelId;

    @NotNull
    @Min(1)
    Integer accessTypeId;
}

