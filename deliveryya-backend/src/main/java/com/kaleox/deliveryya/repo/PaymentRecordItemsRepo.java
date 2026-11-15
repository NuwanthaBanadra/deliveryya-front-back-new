package com.kaleox.deliveryya.repo;

import com.kaleox.deliveryya.entities.PaymentRecordItems;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PaymentRecordItemsRepo extends JpaRepository<PaymentRecordItems, Integer> {
    List<PaymentRecordItems> findByPaymentRecord_IdIn(List<Integer> paymentRecordIds);

    List<PaymentRecordItems> findByPaymentRecord_Id(Integer paymentRecordId);

    void deleteByPaymentRecord_Id(Integer paymentRecordId);

    @Query("""
            SELECT CASE WHEN COUNT(pri) > 0 THEN true ELSE false END
            FROM PaymentRecordItems pri
            JOIN pri.paymentRecord pr
            JOIN pr.paymentCategory pc
            JOIN pr.verificationStatus vs
            WHERE UPPER(pri.code) = UPPER(:code)
              AND pc.name = 'HANDOVER'
              AND vs.id = 1
            """)
    boolean existsVerifiedHandoverItem(@Param("code") String code);
}
