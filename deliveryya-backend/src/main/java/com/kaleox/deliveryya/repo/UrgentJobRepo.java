package com.kaleox.deliveryya.repo;

import com.kaleox.deliveryya.entities.UrgentJob;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UrgentJobRepo extends JpaRepository<UrgentJob, Integer>, JpaSpecificationExecutor<UrgentJob> {
    
    Optional<UrgentJob> findByJobCode(String jobCode);

    @Query(value = "SELECT COALESCE(MAX(CAST(SUBSTRING(uj.job_code, 5) AS UNSIGNED)), 0) FROM urgent_jobs uj WHERE uj.job_code LIKE 'UJC-%'", nativeQuery = true)
    Integer findMaxJobCodeSequence();

    Optional<UrgentJob> findByIdOrJobCode(Integer id, String jobCode);
}

