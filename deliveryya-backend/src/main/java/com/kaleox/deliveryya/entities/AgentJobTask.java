package com.kaleox.deliveryya.entities;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Builder
@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "agent_job_tasks")
public class AgentJobTask {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Integer id;

    @NotNull
    @Column(name = "task", nullable = false, length = 150)
    private String task;

    @NotNull
    @Column(name = "isComplete", nullable = false, columnDefinition = "BOOLEAN DEFAULT FALSE")
    private Boolean isComplete = false;

    @Column(name = "location", nullable = false, length = 150)
    private String location;

    @Column(name = "be_at")
    private LocalDateTime beAt;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "agent_job_id", nullable = false)
    private AgentJob agentJob;

}