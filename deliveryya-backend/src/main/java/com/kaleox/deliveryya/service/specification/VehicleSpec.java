package com.kaleox.deliveryya.service.specification;

import com.kaleox.deliveryya.dto.paginatedDto.PaginatedVehicleDto;
import com.kaleox.deliveryya.entities.Vehicle;
import org.jspecify.annotations.NonNull;
import org.springframework.data.jpa.domain.Specification;

public class VehicleSpec {

    public static @NonNull Specification<Vehicle> getVehicleSpecification(PaginatedVehicleDto dto) {
        Specification<Vehicle> spec = (root, query, cb) -> cb.conjunction();

        if (dto.getVehicleId() != null && dto.getVehicleId() != 0) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("id"), dto.getVehicleId()));
            return spec;
        }

        if (dto.getVehicleTypeId() != null && dto.getVehicleTypeId() != 0) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("vehicleType").get("id"), dto.getVehicleTypeId()));
        }

        if (dto.getNumber() != null && !dto.getNumber().isBlank() && !"0".equals(dto.getNumber())) {
            spec = spec.and((root, query, cb) -> cb.equal(cb.lower(root.get("number")), dto.getNumber().toLowerCase()));
        }

        if (dto.getLicenseExpFrom() != null) {
            spec = spec.and((root, query, cb) -> cb.greaterThanOrEqualTo(root.get("licenseExp"), dto.getLicenseExpFrom()));
        }

        if (dto.getLicenseExpTo() != null) {
            spec = spec.and((root, query, cb) -> cb.lessThanOrEqualTo(root.get("licenseExp"), dto.getLicenseExpTo()));
        }

        if (dto.getSearch() != null && !dto.getSearch().isBlank() && !"0".equals(dto.getSearch())) {
            spec = spec.and((root, query, cb) -> {
                String term = "%" + dto.getSearch().toLowerCase() + "%";
                return cb.or(
                        cb.like(cb.lower(root.get("name")), term),
                        cb.like(cb.lower(root.get("number")), term),
                        cb.like(cb.lower(root.get("vehicleType").get("name")), term)
                );
            });
        }

        return spec;
    }
}

