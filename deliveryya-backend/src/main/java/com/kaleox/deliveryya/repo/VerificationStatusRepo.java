package com.kaleox.deliveryya.repo;


import com.kaleox.deliveryya.entities.VerificationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface VerificationStatusRepo extends JpaRepository<VerificationStatus, Integer> {
}
