package com.kaleox.deliveryya.service.specification;

import com.kaleox.deliveryya.dto.paginatedDto.PaginatedDiscountDto;
import com.kaleox.deliveryya.entities.Discount;
import org.jspecify.annotations.NonNull;
import org.springframework.data.jpa.domain.Specification;

public class DiscountSpec {

    public static @NonNull Specification<Discount> getDiscountSpecification(PaginatedDiscountDto dto) {
        Specification<Discount> spec = (root, query, cb) -> cb.conjunction();

        // Filter by userId
        if (dto.getUserId() != null && dto.getUserId() != 0) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("user").get("id"), dto.getUserId()));
        }

        // Filter by cityId
        if (dto.getCityId() != null && dto.getCityId() != 0) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("city").get("id"), dto.getCityId()));
        }

        // Filter by districtId
        if (dto.getDistrictId() != null && dto.getDistrictId() != 0) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("city").get("district").get("id"), dto.getDistrictId()));
        }

        // Search by user name or email (case-insensitive, partial match)
        if (dto.getSearch() != null && !dto.getSearch().isBlank()) {
            spec = spec.and((root, query, cb) -> {
                String searchTerm = "%" + dto.getSearch().toLowerCase() + "%";
                return cb.or(
                    cb.like(cb.lower(root.get("user").get("firstName")), searchTerm),
                    cb.like(cb.lower(root.get("user").get("lastName")), searchTerm),
                    cb.like(cb.lower(root.get("user").get("email")), searchTerm)
                );
            });
        }

        return spec;
    }
}
