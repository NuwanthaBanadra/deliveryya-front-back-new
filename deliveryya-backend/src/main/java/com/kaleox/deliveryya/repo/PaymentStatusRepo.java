package com.kaleox.deliveryya.repo;

import com.kaleox.deliveryya.entities.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PaymentStatusRepo extends JpaRepository<PaymentStatus, Integer> {
}
