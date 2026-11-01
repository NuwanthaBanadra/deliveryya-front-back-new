package com.kaleox.deliveryya.repo;

import com.kaleox.deliveryya.entities.JobStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface JobStatusRepo extends JpaRepository<JobStatus, Integer> {
}

