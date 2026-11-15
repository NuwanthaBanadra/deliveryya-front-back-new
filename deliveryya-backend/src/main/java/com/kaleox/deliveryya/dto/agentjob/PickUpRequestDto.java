package com.kaleox.deliveryya.dto.agentjob;

import java.io.Serializable;
import java.time.LocalDateTime;

public record PickUpRequestDto(
        Integer id,
        String message,
        Boolean isAccepted,
        Boolean isDeleted,
        Boolean isCompleted,
        String location,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        UserRef user,
        UserRef createdByUser
) implements Serializable {

    public record UserRef(
            Integer id,
            String firstName,
            String lastName,
            String email
    ) implements Serializable {}
}

