package com.kaleox.deliveryya.entities;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import org.hibernate.annotations.ColumnDefault;
import org.hibernate.annotations.DialectOverride;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Builder
@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
@Entity
@EntityListeners(AuditingEntityListener.class)
@Table(name = "orders")
public class Order {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Integer id;

//    @Size(max = 25)
//    @NotNull
//    @Column(name = "code", nullable = false, length = 25)
//    private String code;

    @NotNull
    @ColumnDefault("0")
    @Column(name = "discount", nullable = false)
    private Double discount;

    @NotNull
    @ColumnDefault("0.00")
    @Column(name = "paid_amount", nullable = false)
    @Builder.Default
    private Double paidAmount = 0.00;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "market_orders_id")
    private MarketOrder marketOrder;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "third_party_senders_id")
    private ThirdPartySenders thirdPartySenders;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "payment_status_id", nullable = false)
    private PaymentStatus paymentStatus;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "payment_type_id", nullable = false)
    private PaymentType paymentType;

    @Column(name = "delivery_fee")
    private Double deliveryFee;

    @NotNull
    @Column(name = "collective_price", nullable = false)
    private Double collectivePrice;

    @NotNull
    @Column(name = "qty", nullable = false)
    private Double qty;

    @NotNull
    @Column(name = "total_price", nullable = false)
    private Double totalPrice;

    @Column(name = "`desc`", columnDefinition = "TEXT")
    private String desc;

    @Column(name = "`dontCollectDeliveryFeeFromCustomer`", nullable = false, columnDefinition = "BOOLEAN DEFAULT FALSE")
    private Boolean dontCollectDeliveryFeeFromCustomer = false;

//    @Column(name = "`delivery_fee_collected`", nullable = false, columnDefinition = "BOOLEAN DEFAULT FALSE")
//    private Boolean deliveryFeeCollected = false;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "delivery_status_id", nullable = false)
    private DeliveryStatus deliveryStatus;

    @NotNull
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_codes_id", referencedColumnName = "id")
    private OrderCode orderCode;

    @NotNull
    @Column(name = "weight", nullable = false)
    private Double weight;

//    @NotNull
//    @ManyToOne(fetch = FetchType.LAZY, optional = false)
//    @JoinColumn(name = "users_id", nullable = false)
//    private User user;

    @OneToOne(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    private DeliveryTo deliveryTo;

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "`is_deleted`", nullable = false, columnDefinition = "BOOLEAN DEFAULT FALSE")
    private Boolean isDeleted = false;
}