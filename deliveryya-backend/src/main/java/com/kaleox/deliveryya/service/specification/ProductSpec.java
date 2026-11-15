package com.kaleox.deliveryya.service.specification;

import com.kaleox.deliveryya.dto.paginatedDto.PaginatedBrandDto;
import com.kaleox.deliveryya.dto.paginatedDto.PaginatedCategoryDto;
import com.kaleox.deliveryya.dto.paginatedDto.PaginatedProductDto;
import com.kaleox.deliveryya.entities.Brand;
import com.kaleox.deliveryya.entities.Category;
import com.kaleox.deliveryya.entities.Product;
import com.kaleox.deliveryya.entities.Stock;
import jakarta.persistence.criteria.Predicate;
import org.jspecify.annotations.NonNull;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;
import java.time.LocalTime;

public class ProductSpec {
    public static @NonNull Specification<Brand> getBrandSpecification(PaginatedBrandDto dto) {
        Specification<Brand> spec = (root, query, cb) -> cb.conjunction();

        spec = spec.and((root, query, cb) -> cb.or(cb.isFalse(root.get("isDeleted")), cb.isNull(root.get("isDeleted"))));

        if (dto.getIsActive() != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("isActive"), dto.getIsActive()));
        }

        if (dto.getBrandId() != null && dto.getBrandId() != 0) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("id"), dto.getBrandId()));
            return spec;
        }

        if (dto.getSearch() != null && !dto.getSearch().isBlank()) {
            spec = spec.and((root, query, cb) -> cb.like(cb.lower(root.get("name")), "%" + dto.getSearch().toLowerCase() + "%"));
        }

        if (dto.getCategoryId() != null && dto.getCategoryId() != 0) {
            spec = spec.and((root, query, cb) -> {
                var productSubquery = query.subquery(Integer.class);
                var productRoot = productSubquery.from(Product.class);
                productSubquery.select(cb.literal(1));
                productSubquery.where(
                        cb.equal(productRoot.get("brand"), root),
                        cb.equal(productRoot.get("category").get("id"), dto.getCategoryId())
                );
                return cb.exists(productSubquery);
            });
            return spec;
        }

        if (dto.getMarketId() != null && dto.getMarketId() != 0) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("markets").get("id"), dto.getMarketId()));
        }


        return spec;
    }

    public static @NonNull Specification<Category> getCategorySpecification(PaginatedCategoryDto dto) {
        Specification<Category> spec = (root, query, cb) -> cb.conjunction();

        spec = spec.and((root, query, cb) -> cb.or(cb.isFalse(root.get("isDeleted")), cb.isNull(root.get("isDeleted"))));
        spec = spec.and((root, query, cb) -> cb.isTrue(root.get("isActive")));

        if (dto.getIsActive() != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("isActive"), dto.getIsActive()));
        }

        if (dto.getCategoryId() != null && dto.getCategoryId() != 0) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("id"), dto.getCategoryId()));
            return spec;
        }

        if (dto.getSearch() != null && !dto.getSearch().isBlank()) {
            spec = spec.and((root, query, cb) -> cb.like(cb.lower(root.get("name")), "%" + dto.getSearch().toLowerCase() + "%"));
        }

        if (dto.getMarketId() != null && dto.getMarketId() != 0) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("markets").get("id"), dto.getMarketId()));
        }

        return spec;
    }

    public static @NonNull Specification<Product> getProductSpecification(PaginatedProductDto dto) {
        Specification<Product> spec = (root, query, cb) -> cb.conjunction();

        spec = spec.and((root, query, cb) -> cb.or(cb.isNull(root.get("isDeleted")), cb.isFalse(root.get("isDeleted"))));
        spec = spec.and((root, query, cb) -> cb.or(cb.isFalse(root.get("brand").get("isDeleted")), cb.isNull(root.get("brand").get("isDeleted"))));
        spec = spec.and((root, query, cb) -> cb.or(cb.isFalse(root.get("category").get("isDeleted")), cb.isNull(root.get("category").get("isDeleted"))));
        spec = spec.and((root, query, cb) -> cb.isTrue(root.get("brand").get("isActive")));
        spec = spec.and((root, query, cb) -> cb.isTrue(root.get("category").get("isActive")));

        if (dto.getProductId() != null && dto.getProductId() != 0) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("id"), dto.getProductId()));
            return spec;
        }

        if (dto.getBrandId() != null && dto.getBrandId() != 0) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("brand").get("id"), dto.getBrandId()));
        }

        if (dto.getMarketId() != null && dto.getMarketId() != 0) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("category").get("markets").get("id"), dto.getMarketId()));
        }

        if (dto.getCategoryId() != null && dto.getCategoryId() != 0) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("category").get("id"), dto.getCategoryId()));
        }

        if (dto.getFromDate() != null) {
            spec = spec.and((root, query, cb) -> cb.greaterThanOrEqualTo(root.get("createdAt"), dto.getFromDate()));
        }

        if (dto.getIsActive() != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("isActive"), dto.getIsActive()));
        }

        if (Boolean.TRUE.equals(dto.getInStock())) {
            spec = spec.and((root, query, cb) -> {
                var subquery = query.subquery(Integer.class);
                var stockRoot = subquery.from(Stock.class);

                subquery.select(cb.literal(1));
                subquery.where(
                        cb.equal(stockRoot.get("products"), root),
                        cb.or(cb.isNull(stockRoot.get("isDeleted")), cb.isFalse(stockRoot.get("isDeleted"))),
                        cb.greaterThan(stockRoot.get("qty"), 0.0)
                );

                return cb.exists(subquery);
            });
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
                String searchTerm = "%" + dto.getSearch().toLowerCase() + "%";

                Predicate byName = cb.like(cb.lower(root.get("name")), searchTerm);
                Predicate byCode = cb.like(cb.lower(root.get("code")), searchTerm);

                return cb.or(byName, byCode);
            });
        }


        return spec;
    }
}
