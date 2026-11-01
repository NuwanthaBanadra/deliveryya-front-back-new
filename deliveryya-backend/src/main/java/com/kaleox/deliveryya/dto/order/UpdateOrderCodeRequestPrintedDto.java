package com.kaleox.deliveryya.dto.order;

import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;

@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UpdateOrderCodeRequestPrintedDto {
    @NotNull(message = "Request ID is required")
    Integer requestId;

    @NotNull(message = "Printed status is required")
    Boolean printed;
}

