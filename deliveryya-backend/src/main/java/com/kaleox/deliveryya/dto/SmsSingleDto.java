package com.kaleox.deliveryya.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

@Data
@FieldDefaults(level = lombok.AccessLevel.PRIVATE)
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class SmsSingleDto {

    @NotBlank(message = "Contact number is required")
    @Pattern(regexp = "^\\+\\d{10,15}$", message = "Contact must be in format +9476XXXXXXX")
    String contact;

    @NotBlank(message = "Message is required")
    @Size(max = 1500, message = "Message must not exceed 1500 characters")
    String message;

    @Size(max = 50, message = "Sender ID must not exceed 50 characters")
    String senderId;
}
