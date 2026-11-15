package com.kaleox.deliveryya.entities;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

@Builder
@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
@Entity
@Table(name = "delivery_details")
public class DeliveryDetail {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Integer id;

    @Size(max = 100)
    @NotNull
    @Column(name = "address", nullable = false, length = 100)
    private String address;

    @Size(max = 20)
    @NotNull
    @Column(name = "tag", nullable = false, length = 20)
    private String tag;

    @NotNull
    @Column(name = "permanent", nullable = false)
    private Boolean permanent;

    @Column(name = "location", length = 150)
    private String location;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "users_id", nullable = false)
    private User users;

    @Size(max = 20)
    @NotNull
    @Column(name = "primary_mobile", nullable = false, length = 20)
    private String primaryMobile;

    @Size(max = 20)
    @NotNull
    @Column(name = "secondaryMobile", nullable = false, length = 20)
    private String secondaryMobile;

    @Size(max = 100)
    @NotNull
    @Column(name = "whatsapp", nullable = false, length = 100)
    private String whatsapp;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "cities_id", nullable = false)
    private City cities;


}