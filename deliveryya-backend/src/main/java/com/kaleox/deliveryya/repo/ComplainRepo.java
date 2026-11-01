package com.kaleox.deliveryya.repo;

import com.kaleox.deliveryya.entities.Complain;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ComplainRepo extends JpaRepository<Complain, Integer>, JpaSpecificationExecutor<Complain> {
    boolean existsByCode(String code);
    List<Complain> findAllByCode(String code);
}

