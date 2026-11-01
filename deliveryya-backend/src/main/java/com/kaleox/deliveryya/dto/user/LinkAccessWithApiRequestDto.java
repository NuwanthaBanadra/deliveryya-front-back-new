package com.kaleox.deliveryya.dto.user;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class LinkAccessWithApiRequestDto {
    @NotNull
    @Min(1)
    Integer accessId;

    @NotNull
    @Min(1)
    Integer apiId;

    Boolean grant = false;

    List<Integer> apiFeatureIds;
}

