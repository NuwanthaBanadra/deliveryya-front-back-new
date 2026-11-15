package com.kaleox.deliveryya.dto.agentjob;

import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;

@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UpdateAgentJobAcceptanceItemDto {

    @NotNull(message = "Agent job ID is required")
    Integer agentJobId;

    @NotNull(message = "Accepted flag is required")
    Boolean accepted;
}

