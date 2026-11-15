package com.kaleox.deliveryya.dto.user;

import com.kaleox.deliveryya.dto.customDto.CommonIdNameDto;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

/**
 * DTO for {@link com.kaleox.deliveryya.entities.Employee}
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class UpdateEmployeeDto implements Serializable {
    @NotNull
    private Integer id;

    @NotEmpty
    @Size(max = 100)
    private String location;

    @NotEmpty
    @Size(max = 45)
    private String mobile;

    @NotEmpty
    @Size(max = 20)
    private String whatsapp;

    @NotEmpty
    @Size(max = 100)
    private String liveLocation;

    @Valid
    @NotNull
    private CommonIdNameDto verificationStatus;

    @Valid
    @NotNull
    private CommonIdNameDto branches;
}

