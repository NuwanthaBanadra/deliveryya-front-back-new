package com.kaleox.deliveryya.dto.customDto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class SetSizeDto {
    @NotBlank
    @Size(max = 30)
    String name;

    @NotNull
    Integer marketId;
}
