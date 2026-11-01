package com.kaleox.deliveryya.dto.user;

import com.kaleox.deliveryya.entities.Gender;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.io.Serializable;

/**
 * DTO for {@link Gender}
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class GenderDto implements Serializable {
    @NotNull
    Integer id;

    @NotNull
    String name;
}