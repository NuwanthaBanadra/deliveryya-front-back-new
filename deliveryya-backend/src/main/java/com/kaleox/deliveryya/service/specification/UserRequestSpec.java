package com.kaleox.deliveryya.service.specification;

import com.kaleox.deliveryya.dto.paginatedDto.PaginatedUserRequestDto;
import com.kaleox.deliveryya.entities.UserRequest;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import org.jspecify.annotations.NonNull;
import org.springframework.data.jpa.domain.Specification;

public class UserRequestSpec {

    public static @NonNull Specification<UserRequest> getUserRequestSpecification(PaginatedUserRequestDto dto) {
        Specification<UserRequest> spec = (root, query, cb) -> {
            query.distinct(true);
            return cb.conjunction();
        };

        spec = spec.and((root, query, cb) -> cb.isFalse(root.get("isDeleted")));

        if (dto.getUserRequestId() != null && dto.getUserRequestId() > 0) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("id"), dto.getUserRequestId()));
            return spec;
        }

        if (dto.getUserId() != null && dto.getUserId() > 0) {
            spec = spec.and((root, query, cb) -> {
                Join<Object, Object> userJoin = root.join("user", JoinType.LEFT);
                return cb.equal(userJoin.get("id"), dto.getUserId());
            });
        }

        if (dto.getUserRequestTypeId() != null && dto.getUserRequestTypeId() > 0) {
            spec = spec.and((root, query, cb) -> {
                Join<Object, Object> typeJoin = root.join("userRequestType", JoinType.LEFT);
                return cb.equal(typeJoin.get("id"), dto.getUserRequestTypeId());
            });
        }

        if (dto.getIsAccepted() != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("accepted"), dto.getIsAccepted()));
        }

        if (dto.getIsRead() != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("read"), dto.getIsRead()));
        }

        if (dto.getSearch() != null && !dto.getSearch().isBlank()) {
            spec = spec.and((root, query, cb) -> {
                String term = "%" + dto.getSearch().toLowerCase() + "%";
                Join<Object, Object> userJoin = root.join("user", JoinType.LEFT);
                Join<Object, Object> typeJoin = root.join("userRequestType", JoinType.LEFT);
                return cb.or(
                        cb.like(cb.lower(root.get("title")), term),
                        cb.like(cb.lower(root.get("desc")), term),
                        cb.like(cb.lower(userJoin.get("firstName")), term),
                        cb.like(cb.lower(userJoin.get("lastName")), term),
                        cb.like(cb.lower(userJoin.get("email")), term),
                        cb.like(cb.lower(typeJoin.get("name")), term)
                );
            });
        }

        return spec;
    }
}

