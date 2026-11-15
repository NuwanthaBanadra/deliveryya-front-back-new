package com.kaleox.deliveryya.entities;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Builder
@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "agent_jobs")
public class AgentJob {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "urgent_jobs_id")
    private UrgentJob urgentJob;

    @NotNull
    @Column(name = "task", nullable = false, length = 150)
    private String task;

    @NotNull
    @Column(name = "accepted", nullable = false)
    private Boolean accepted = false;

    @NotNull
    @Column(name = "isComplete", nullable = false, columnDefinition = "BOOLEAN DEFAULT FALSE")
    private Boolean isComplete = false;

    @Builder.Default
    @OneToMany(mappedBy = "agentJob", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<AgentJobTask> agentJobTasks = new ArrayList<>();

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employees_id", nullable = false)
    private Employee employees;

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;
    @LastModifiedDate
    private LocalDateTime updatedAt;
    @CreatedBy
    @Column(updatable = false)
    private String createdBy;
    @LastModifiedBy
    private String updatedBy;

}