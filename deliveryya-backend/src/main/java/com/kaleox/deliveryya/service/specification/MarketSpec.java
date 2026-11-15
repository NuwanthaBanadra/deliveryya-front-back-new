package com.kaleox.deliveryya.service.specification;

import com.kaleox.deliveryya.dto.paginatedDto.PaginatedMarketDto;
import com.kaleox.deliveryya.entities.Market;
import jakarta.persistence.criteria.Predicate;
import org.jspecify.annotations.NonNull;
import org.springframework.data.jpa.domain.Specification;

public class MarketSpec {
    public static @NonNull Specification<Market> getMarketSpecification(PaginatedMarketDto dto) {
        Specification<Market> spec = (root, query, cb) -> cb.conjunction();

        spec = spec.and((root, query, cb) -> cb.or(cb.isFalse(root.get("isDeleted")), cb.isNull(root.get("isDeleted"))));

        if (dto.getMarketId() != null && dto.getMarketId() != 0) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("id"), dto.getMarketId()));
            return spec;
        }

        if (dto.getMarketCategoryId() != null && dto.getMarketCategoryId() != 0) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("marketCategory").get("id"), dto.getMarketCategoryId()));
        }

        if (dto.getUserId() != null && dto.getUserId() != 0) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("users").get("id"), dto.getUserId()));
        }

        if (dto.getIsActive() != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("isActive"), dto.getIsActive()));
        }

        if (dto.getSearch() != null && !dto.getSearch().isBlank()) {
            spec = spec.and((root, query, cb) -> {
                String searchTerm = "%" + dto.getSearch().toLowerCase() + "%";
                return cb.like(cb.lower(root.get("name")), searchTerm);
            });
        }

        return spec;
    }
}
