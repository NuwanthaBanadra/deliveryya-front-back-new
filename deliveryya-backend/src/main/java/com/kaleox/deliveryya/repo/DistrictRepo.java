package com.kaleox.deliveryya.repo;

import com.kaleox.deliveryya.entities.District;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DistrictRepo extends JpaRepository<District, Integer> {
}
