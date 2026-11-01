package com.kaleox.deliveryya.dto;

import com.kaleox.deliveryya.dto.customDto.CommonIdNameDto;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.io.Serializable;

/**
 * DTO for {@link com.kaleox.deliveryya.entities.BankDetail}
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class BankDetailDto implements Serializable {

    Integer id;

    @NotNull(message = "Account holder name is required")
    @NotBlank(message = "Account holder name is required")
    @Size(max = 45, message = "Name must not exceed 45 characters")
    String name;

    @NotNull(message = "Account number is required")
    @NotBlank(message = "Account number is required")
    @Size(max = 20, message = "Account number must not exceed 20 characters")
    String accNumber;

    @NotNull(message = "Branch is required")
    @NotBlank(message = "Branch is required")
    @Size(max = 45, message = "Branch must not exceed 45 characters")
    String branch;

    @Valid
    @NotNull(message = "Bank is required")
    CommonIdNameDto bank;

    @NotNull(message = "User is required")
    Integer userId;

    Boolean isActive;
    Boolean isDeleted;
}

