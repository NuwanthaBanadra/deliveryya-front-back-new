package com.kaleox.deliveryya.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.io.Serializable;

/**
 * DTO for {@link com.kaleox.deliveryya.entities.ComplainType}
 */
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ComplainTypeDto implements Serializable {
    Integer id;

    @NotNull
    @Size(max = 45)
    String name;
}

