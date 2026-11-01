package com.kaleox.deliveryya.dto.user;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * DTO for {@link com.kaleox.deliveryya.entities.Employee}
 */
@Data
@Builder
@Setter
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UserEmployeeDto implements Serializable {
    Integer id;
    @Size(max = 100)
    String location;
    @Size(max = 100)
    String liveLocation;
    Integer verificationStatusId;
    String verificationStatusName;
    Integer branchesId;
    String branchesName;
    String branchesLocation;
    Integer branchesCityId;
    String branchesCityName;
    Integer usersId;
    String usersFirstName;
    String usersLastName;
    String usersEmail;
    String usersProfileImg;
    String usersGenderName;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
    @NotNull
    @Size(max = 45)
    String mobile;
    @NotNull
    @Size(max = 20)
    String whatsapp;
}