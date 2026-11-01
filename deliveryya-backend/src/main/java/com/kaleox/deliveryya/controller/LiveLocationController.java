package com.kaleox.deliveryya.controller;

import com.kaleox.deliveryya.dto.ResponseDto;
import com.kaleox.deliveryya.dto.delivery.DeliveryDto;
import com.kaleox.deliveryya.entities.Employee;
import com.kaleox.deliveryya.repo.EmployeeRepo;
import com.kaleox.deliveryya.service.AuthService;
import com.kaleox.deliveryya.service.EmployeeService;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.security.Principal;
import java.util.List;
import java.util.Map;
import java.util.concurrent.*;

@Slf4j
@RestController
@RequestMapping("/api/v1/live-locations")
@RequiredArgsConstructor
public class LiveLocationController {

    // Cache for current location: Employee ID -> Location String
    private static final Map<Integer, String> employeeLocations = new ConcurrentHashMap<>();
    
    // Cache for User ID -> Employee ID mapping to avoid DB lookups for ID resolution
    private static final Map<Integer, Integer> userToEmployeeIdMap = new ConcurrentHashMap<>();

    // SSE Emitters: Employee ID -> List of Emitters listening to that employee
    private static final Map<Integer, List<SseEmitter>> sseEmitters = new ConcurrentHashMap<>();

    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(1);

    private final EmployeeService employeeService;
    private final AuthService authService;
    private final EmployeeRepo employeeRepo;

    @PostConstruct
    public void init() {
        // Send periodic updates every 5 seconds to keep the stream alive and ensure fresh connection data
        scheduler.scheduleAtFixedRate(this::sendPeriodicUpdates, 0, 5, TimeUnit.SECONDS);
    }

    @PreDestroy
    public void cleanup() {
        scheduler.shutdown();
    }

    private void sendPeriodicUpdates() {
        sseEmitters.forEach((employeeId, emitters) -> {
            if (emitters.isEmpty()) return;

            String location = employeeLocations.get(employeeId);
            if (location == null) {
                // Fetch from DB if not in cache (using 'location' field as requested)
                location = employeeRepo.findById(employeeId)
                        .map(Employee::getLocation)
                        .orElse(null);

                if (location != null) {
                    employeeLocations.put(employeeId, location);
                }
            }

            if (location != null && !"unknown".equals(location)) {
                final String locData = location;
                emitters.forEach(emitter -> {
                    try {
                        emitter.send(SseEmitter.event().name("location").data(locData));
                    } catch (IOException e) {
                        // Dead emitter, will be cleaned up by callbacks
                    }
                });
            }
        });
    }

    /**
     * REST endpoint for updating location (Legacy support)
     */
    @PutMapping("/update-employee-location")
    public ResponseEntity<ResponseDto<String>> updateEmployeeLocation(@RequestParam String location, @AuthenticationPrincipal UserDetails userDetails) {
        int userId = Integer.parseInt(userDetails.getUsername());
        updateAndBroadcast(userId, location);
        return ResponseEntity.ok(ResponseDto.<String>builder().message("Success").desc("Employee location updated successfully").build());
    }

    /**
     * Method to handle raw websocket updates delegated from RawWebSocketConfig
     */
    public void processRawLocationUpdate(Principal principal, String location) {
        handlePrincipalUpdate(principal, location);
    }

    private void handlePrincipalUpdate(Principal principal, String location) {
        if (principal instanceof UsernamePasswordAuthenticationToken auth) {
            UserDetails userDetails = (UserDetails) auth.getPrincipal();
            try {
                int userId = Integer.parseInt(userDetails.getUsername());
                updateAndBroadcast(userId, location);
            } catch (NumberFormatException e) {
                log.error("Failed to parse user ID from principal: {}", userDetails.getUsername());
            }
        }
    }

    @GetMapping("/subscribe")
    public SseEmitter subscribeToLocation(@RequestParam @Valid @NotNull Integer employeeId) {
        SseEmitter emitter = new SseEmitter(Long.MAX_VALUE); // Infinite timeout

        sseEmitters.computeIfAbsent(employeeId, k -> new CopyOnWriteArrayList<>()).add(emitter);

        // Send initial location if available
        String currentLocation = employeeLocations.get(employeeId);
        if (currentLocation == null) {
            currentLocation = employeeRepo.findById(employeeId)
                    .map(Employee::getLocation)
                    .orElse("unknown");
            if (!"unknown".equals(currentLocation)) {
                employeeLocations.put(employeeId, currentLocation);
            }
        }

        try {
            emitter.send(SseEmitter.event().name("location").data(currentLocation));
        } catch (IOException e) {
            // Emitter might be dead already, let completion handler clean it up
        }

        Runnable removeEmitter = () -> {
            List<SseEmitter> emitters = sseEmitters.get(employeeId);
            if (emitters != null) {
                emitters.remove(emitter);
                if (emitters.isEmpty()) {
                    sseEmitters.remove(employeeId);
                }
            }
        };

        emitter.onCompletion(removeEmitter);
        emitter.onTimeout(removeEmitter);
        emitter.onError((e) -> removeEmitter.run());

        log.info("New SSE subscription for employee {}", employeeId);
        return emitter;
    }

    private void updateAndBroadcast(int userId, String location) {
        // Check cache to avoid unnecessary DB updates
        Integer cachedEmployeeId = userToEmployeeIdMap.get(userId);
        if (cachedEmployeeId != null) {
            String lastLocation = employeeLocations.get(cachedEmployeeId);
            if (lastLocation != null && lastLocation.equals(location)) {
                return; // Location unchanged, skip DB update and broadcast
            }
        }

        try {
            // Update DB and get Employee DTO (contains actual employee ID)
            DeliveryDto.EmployeeDto employeeDto = employeeService.updateEmployeeLocation(userId, location);
            int employeeId = employeeDto.getId();

            // Cache User ID -> Employee ID mapping
            userToEmployeeIdMap.put(userId, employeeId);

            // Update Cache using Employee ID
            employeeLocations.put(employeeId, location);
            
            // Broadcast via SSE
            List<SseEmitter> emitters = sseEmitters.get(employeeId);
            if (emitters != null) {
                for (SseEmitter emitter : emitters) {
                    try {
                        emitter.send(SseEmitter.event().name("location").data(location));
                    } catch (IOException e) {
                        // Dead emitter, will be cleaned up by callbacks
                    }
                }
            }

            log.info("Updated location for Employee ID {}: {}", employeeId, location);
        } catch (Exception e) {
            log.error("Error updating location for User ID {}: {}", userId, e.getMessage());
        }
    }
}
