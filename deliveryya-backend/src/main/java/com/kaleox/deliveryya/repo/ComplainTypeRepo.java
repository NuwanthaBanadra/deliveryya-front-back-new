package com.kaleox.deliveryya.repo;

import com.kaleox.deliveryya.entities.ComplainType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ComplainTypeRepo extends JpaRepository<ComplainType, Integer> {
}

