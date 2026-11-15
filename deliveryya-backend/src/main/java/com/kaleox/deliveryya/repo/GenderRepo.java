package com.kaleox.deliveryya.repo;

import com.kaleox.deliveryya.entities.Gender;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GenderRepo extends JpaRepository<Gender, Integer> {
}