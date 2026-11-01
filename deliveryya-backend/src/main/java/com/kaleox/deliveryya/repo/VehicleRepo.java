package com.kaleox.deliveryya.repo;

import com.kaleox.deliveryya.entities.Vehicle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface VehicleRepo extends JpaRepository<Vehicle, Integer>, JpaSpecificationExecutor<Vehicle> {

	boolean existsByNumberIgnoreCase(String number);

	boolean existsByNumberIgnoreCaseAndIdNot(String number, Integer id);
}

