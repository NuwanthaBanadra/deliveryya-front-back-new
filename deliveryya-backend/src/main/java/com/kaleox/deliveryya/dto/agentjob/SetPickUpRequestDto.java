package com.kaleox.deliveryya.dto.agentjob;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class SetPickUpRequestDto {

    @NotNull(message = "User ID is required")
    Integer userId;

    @NotBlank(message = "Message is required")
    @Size(max = 150, message = "Message can contain at most 150 characters")
    String message;

    @NotBlank(message = "Location is required")
    @Size(max = 150, message = "Location can contain at most 150 characters")
    String location;

    Boolean isAccepted;
    Boolean isCompleted;
}

