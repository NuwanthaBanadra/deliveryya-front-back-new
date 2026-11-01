package com.kaleox.deliveryya.dto.customDto;

import com.kaleox.deliveryya.entities.VerificationStatus;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.io.Serializable;

/**
 * DTO for {@link VerificationStatus}
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CommonIdNameDto implements Serializable {
    @NotNull
    Integer id;

    String name;
}