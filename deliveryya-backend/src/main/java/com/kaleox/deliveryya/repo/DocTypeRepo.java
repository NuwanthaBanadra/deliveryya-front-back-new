package com.kaleox.deliveryya.repo;

import com.kaleox.deliveryya.entities.DocType;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DocTypeRepo extends JpaRepository<DocType, Integer> {
}