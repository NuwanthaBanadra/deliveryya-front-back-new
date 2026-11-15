package com.kaleox.deliveryya.dto.user;

import com.kaleox.deliveryya.dto.customDto.CommonIdNameDto;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.io.Serializable;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class SetUserTokenDto implements Serializable {

    @NotEmpty
    @Size(max = 150)
    String token;

    @NotNull
    CommonIdNameDto tokenType;

    @Future(message = "Expiration time must be in the future")
    LocalDateTime expAt;

    @Size(max = 50)
    String deviceId;
}
