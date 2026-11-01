package com.kaleox.deliveryya.service.specification;

import com.kaleox.deliveryya.dto.paginatedDto.PaginatedStockDto;
import com.kaleox.deliveryya.entities.Stock;
import org.jspecify.annotations.NonNull;
import org.springframework.data.jpa.domain.Specification;

public class StockSpec {

    public static @NonNull Specification<Stock> getStockSpecification(PaginatedStockDto dto) {
        Specification<Stock> spec = (root, query, cb) -> cb.conjunction();

        spec = spec.and((root, query, cb) -> cb.or(cb.isNull(root.get("isDeleted")), cb.isFalse(root.get("isDeleted"))));
        spec = spec.and((root, query, cb) -> cb.or(cb.isNull(root.get("products").get("isDeleted")), cb.isFalse(root.get("products").get("isDeleted"))));
        spec = spec.and((root, query, cb) -> cb.or(cb.isNull(root.get("products").get("brand").get("isDeleted")), cb.isFalse(root.get("products").get("brand").get("isDeleted"))));
        spec = spec.and((root, query, cb) -> cb.or(cb.isNull(root.get("products").get("category").get("isDeleted")), cb.isFalse(root.get("products").get("category").get("isDeleted"))));

        // Filter by stock ID if provided - returns specific stock
        if (dto.getStockId() != null && dto.getStockId() != 0) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("id"), dto.getStockId()));
        }

        // Filter by product ID if provided
        if (dto.getProductId() != null && dto.getProductId() != 0) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("products").get("id"), dto.getProductId()));
        }

        // Filter by brand ID if provided
        if (dto.getBrandId() != null && dto.getBrandId() != 0) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("products").get("brand").get("id"), dto.getBrandId()));
        }

        // Filter by active status if provided
        if (dto.getIsActive() != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("isActive"), dto.getIsActive()));
        }

        // Filter by brand ID if provided
        if (dto.getColor() != null && !dto.getColor().isEmpty()) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("color"), dto.getColor()));
        }

        // Filter by category ID if provided
        if (dto.getCategoryId() != null && dto.getCategoryId() != 0) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("products").get("category").get("id"), dto.getCategoryId()));
        }

        // Filter by market ID if provided
        if (dto.getMarketId() != null && dto.getMarketId() != 0) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("products").get("category").get("markets").get("id"), dto.getMarketId()));
        }

        // Search by product name or code (excluding desc due to CLOB type limitation)
        if (dto.getSearch() != null && !dto.getSearch().isBlank()) {
            spec = spec.and((root, query, cb) -> {
                String searchTerm = "%" + dto.getSearch().toLowerCase() + "%";
                return cb.or(
                        cb.like(cb.lower(root.get("products").get("name")), searchTerm),
                        cb.like(cb.lower(root.get("products").get("code")), searchTerm)
                );
            });
        }

        return spec;
    }
}
