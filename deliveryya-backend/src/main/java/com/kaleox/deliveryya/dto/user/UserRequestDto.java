package com.kaleox.deliveryya.dto.user;

import java.io.Serializable;
import java.util.List;

public record UserRequestDto(
        Integer id,
        String title,
        String desc,
        Boolean isAccepted,
        Boolean isRead,
        Boolean isDeleted,
        List<String> docUrls,
        UserRef user,
        UserRequestTypeRef userRequestType
) implements Serializable {

    public record UserRef(
            Integer id,
            String firstName,
            String lastName,
            String email
    ) implements Serializable {
    }

    public record UserRequestTypeRef(
            Integer id,
            String name
    ) implements Serializable {
    }
}

