package com.kaleox.deliveryya.dto.agentjob;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.List;

@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class SetAgentJobDto {

    @NotNull(message = "Employee User ID is required")
    Integer userId;

    @NotNull
    @NotEmpty
    String task;

    // urgentJobId is nullable – an agent job may or may not be linked to an urgent job
    Integer urgentJobId;

    @Valid
    @NotEmpty(message = "At least One task is required")
    @Size(min = 1, message = "At least One task is required")
    List<SetAgentJobTaskDto> tasks;
}
