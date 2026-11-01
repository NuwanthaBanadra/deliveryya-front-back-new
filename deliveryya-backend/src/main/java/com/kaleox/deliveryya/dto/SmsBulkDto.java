package com.kaleox.deliveryya.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import java.util.List;

@Data
@FieldDefaults(level = lombok.AccessLevel.PRIVATE)
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class SmsBulkDto {

    @NotEmpty(message = "Contacts list is required")
    @Size(min = 1, max = 1000, message = "Contacts list must have between 1 and 1000 numbers")
    List<@Pattern(regexp = "^\\+\\d{10,15}$", message = "Each contact must be in format +9476XXXXXXX") String> contacts;

    @NotBlank(message = "Message is required")
    @Size(max = 1500, message = "Message must not exceed 1500 characters")
    String message;

    @Size(max = 50, message = "Sender ID must not exceed 50 characters")
    String senderId;
}
