package com.kaleox.deliveryya.repo;

import com.kaleox.deliveryya.entities.Access;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface AccessRepo extends JpaRepository<Access, Integer>, JpaSpecificationExecutor<Access> {
}