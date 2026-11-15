package com.kaleox.deliveryya.service.specification;

import com.kaleox.deliveryya.dto.paginatedDto.PaginatedDeliveryFeesDto;
import com.kaleox.deliveryya.entities.DeliveryFee;
import org.jspecify.annotations.NonNull;
import org.springframework.data.jpa.domain.Specification;

public class DeliveryFeeSpec {

    public static @NonNull Specification<DeliveryFee> getDeliveryFeeSpecification(PaginatedDeliveryFeesDto dto) {
        Specification<DeliveryFee> spec = (root, query, cb) -> cb.conjunction();

        // New filters supported:
        // - deliveryFeeId (matches DeliveryFee.id)
        // - deliveryFeeFrom, deliveryFeeTo -> filter on DeliveryFee.fee (range)
        // - additionalFeeFrom, additionalFeeTo -> filter on DeliveryFee.additionalFee (range)
        // - cityId -> DeliveryFee.city.id
        // - districtId -> DeliveryFee.city.district.id
        // - search -> partial case-insensitive match on city.name

        if (dto.getDeliveryFeeId() != null && dto.getDeliveryFeeId() != 0) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("id"), dto.getDeliveryFeeId()));
            return spec;
        }

        if (dto.getDeliveryFeeFrom() != null) {
            spec = spec.and((root, query, cb) -> cb.greaterThanOrEqualTo(root.get("fee"), dto.getDeliveryFeeFrom()));
        }

        if (dto.getDeliveryFeeTo() != null) {
            spec = spec.and((root, query, cb) -> cb.lessThanOrEqualTo(root.get("fee"), dto.getDeliveryFeeTo()));
        }

        if (dto.getAdditionalFeeFrom() != null) {
            spec = spec.and((root, query, cb) -> cb.greaterThanOrEqualTo(root.get("additionalFee"), dto.getAdditionalFeeFrom()));
        }

        if (dto.getAdditionalFeeTo() != null) {
            spec = spec.and((root, query, cb) -> cb.lessThanOrEqualTo(root.get("additionalFee"), dto.getAdditionalFeeTo()));
        }

        if (dto.getCityId() != null && dto.getCityId() != 0) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("city").get("id"), dto.getCityId()));
        }

        if (dto.getDistrictId() != null && dto.getDistrictId() != 0) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("city").get("district").get("id"), dto.getDistrictId()));
        }

        // Search by city name (case-insensitive, partial match)
        if (dto.getSearch() != null && !dto.getSearch().isBlank()) {
            spec = spec.and((root, query, cb) -> {
                String searchTerm = "%" + dto.getSearch().toLowerCase() + "%";
                return cb.like(cb.lower(root.get("city").get("name")), searchTerm);
            });
        }

        return spec;
    }
}
