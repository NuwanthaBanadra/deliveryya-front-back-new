package com.kaleox.deliveryya.controller;

import com.kaleox.deliveryya.config.BusinessException;
import com.kaleox.deliveryya.dto.ResponseDto;
import com.kaleox.deliveryya.dto.customDto.CommonIdNameDto;
import com.kaleox.deliveryya.dto.paginatedDto.PaginatedApiDto;
import com.kaleox.deliveryya.dto.paginatedDto.PaginatedGrantedAccessesDto;
import com.kaleox.deliveryya.dto.paginatedDto.PaginatedGrantedUsersDto;
import com.kaleox.deliveryya.dto.user.*;
import com.kaleox.deliveryya.service.AccessService;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.http.client.methods.CloseableHttpResponse;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.impl.client.HttpClients;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@RestController
@RequestMapping("/api/v1/access")
@RequiredArgsConstructor
public class AccessController {
    public static final String SESSION_ACCESS_IDS_PREFIX = "ACCESS_IDS_";
    public static final String SESSION_API_IDS_PREFIX = "ACCESS_API_IDS_";
    private final AccessService accessService;
    private final HttpSession httpSession;

    /**
     * Invalidate cached access details for a user in the session.
     * Call this whenever access is granted/revoked to ensure fresh data on next request.
     */
    private void invalidateAccessCache(Integer userId) {
        httpSession.removeAttribute(SESSION_ACCESS_IDS_PREFIX + userId);
        httpSession.removeAttribute(SESSION_API_IDS_PREFIX + userId);
    }

    /**
     * Invalidate cached access details for the currently authenticated user.
     * Useful when API features or access-API mappings change.
     */
    @SuppressWarnings("unused")
    private void invalidateCurrentUserAccessCache(UserDetails userDetails) {
        if (userDetails != null) {
            try {
                Integer userId = Integer.valueOf(userDetails.getUsername());
                invalidateAccessCache(userId);
            } catch (Exception e) {
                log.warn("Failed to extract user ID for cache invalidation", e);
            }
        }
    }

    @PostMapping("/get-all")
    public ResponseEntity<ResponseDto<PaginatedGrantedAccessesDto>> getAllAccesses(@RequestBody @Valid PaginatedGrantedAccessesDto dto) {
        return ResponseEntity.ok(accessService.getAllAccesses(dto));
    }

    @PostMapping("/get-all-apis")
    public ResponseEntity<ResponseDto<PaginatedApiDto>> getAllApis(@RequestBody @Valid PaginatedApiDto dto) {
        return ResponseEntity.ok(accessService.getAllApis(dto));
    }

    @GetMapping("/get-access-types")
    public ResponseEntity<ResponseDto<List<CommonIdNameDto>>> getAccessTypes(@RequestParam(required = false) Integer accessTypeId) {
        return ResponseEntity.ok(ResponseDto.<List<CommonIdNameDto>>builder()
                .message("Success")
                .desc("Access types fetched successfully")
                .object(accessService.getAccessTypes(accessTypeId))
                .build());
    }

