package com.kaleox.deliveryya.dto;

import jakarta.validation.constraints.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class EmailDto {

    @NotBlank(message = "Email is required")
    @Size(min = 10, max = 100, message = "Email length must be between 10 and 100 characters")
    @Email(message = "Invalid email address")
    String email;

    @NotBlank(message = "Subject is required")
    @Size(max = 200, message = "Subject must not exceed 200 characters")
    String subject;

    @NotBlank(message = "Design is required")
//    @Size(max = 500, message = "Design must not exceed 500 characters")
    String design;

    @NotBlank(message = "Route is required")
    @Size(max = 2048, message = "URL must not exceed 2048 characters")
    String route;


}
