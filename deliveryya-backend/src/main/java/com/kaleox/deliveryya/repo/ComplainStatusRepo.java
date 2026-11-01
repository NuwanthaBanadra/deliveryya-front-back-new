package com.kaleox.deliveryya.repo;

import com.kaleox.deliveryya.entities.ComplainStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ComplainStatusRepo extends JpaRepository<ComplainStatus, Integer> {
}