    @GetMapping("/get-api-features")
    public ResponseEntity<ResponseDto<List<ApiFeatureDto>>> getApiFeatures(@RequestParam(required = false) Integer apiFeatureId,
                                                                           @RequestParam(required = false) Integer apiId) {
        return ResponseEntity.ok(ResponseDto.<List<ApiFeatureDto>>builder()
                .message("Success")
                .desc("Api features fetched successfully")
                .object(accessService.getApiFeatures(apiFeatureId, apiId))
                .build());
    }

    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_SUPPER ADMIN', 'ROLE_MANAGER', 'ROLE_OWNER')")
    @PostMapping("/get-all-access-granted-users")
    public ResponseEntity<ResponseDto<PaginatedGrantedUsersDto>> getAllAccessGrantedUsers(@RequestBody @Valid PaginatedGrantedUsersDto dto) {
        return ResponseEntity.ok(accessService.getAllAccessGrantedUsers(dto));
    }

    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_SUPPER ADMIN', 'ROLE_MANAGER', 'ROLE_OWNER')")
    @PostMapping("/grant-access-to-user-role")
    public ResponseEntity<ResponseDto<Void>> grantAccessToUserRole(@RequestBody @Valid UpdateAccessDto dto) {

        ResponseDto<Void> response = ResponseDto.<Void>builder()
                .message("Success")
                .desc(accessService.grantAccessToUserRole(dto))
                .build();

        // Note: Consider clearing session cache for all users with this role
        // This is a complex operation, so it may require a separate invalidation mechanism

        return ResponseEntity.ok(response);
    }


    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_SUPPER ADMIN', 'ROLE_MANAGER', 'ROLE_OWNER')")
    @GetMapping("/get-granted-accesses-by-user-role-id")
    public ResponseEntity<ResponseDto<List<AccessHasUserRoleDto>>> getGrantedAccesses(@RequestParam @Valid @Min(1) Integer userRoleId) {

        return ResponseEntity.ok(ResponseDto.<List<AccessHasUserRoleDto>>builder()
                .message("Success")
                .desc("GrantedAccesses retrieved successfully")
                .object(accessService.getGrantedAccesses(userRoleId))
                .build());
    }

    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_SUPPER ADMIN', 'ROLE_MANAGER', 'ROLE_OWNER')")
    @GetMapping("/get-granted-accesses-by-user-id")
    public ResponseEntity<ResponseDto<List<UserHasAccessDto>>> getGrantedAccessesByUserId(@RequestParam @Valid @Min(1) Integer userId) {

        return ResponseEntity.ok(ResponseDto.<List<UserHasAccessDto>>builder()
                .message("Success")
                .desc("GrantedAccesses retrieved successfully")
                .object(accessService.getGrantedAccessesByUserId(userId))
                .build());
    }


    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_SUPPER ADMIN', 'ROLE_MANAGER', 'ROLE_OWNER')")
    @PostMapping("/grant-access-to-user")
    public ResponseEntity<ResponseDto<Void>> grantAccessToUser(@RequestBody @Valid GrantAccessToUserDto dto) {

        ResponseDto<Void> response = ResponseDto.<Void>builder()
                .message("Success")
                .desc(accessService.grantAccessToUser(dto))
                .build();

        // Invalidate cache for the user whose access was modified
        if (dto.getUsersId() != null) {
            invalidateAccessCache(dto.getUsersId());
        }

        return ResponseEntity.ok(response);
    }

    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_SUPPER ADMIN','ROLE_OWNER')")
    @PostMapping("/create-access")
    public ResponseEntity<ResponseDto<Integer>> createAccess(@RequestBody @Valid CreateAccessRequestDto dto) {
        return ResponseEntity.ok(ResponseDto.<Integer>builder()
                .message("Success")
                .desc("Access created successfully")
                .object(accessService.createAccess(dto))
                .build());
    }

    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_SUPPER ADMIN','ROLE_OWNER')")
    @PostMapping("/set-access")
    public ResponseEntity<ResponseDto<Void>> setAccess(@RequestBody @Valid SetAccessRequestDto dto) {
        return ResponseEntity.ok(ResponseDto.<Void>builder()
                .message("Success")
                .desc(accessService.setAccess(dto))
                .build());
    }

    //    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_SUPPER ADMIN')")
    @PostMapping("/link-access-with-api")
    public ResponseEntity<ResponseDto<Void>> linkAccessWithApi(@RequestBody @Valid LinkAccessWithApiRequestDto dto) {
        return ResponseEntity.ok(ResponseDto.<Void>builder()
                .message("Success")
                .desc(accessService.linkAccessWithApi(dto))
                .build());
    }

    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_SUPPER ADMIN')")
    @PostMapping("/remove-api-features-for-api")
    public ResponseEntity<ResponseDto<Void>> removeApiFeaturesForApi(@RequestBody @Valid RemoveApiFeaturesForApiRequestDto dto) {
        return ResponseEntity.ok(ResponseDto.<Void>builder()
                .message("Success")
                .desc(accessService.removeApiFeaturesForApi(dto))
                .build());
    }

    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_SUPPER ADMIN')")
    @PostMapping("/set-api-features-for-api")
    public ResponseEntity<ResponseDto<Void>> setApiFeaturesForApi(@RequestBody @Valid SetApiFeaturesForApiRequestDto dto) {
        return ResponseEntity.ok(ResponseDto.<Void>builder()
                .message("Success")
                .desc(accessService.setApiFeaturesForApi(dto))
                .build());
    }


    //    @PreAuthorize("hasRole('SUPER_ADMIN') or " +
//            "hasRole('ADMIN') or " +
//            "hasRole('OWNER') or " +
//            "hasRole('MANAGER') or " +
//            "hasRole('CLIENT') or " +
//            "hasRole('MARKET_OWNER') or " +
//            "hasRole('SECRETORY') or " +
//            "hasRole('ACCOUNTS_MANAGER') or " +
//            "hasRole('ACCOUNT_ASSISTANT') or " +
//            "hasRole('MARKETS_MANAGER')"
//    )

