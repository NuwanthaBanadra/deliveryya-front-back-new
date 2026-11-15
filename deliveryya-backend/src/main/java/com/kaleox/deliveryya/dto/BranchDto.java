package com.kaleox.deliveryya.dto;

import com.kaleox.deliveryya.dto.customDto.CommonIdNameDto;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.Accessors;

import java.io.Serializable;

/**
 * DTO for {@link com.kaleox.deliveryya.entities.Branch}
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Accessors(chain = true)
public class BranchDto implements Serializable {
    private Integer id;
    @NotNull
    @Size(max = 45)
    private String name;

    @NotNull
    @Size(max = 100)
    private String location;

    @NotNull
    private CommonIdNameDto city;
}