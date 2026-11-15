package com.kaleox.deliveryya.dto.urgent;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * DTO for {@link com.kaleox.deliveryya.entities.UrgentJobItem}
 */
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UrgentJobItemDto implements Serializable {
    
    Integer id;

    @NotBlank(message = "Location is required")
    @NotNull(message = "Location is required")
    @Size(max = 100, message = "Location must not exceed 100 characters")
    String location;

    @NotBlank(message = "Task description is required")
    @NotNull(message = "Task description is required")
    String task;

    LocalDateTime beAt;

    Integer expectedTimeDuration;

    Integer spentDuration;
}

