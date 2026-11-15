package com.kaleox.deliveryya.dto.customDto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class SetCategoryDto {

    @NotBlank
    @Size(max = 45)
    String name;

    @NotNull
    Integer marketId;

    @NotBlank
    @Size(max = 150)
    String img;
}

