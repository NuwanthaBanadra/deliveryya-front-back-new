package com.kaleox.deliveryya.repo;

import com.kaleox.deliveryya.entities.PaymentCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PaymentCategoryRepo extends JpaRepository<PaymentCategory, Integer> {
}