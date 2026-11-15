package com.kaleox.deliveryya.service.specification;

import com.kaleox.deliveryya.dto.agentjob.PaginatedPickUpRequestDto;
import com.kaleox.deliveryya.entities.PickUpRequests;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import org.jspecify.annotations.NonNull;
import org.springframework.data.jpa.domain.Specification;

public class PickUpRequestsSpec {

    public static @NonNull Specification<PickUpRequests> getPickUpRequestsSpecification(PaginatedPickUpRequestDto dto) {
        Specification<PickUpRequests> spec = (root, query, cb) -> cb.conjunction();

        spec = spec.and((root, query, cb) -> cb.isFalse(root.get("isDeleted")));

        if (dto.getPickupRequestId() != null && dto.getPickupRequestId() != 0) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("id"), dto.getPickupRequestId()));
            return spec;
        }

        if (dto.getUserId() != null && dto.getUserId() != 0) {
            spec = spec.and((root, query, cb) -> {
                Join<Object, Object> userJoin = root.join("user", JoinType.LEFT);
                return cb.equal(userJoin.get("id"), dto.getUserId());
            });
        }

        if (dto.getIsAccepted() != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("isAccepted"), dto.getIsAccepted()));
        }

        if (dto.getIsCompleted() != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("isCompleted"), dto.getIsCompleted()));
        }

        if (dto.getMessage() != null && !dto.getMessage().isBlank()) {
            spec = spec.and((root, query, cb) -> cb.like(cb.lower(root.get("message")), "%" + dto.getMessage().toLowerCase() + "%"));
        }

        if (dto.getFromDate() != null && dto.getToDate() != null) {
            spec = spec.and((root, query, cb) -> cb.between(root.get("createdAt"), dto.getFromDate(), dto.getToDate()));
        } else if (dto.getFromDate() != null) {
            spec = spec.and((root, query, cb) -> cb.greaterThanOrEqualTo(root.get("createdAt"), dto.getFromDate()));
        } else if (dto.getToDate() != null) {
            spec = spec.and((root, query, cb) -> cb.lessThanOrEqualTo(root.get("createdAt"), dto.getToDate()));
        }

        if (dto.getSearch() != null && !dto.getSearch().isBlank()) {
            spec = spec.and((root, query, cb) -> {
                String term = "%" + dto.getSearch().toLowerCase() + "%";
                Join<Object, Object> userJoin = root.join("user", JoinType.LEFT);
                return cb.or(
                        cb.like(cb.lower(root.get("message")), term),
                        cb.like(cb.lower(root.get("location")), term),
                        cb.like(cb.lower(userJoin.get("firstName")), term),
                        cb.like(cb.lower(userJoin.get("lastName")), term),
                        cb.like(cb.lower(userJoin.get("email")), term)
                );
            });
        }

        return spec;
    }
}

