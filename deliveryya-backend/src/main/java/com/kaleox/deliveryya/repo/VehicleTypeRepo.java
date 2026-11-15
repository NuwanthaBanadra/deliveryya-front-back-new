package com.kaleox.deliveryya.repo;

import com.kaleox.deliveryya.entities.VehicleType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface VehicleTypeRepo extends JpaRepository<VehicleType, Integer> {
}

