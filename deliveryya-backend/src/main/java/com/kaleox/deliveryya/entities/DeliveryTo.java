package com.kaleox.deliveryya.entities;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
@Table(name = "delivery_to")
public class DeliveryTo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(length = 100, nullable = false)
    private String address;

    @Column(name = "primary_mobile", length = 20, nullable = false)
    private String primaryMobile;

    @Column(name = "secondary_mobile", length = 20)
    private String secondaryMobile;

    @Column(length = 20)
    private String whatsapp;

    @Column(name = "full_name", length = 100, nullable = false)
    private String fullName;

    @Column(name = "location", length = 150)
    private String location;

    // One-to-One relationship with Order
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "orders_id", referencedColumnName = "id", nullable = false)
    private Order order;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "users_id", referencedColumnName = "id")
    private User user;

    // One-to-One relationship with City
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cites_id", referencedColumnName = "id", nullable = false)
    private City city;
}
