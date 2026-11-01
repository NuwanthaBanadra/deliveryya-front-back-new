package com.kaleox.deliveryya.dto.agentjob;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class SetAgentJobTaskDto {

    @NotBlank(message = "Task is required")
    @NotNull(message = "Task is required")
    String task;

    @NotBlank(message = "Location is required")
    @NotNull(message = "Location is required")
    String location;

    // Optional on input; defaults to false in service/entity when omitted.
    Boolean isComplete;

    // Optional pickup/arrival time reference for the task.
    LocalDateTime beAt;
}
