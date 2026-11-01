package com.kaleox.deliveryya.entities;

import jakarta.persistence.*;
import lombok.*;

@Builder
@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
@Entity
@Table(name = "api_features")
public class ApiFeature {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Integer id;

    @Column(name = "name", length = 100,nullable = false, unique = true)
    private String name;

    @Column(name = "`desc`", length = 200,nullable = false)
    private String desc;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "api_id", nullable = false)
    private Api api;

    // add other columns used in your project (e.g. permissions, enabled, etc.)
}

