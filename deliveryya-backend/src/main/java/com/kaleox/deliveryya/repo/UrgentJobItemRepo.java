package com.kaleox.deliveryya.repo;

import com.kaleox.deliveryya.entities.UrgentJobItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface UrgentJobItemRepo extends JpaRepository<UrgentJobItem, Integer> {

    List<UrgentJobItem> findByUrgentJobs_Id(Integer urgentJobId);

    List<UrgentJobItem> findByUrgentJobs_IdIn(List<Integer> urgentJobIds);

    void deleteByUrgentJobs_Id(Integer urgentJobId);
}

