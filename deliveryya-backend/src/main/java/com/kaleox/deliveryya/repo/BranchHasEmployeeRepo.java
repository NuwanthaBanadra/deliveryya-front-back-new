package com.kaleox.deliveryya.repo;

import com.kaleox.deliveryya.entities.BranchHasEmployee;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BranchHasEmployeeRepo extends JpaRepository<BranchHasEmployee, Integer> {
    List<BranchHasEmployee> findByBranch_Id(Integer branchId);

    List<BranchHasEmployee> findByEmployee_Users_Id(Integer userId);

    Optional<BranchHasEmployee> findByBranch_IdAndEmployee_Id(Integer branchId, Integer employeeId);
}