    @GetMapping("/get-access-details")
    public ResponseEntity<ResponseDto<Set<Integer>>> getAccessDetails(@AuthenticationPrincipal UserDetails userDetails) {
        Integer userId = Integer.valueOf(userDetails.getUsername());

        // Check if access details are already in session to avoid redundant database calls
        String accessIdsKey = SESSION_ACCESS_IDS_PREFIX + userId;
        String apiIdsKey = SESSION_API_IDS_PREFIX + userId;

        @SuppressWarnings("unchecked")
        Set<Integer> accessIds = (Set<Integer>) httpSession.getAttribute(accessIdsKey);

        // Only fetch from database if not already cached in session
        if (accessIds == null) {
            accessIds = accessService.getAccessDetailsByUser(userId);
            Set<Integer> apiIds = accessService.getFullAccessDetailsByUser(accessIds.stream().toList());
            httpSession.setAttribute(accessIdsKey, accessIds);
            httpSession.setAttribute(apiIdsKey, apiIds);
        }

        return ResponseEntity.ok(ResponseDto.<Set<Integer>>builder()
                .message("Success")
                .desc("Access details fetched successfully")
                .object(accessIds)
                .build());
    }
//
//    @GetMapping("/get-all-access-granted-users")
//    public ResponseEntity<ResponseDto<List<UserDto>>> getAllAccessGrantedUsers() {
//        return ResponseEntity.ok(ResponseDto.<List<UserDto>>builder()
//                .message("Success")
//                .desc("Access details fetched successfully")
//                .object(accessService.getAllAccessGrantedUsers())
//                .build());
//    }
//
//    @GetMapping("/get-access-details-by-user-id")
//    public ResponseEntity<ResponseDto<List<AccessService.AccessDetailDto>>> getAccessDetailsByUserId(@RequestParam @Valid @NotNull @Min(0) Integer userId) {
//        return ResponseEntity.ok(ResponseDto.<List<AccessService.AccessDetailDto>>builder()
//                .message("Success")
//                .desc("Access details fetched successfully")
//                .object(accessService.getAccessDetailsByUserId(userId))
//                .build());
//    }

    @GetMapping("/get-location-google-map-short-link")
    public ResponseEntity<ResponseDto<GoogleMapDetails>> getLocationGoogleMapShortLink(
            @RequestParam @Valid @NotNull @NotEmpty String shortLink) throws Exception {

        try (CloseableHttpClient httpClient = HttpClients.custom()
                .disableRedirectHandling() // we’ll handle manually
                .build()) {

            HttpGet request = new HttpGet(shortLink);
            try (CloseableHttpResponse response = httpClient.execute(request)) {
                String expandedUrl = response.getLastHeader("Location") != null
                        ? response.getLastHeader("Location").getValue()
                        : shortLink;

                if (shortLink.equals(expandedUrl)) {
                    throw new BusinessException("Failed to expand the short link", null);
                }

                String viewportLat = null, viewportLng = null, zoom = null;
                String markerLat = null, markerLng = null;

                Pattern atPattern = Pattern.compile("@([-0-9.]+),([-0-9.]+),([0-9]+)z");
                Matcher atMatcher = atPattern.matcher(expandedUrl);
                if (atMatcher.find()) {
                    viewportLat = atMatcher.group(1);
                    viewportLng = atMatcher.group(2);
                    zoom = atMatcher.group(3);
                }

                Pattern markerPattern = Pattern.compile("!3d([-0-9.]+)!4d([-0-9.]+)");
                Matcher markerMatcher = markerPattern.matcher(expandedUrl);
                if (markerMatcher.find()) {
                    markerLat = markerMatcher.group(1);
                    markerLng = markerMatcher.group(2);
                }

                GoogleMapDetails details = new GoogleMapDetails(
                        expandedUrl, viewportLat, viewportLng, zoom, markerLat, markerLng
                );


                return ResponseEntity.ok(ResponseDto.<GoogleMapDetails>builder()
                        .message("Success")
                        .desc("Google map short link fetched successfully")
                        .object(details)
                        .build());
            }
        }
    }

    public record GoogleMapDetails(String expandedUrl, String viewportLat, String viewportLng, String zoom,
                                   String markerLat, String markerLng) {
    }

}
