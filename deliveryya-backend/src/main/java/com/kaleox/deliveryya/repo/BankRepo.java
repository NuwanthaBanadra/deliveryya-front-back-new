package com.kaleox.deliveryya.repo;

import com.kaleox.deliveryya.entities.Bank;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface BankRepo extends JpaRepository<Bank, Integer> {
}

