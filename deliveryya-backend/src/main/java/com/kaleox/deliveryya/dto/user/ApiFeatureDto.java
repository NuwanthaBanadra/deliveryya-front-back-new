package com.kaleox.deliveryya.dto.user;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.io.Serializable;

/**
 * DTO for {@link com.kaleox.deliveryya.entities.Access}
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ApiFeatureDto implements Serializable {
    Integer id;
    String name;
    String desc;
    Integer apiId;
}