package com.kaleox.deliveryya.repo;

import com.kaleox.deliveryya.entities.DeliveryTo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface DeliveryToRepo extends JpaRepository<DeliveryTo, Integer> {

	@Query(value = """
			select distinct dt
			from DeliveryTo dt
			join dt.order o
			join o.orderCode oc
			where oc.users.id = :userId
			  and (
					:search is null or :search = ''
					or lower(coalesce(dt.primaryMobile, '')) like lower(concat('%', :search, '%'))
					or lower(coalesce(dt.secondaryMobile, '')) like lower(concat('%', :search, '%'))
					or lower(coalesce(dt.whatsapp, '')) like lower(concat('%', :search, '%'))
			  )
			order by dt.id desc
			""",
			countQuery = """
			select count(distinct dt.id)
			from DeliveryTo dt
			join dt.order o
			join o.orderCode oc
			where oc.users.id = :userId
			  and (
					:search is null or :search = ''
					or lower(coalesce(dt.primaryMobile, '')) like lower(concat('%', :search, '%'))
					or lower(coalesce(dt.secondaryMobile, '')) like lower(concat('%', :search, '%'))
					or lower(coalesce(dt.whatsapp, '')) like lower(concat('%', :search, '%'))
			  )
			""")
	Page<DeliveryTo> findRelatedDeliveriesByUserAndSearch(@Param("userId") Integer userId,
														  @Param("search") String search,
														  Pageable pageable);
}