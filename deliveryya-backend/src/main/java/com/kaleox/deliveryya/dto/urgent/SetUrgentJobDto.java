package com.kaleox.deliveryya.dto.urgent;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.io.Serializable;
import java.util.List;

/**
 * DTO for setting Urgent Job with its items
 */
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class SetUrgentJobDto implements Serializable {
    
    @NotBlank(message = "Job title is required")
    @NotNull(message = "Job title is required")
    @Size(max = 100, message = "Job title must not exceed 100 characters")
    String job;

    @NotBlank(message = "Description is required")
    @NotNull(message = "Description is required")
    String desc;

    @NotBlank(message = "Mobile is required")
    @NotNull(message = "Mobile is required")
    @Size(max = 45, message = "Mobile must not exceed 45 characters")
    String mobile;

    @NotBlank(message = "Username is required")
    @NotNull(message = "Username is required")
    @Size(max = 100, message = "Username must not exceed 100 characters")
    String username;

    @NotBlank(message = "NIC is required")
    @NotNull(message = "NIC is required")
    @Size(max = 20, message = "NIC must not exceed 20 characters")
    String nic;

    @NotBlank(message = "Email is required")
    @NotNull(message = "Email is required")
    @Size(max = 100, message = "Email must not exceed 100 characters")
    String email;

    Integer vehicleTypeId;

    @NotNull(message = "Trip distance is required")
    Double trip;

    @NotEmpty(message = "At least one job item is required")
    @NotNull(message = "Job items are required")
    @Valid
    List<UrgentJobItemDto> items;
}


