package com.kaleox.deliveryya.dto.user;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.io.Serializable;

/**
 * DTO for {@link com.kaleox.deliveryya.entities.VerificationData}
 */
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class VerificationDataDto implements Serializable {
    Integer id;
    @NotNull
    @Size(max = 100)
    String url;
    @NotNull
    @Size(max = 45)
    String desc;

    @NotNull
    @Min(1)
    @JsonAlias("usersId")
    Integer userId;

    @NotNull
    @Min(1)
    Integer verificationStatusId;

    @NotNull
    @Min(1)
    Integer docType;
}