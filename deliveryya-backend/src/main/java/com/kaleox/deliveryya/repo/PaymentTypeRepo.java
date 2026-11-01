package com.kaleox.deliveryya.repo;

import com.kaleox.deliveryya.entities.PaymentType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PaymentTypeRepo extends JpaRepository<PaymentType, Integer> {
}
