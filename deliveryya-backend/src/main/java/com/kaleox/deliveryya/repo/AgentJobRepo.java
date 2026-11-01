package com.kaleox.deliveryya.repo;

import com.kaleox.deliveryya.entities.AgentJob;
import com.kaleox.deliveryya.entities.Employee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AgentJobRepo extends JpaRepository<AgentJob, Integer>, JpaSpecificationExecutor<AgentJob> {

    void deleteByEmployees_Id(Integer employeeId);

    void deleteByUrgentJob_Id(Integer urgentJobId);

    List<AgentJob> findByUrgentJob_Id(Integer urgentJobId);

    @Query("""
                SELECT aj
                FROM AgentJob aj
                JOIN aj.urgentJob uj
                LEFT JOIN uj.jobStatus js
                LEFT JOIN uj.paymentStatus ps
                WHERE aj.employees = :employee
                  AND (js.id <> 3 OR js IS NULL OR ps.id <> :statusId OR ps IS NULL)
            """)
    List<AgentJob> findByEmployeesAndUrgentJob_PaymentStatus_IdIsNot(@Param("employee") Employee employees, @Param("statusId") Integer urgentJobPaymentStatusId);

    @Query("""
                SELECT aj
                FROM AgentJob aj
                JOIN aj.urgentJob uj
                WHERE aj.employees = :employee
                  AND aj.accepted = true
                  AND uj.paymentType.id = 1
            """)
    List<AgentJob> findEligibleHandoverUrgentJobs(@Param("employee") Employee employee);
}

