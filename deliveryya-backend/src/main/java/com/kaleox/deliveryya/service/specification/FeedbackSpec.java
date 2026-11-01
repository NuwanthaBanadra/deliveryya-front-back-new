package com.kaleox.deliveryya.service.specification;

import com.kaleox.deliveryya.dto.paginatedDto.PaginatedFeedbackDto;
import com.kaleox.deliveryya.entities.Feedback;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import org.jspecify.annotations.NonNull;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;
import java.time.LocalTime;

public class FeedbackSpec {

    public static @NonNull Specification<Feedback> getFeedbackSpecification(PaginatedFeedbackDto dto) {
        Specification<Feedback> spec = (root, query, cb) -> cb.conjunction();

        if (dto.getProductId() != null && dto.getProductId() != 0) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("product").get("id"), dto.getProductId()));
        }

        if (dto.getUserId() != null && dto.getUserId() != 0) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("user").get("id"), dto.getUserId()));
        }

        if (dto.getFromDate() != null) {
            spec = spec.and((root, query, cb) -> cb.greaterThanOrEqualTo(root.get("createdAt"), dto.getFromDate()));
        }

        if (dto.getToDate() != null) {
            spec = spec.and((root, query, cb) -> {
                LocalDateTime toDate = dto.getToDate();

                if (toDate.toLocalTime().equals(LocalTime.MIDNIGHT)) {
                    return cb.lessThan(root.get("createdAt"), toDate.toLocalDate().plusDays(1).atStartOfDay());
                }

                return cb.lessThanOrEqualTo(root.get("createdAt"), toDate);
            });
        }

        if (dto.getSearch() != null && !dto.getSearch().isBlank()) {
            spec = spec.and((root, query, cb) -> {
                String term = "%" + dto.getSearch().toLowerCase() + "%";
                Join<Object, Object> userJoin = root.join("user", JoinType.LEFT);
                return cb.or(
                        cb.like(cb.lower(root.get("comment")), term),
                        cb.like(cb.lower(userJoin.get("firstName")), term),
                        cb.like(cb.lower(userJoin.get("lastName")), term),
                        cb.like(cb.lower(userJoin.get("email")), term)
                );
            });
        }

        return spec;
    }
}
