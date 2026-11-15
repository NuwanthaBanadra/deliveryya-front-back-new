package com.kaleox.deliveryya.dto.user;

import com.kaleox.deliveryya.dto.customDto.CommonIdNameDto;
import com.kaleox.deliveryya.dto.customDto.CreateGroup;
import com.kaleox.deliveryya.dto.customDto.UpdateGroup;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.io.Serializable;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * DTO for {@link com.kaleox.deliveryya.entities.User}
 */
@Data
@Builder
@Setter
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UserDto implements Serializable {
    Integer id;

    @NotNull(message = "First name is required")
    @NotEmpty(message = "First name is required")
    @NotBlank(message = "First name is required")
    @Size(message = "First name is required", min = 2, max = 45)
    String firstName;

    @NotNull(message = "First name is required")
    @NotEmpty(message = "First name is required")
    @NotBlank(message = "First name is required")
    @Size(message = "First name is required", min = 2, max = 45)
    String lastName;

    @NotNull
    @PastOrPresent(message = "Date of birth should be past Date")
    LocalDate dob;

    @Size(message = "Profile Image link length should be lower than 100 characters", max = 150)
    String profileImg;

    @NotEmpty(message = "NIC is required")
    @NotBlank(message = "NIC is required")
    @NotNull(message = "NIC is required")
    @Size(message = "NIC length should be between 9 to 12 characters", min = 9, max = 12)
    @Pattern(message = "Invalid NIC", regexp = "^(?:\\d{9}[VvXx]|\\d{12})$")
    String nic;

    @NotEmpty(message = "Email is required")
    @NotBlank(message = "Email is required")
    @NotNull(message = "Email is required")
    @Size(message = "Email length should be lower that 100 characters", min = 10, max = 100)
    @Email(message = "Invalid Email Address")
    String email;

    @NotNull(message = "Password is required", groups = CreateGroup.class)
    @NotEmpty(message = "Password is required", groups = CreateGroup.class)
    @NotBlank(message = "Password is required", groups = CreateGroup.class)
    @Size(message = "Password must be between 8 and 64 characters", min = 8, max = 64)
    @Pattern(
            message = "Password must include uppercase, lowercase, digit and special character",
            regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&]).{8,64}$"
    )
    String password;

    Boolean isActive = true;

    //    @Valid
//    @NotNull(groups = {CreateGroup.class, Default.class})
    CommonIdNameDto verificationStatus;

    @Valid
    @NotNull(groups = UpdateGroup.class)
    CommonIdNameDto gender;

    CommonIdNameDto userRole;
    Boolean isEmployee = false;
    Boolean emailVerified = false;
    Boolean isDeleted = false;
    Boolean hasMarket = false;

    LocalDateTime createdAt;
    String updatedBy;
}