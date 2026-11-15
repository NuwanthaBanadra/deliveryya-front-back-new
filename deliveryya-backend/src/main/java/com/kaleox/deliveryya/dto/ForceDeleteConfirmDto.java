package com.kaleox.deliveryya.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ForceDeleteConfirmDto {
    @NotNull(message = "Entity ID must be provided")
    private Integer entityId;

    @NotNull(message = "Confirmation flag must be provided")
    private Boolean confirmed;
}
