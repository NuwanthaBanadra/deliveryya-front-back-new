package com.kaleox.deliveryya.service.impl;

import com.kaleox.deliveryya.config.BusinessException;
import com.kaleox.deliveryya.dto.ResponseDto;
import com.kaleox.deliveryya.dto.customDto.CommonIdNameDto;
import com.kaleox.deliveryya.dto.paginatedDto.PaginatedApiDto;
import com.kaleox.deliveryya.dto.paginatedDto.PaginatedGrantedAccessesDto;
import com.kaleox.deliveryya.dto.paginatedDto.PaginatedGrantedUsersDto;
import com.kaleox.deliveryya.dto.user.*;
import com.kaleox.deliveryya.entities.*;
import com.kaleox.deliveryya.repo.*;
import com.kaleox.deliveryya.service.AccessService;
import com.kaleox.deliveryya.service.specification.AccessSpec;
import com.kaleox.deliveryya.service.specification.ApiSpec;
import com.kaleox.deliveryya.utill.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.checkerframework.checker.nullness.qual.MonotonicNonNull;
import org.modelmapper.ModelMapper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@Transactional
@RequiredArgsConstructor
public class AccessServiceImpl implements AccessService {


    private final AccessRepo accessRepo;
    private final ModelMapper modelMapper;
    private final UserRoleRepo userRoleRepo;
    private final AccessHasUserRoleRepo accessHasUserRoleRepo;
    private final UserRepo userRepo;
    private final UserHasAccessRepo userHasAccessRepo;
    private final JwtUtil jwtUtil;
    private final AccessHasApiRepo accessHasApiRepo;
    private final AccessLevelRepo accessLevelRepo;
    private final AccessTypeRepo accessTypeRepo;
    private final ApiRepo apiRepo;
    private final ApiFeatureRepo apiFeatureRepo;

    @Override
    public String grantAccessToUserRole(UpdateAccessDto dto) {
        UserRole userRole = userRoleRepo.findById(dto.getUserRoleId())
                .orElseThrow(() -> new BusinessException("User role not found", null));

        List<Access> accesses = resolveAccessTargets(dto.getAccessIds());

        if (Boolean.TRUE.equals(dto.getGrantAccess())) {
            for (Access access : accesses) {
                accessHasUserRoleRepo.findByAccessAndUserRoles(access, userRole)
                        .orElseGet(() -> accessHasUserRoleRepo.save(
                                AccessHasUserRole.builder().userRoles(userRole).access(access).build()));
            }
            return accesses.size() == accessRepo.count()
                    ? "All accesses granted to user role successfully"
                    : "Access granted to user role successfully";
        }

        for (Access access : accesses) {
            accessHasUserRoleRepo.findByAccessAndUserRoles(access, userRole)
                    .ifPresent(accessHasUserRoleRepo::delete);
        }

        return accesses.size() == accessRepo.count()
                ? "All accesses revoked from user role successfully"
                : "Access revoked from user role successfully";
    }

    @Override
    public ResponseDto<PaginatedGrantedAccessesDto> getAllAccesses(PaginatedGrantedAccessesDto dto) {
        Pageable pageable = PageRequest.of(dto.getPageNumber(), dto.getCountPerPage(), Sort.by("id").ascending());

        Specification<Access> spec = AccessSpec.getAccessSpecification(dto);

        Page<Access> accessPage = accessRepo.findAll(spec, pageable);

        dto.setTotalCount(accessPage.getTotalElements());
        dto.setTotalPages(accessPage.getTotalPages());
        dto.setCountPerPage(accessPage.getSize());

        List<AccessDto> accessDtoList = accessPage.getContent().stream()
                .map(this::toAccessDto)
                .toList();

        if (Boolean.TRUE.equals(dto.getIncludeLinkedApis())) {
            populateApis(accessDtoList);
        }

        if (Boolean.TRUE.equals(dto.getIncludeGrantMeta())) {
            populateGrantMeta(dto, accessDtoList);
        }

        dto.setItems(accessDtoList);

        return ResponseDto.<PaginatedGrantedAccessesDto>builder().message("Success").desc("Accesses fetched successfully").object(dto).build();
    }

    @Override
    public ResponseDto<PaginatedApiDto> getAllApis(PaginatedApiDto dto) {
        int pageNumber = dto.getPageNumber() == null || dto.getPageNumber() < 0 ? 0 : dto.getPageNumber();
        int countPerPage = dto.getCountPerPage() == null || dto.getCountPerPage() <= 0 ? 10 : dto.getCountPerPage();

        Pageable pageable = PageRequest.of(pageNumber, countPerPage, Sort.by("id").ascending());
        Specification<Api> spec = ApiSpec.getApiSpecification(dto);
        Page<Api> apiPage = apiRepo.findAll(spec, pageable);

        dto.setPageNumber(pageNumber);
        dto.setTotalCount(apiPage.getTotalElements());
        dto.setTotalPages(apiPage.getTotalPages());
        dto.setCountPerPage(apiPage.getSize());

        List<ApiDto> apiDtoList;
        if (dto.getAccessId() != null && dto.getAccessId() > 0) {
            List<Integer> apiIds = apiPage.getContent().stream().map(Api::getId).toList();
            Map<Integer, AccessHasApi> linkByApiId = new HashMap<>();

            if (!apiIds.isEmpty()) {
                accessHasApiRepo.findAllByAccess_IdAndApi_IdIn(dto.getAccessId(), apiIds)
                        .forEach(link -> linkByApiId.put(link.getApi().getId(), link));
            }

            apiDtoList = apiPage.getContent().stream()
                    .map(api -> {
                        AccessHasApi link = linkByApiId.get(api.getId());
                        return link != null ? toApiDto(link) : toApiDto(api);
                    })
                    .toList();
        } else {
            apiDtoList = apiPage.getContent().stream()
                    .map(this::toApiDto)
                    .toList();
        }

        dto.setItems(apiDtoList);

        return ResponseDto.<PaginatedApiDto>builder()
                .message("Success")
                .desc("Apis fetched successfully")
                .object(dto)
                .build();
    }

    @Override
    public ResponseDto<PaginatedGrantedUsersDto> getAllAccessGrantedUsers(PaginatedGrantedUsersDto dto) {
        int pageNumber = dto.getPageNumber() == null || dto.getPageNumber() < 0 ? 0 : dto.getPageNumber();
        int countPerPage = dto.getCountPerPage() == null || dto.getCountPerPage() <= 0 ? 10 : dto.getCountPerPage();

        if (Boolean.TRUE.equals(dto.getExpired()) && Boolean.TRUE.equals(dto.getNotExpired())) {
            throw new BusinessException("Expired and notExpired filters cannot be true at the same time", null);
        }

        // Do not provide a Sort on the pageable here. The repository JPQL already defines
        // `order by u.id asc`. Supplying a pageable Sort causes Spring Data to append
        // an ORDER BY on the query root (UserHasAccess) — e.g. `uha.id` — which is not
        // part of the DISTINCT user select list and leads to MySQL errors like:
        // "Expression #2 of ORDER BY clause is not in SELECT list; this is incompatible with DISTINCT".
        Pageable pageable = PageRequest.of(pageNumber, countPerPage);
        Page<User> userPage = userHasAccessRepo.findDistinctGrantedUsers(
                dto.getAccessId(),
                dto.getExpired(),
                dto.getNotExpired(),
                dto.getExpiredFrom(),
                dto.getExpiredAt(),
                pageable
        );

        dto.setPageNumber(pageNumber);
        dto.setTotalCount(userPage.getTotalElements());
        dto.setTotalPages(userPage.getTotalPages());
        dto.setCountPerPage(userPage.getSize());

        List<UserDto> userDtoList = userPage.getContent().stream()
                .map(user -> {
                    UserDto userDto = modelMapper.map(user, UserDto.class);
                    userDto.setPassword(null);
                    return userDto;
                })
                .toList();

        dto.setItems(userDtoList);

        return ResponseDto.<PaginatedGrantedUsersDto>builder()
                .message("Success")
                .desc("Granted users fetched successfully")
                .object(dto)
                .build();
    }

    @Override
    public List<AccessHasUserRoleDto> getGrantedAccesses(Integer userRoleId) {
        UserRole userRole = userRoleRepo.findById(userRoleId).orElseThrow(() -> new BusinessException("User role not found", null));

        List<AccessHasUserRoleDto> accessHasUserRoleList = new ArrayList<>();

        accessHasUserRoleRepo.findAllByUserRoles(userRole).forEach(a -> {
            AccessHasUserRoleDto accessHasUserRoleDto = AccessHasUserRoleDto.builder()
                    .id(a.getAccess().getId())
                    .name(a.getAccess().getName())
                    .desc(a.getAccess().getDesc())
                    .createdBy(a.getCreatedBy())
                    .createdAt(a.getCreatedAt())
                    .updatedAt(a.getUpdatedAt())
                    .updatedBy(a.getUpdatedBy())

                    .accessType(CommonIdNameDto.builder()
                            .id(a.getAccess().getAccessType().getId())
                            .name(a.getAccess().getAccessType().getName())
                            .build())
                    .accessLevel(CommonIdNameDto.builder()
                            .id(a.getAccess().getAccessLevel().getId())
                            .name(a.getAccess().getAccessLevel().getName())
                            .build()
                    )
                    .build();


            List<ApiDto> apiList = new ArrayList<>();

            accessHasApiRepo.findAllByAccess(a.getAccess()).forEach(a2 -> {
                apiList.add(toApiDto(a2));
            });

            accessHasUserRoleDto.setApis(apiList);
            accessHasUserRoleList.add(accessHasUserRoleDto);
        });


        return accessHasUserRoleList;
    }

    @Override
    public String grantAccessToUser(@MonotonicNonNull GrantAccessToUserDto dto) {
        User user = userRepo.findById(dto.getUsersId())
                .orElseThrow(() -> new BusinessException("User not found", null));

        List<Access> accesses = resolveAccessTargets(dto.getAccessIds());

        if (Boolean.TRUE.equals(dto.getGrantAccess())) {
            if (dto.getExp() == null) {
                throw new BusinessException("Expiration date is required when grantAccess is true", null);
            }
            if (!dto.getExp().isAfter(LocalDateTime.now())) {
                throw new BusinessException("Expiration date must be in the future", null);
            }

            for (Access access : accesses) {
                userHasAccessRepo.findByUsersAndAccess(user, access).ifPresentOrElse(existingLink -> {
                    existingLink.setExp(dto.getExp());
                    userHasAccessRepo.save(existingLink);
                }, () -> userHasAccessRepo.save(UserHasAccess.builder()
                        .users(user)
                        .access(access)
                        .exp(dto.getExp())
                        .build()));
            }

            return accesses.size() == accessRepo.count()
                    ? "All accesses granted to user successfully"
                    : "Access granted to user successfully";
        }

        for (Access access : accesses) {
            userHasAccessRepo.findByUsersAndAccess(user, access)
                    .ifPresent(userHasAccessRepo::delete);
        }

        return accesses.size() == accessRepo.count()
                ? "All accesses revoked from user successfully"
                : "Access revoked from user successfully";
    }

    @Override
    public List<UserHasAccessDto> getGrantedAccessesByUserId(Integer userId) {
        User user = userRepo.findById(userId).orElseThrow(() -> new BusinessException("User not found", null));

        List<UserHasAccessDto> accessHasUserRoleList = new ArrayList<>();

        userHasAccessRepo.findAllByUsers(user).forEach(a -> {
            UserHasAccessDto accessHasUserRoleDto = UserHasAccessDto.builder()
                    .id(a.getAccess().getId())
                    .name(a.getAccess().getName())
                    .desc(a.getAccess().getDesc())
                    .createdBy(a.getCreatedBy())
                    .createdAt(a.getCreatedAt())
                    .updatedAt(a.getUpdatedAt())
                    .updatedBy(a.getUpdatedBy())
                    .exp(a.getExp())
                    .accessType(CommonIdNameDto.builder()
                            .id(a.getAccess().getAccessType().getId())
                            .name(a.getAccess().getAccessType().getName())
                            .build())
                    .accessLevel(CommonIdNameDto.builder()
                            .id(a.getAccess().getAccessLevel().getId())
                            .name(a.getAccess().getAccessLevel().getName())
                            .build()
                    )
                    .build();


            List<ApiDto> apiList = new ArrayList<>();

            accessHasApiRepo.findAllByAccess(a.getAccess()).forEach(a2 -> {
                apiList.add(toApiDto(a2));
            });

            accessHasUserRoleDto.setApis(apiList);
            accessHasUserRoleList.add(accessHasUserRoleDto);
        });


        return accessHasUserRoleList;
    }

    @Override
    public Integer createAccess(CreateAccessRequestDto dto) {
        AccessLevel accessLevel = accessLevelRepo.findById(dto.getAccessLevelId())
                .orElseThrow(() -> new BusinessException("Access level not found", null));
        AccessType accessType = accessTypeRepo.findById(dto.getAccessTypeId())
                .orElseThrow(() -> new BusinessException("Access type not found", null));

        Access access = accessRepo.save(Access.builder()
                .name(dto.getName().trim())
                .desc(dto.getDesc().trim())
                .accessLevel(accessLevel)
                .accessType(accessType)
                .build());

        return access.getId();
    }

    @Override
    public String setAccess(SetAccessRequestDto dto) {
        Access access = accessRepo.findById(dto.getAccessId())
                .orElseThrow(() -> new BusinessException("Access not found", null));

        AccessLevel accessLevel = accessLevelRepo.findById(dto.getAccessLevelId())
                .orElseThrow(() -> new BusinessException("Access level not found", null));
        AccessType accessType = accessTypeRepo.findById(dto.getAccessTypeId())
                .orElseThrow(() -> new BusinessException("Access type not found", null));

        access.setName(dto.getName().trim());
        access.setDesc(dto.getDesc().trim());
        access.setAccessLevel(accessLevel);
        access.setAccessType(accessType);

        accessRepo.save(access);
        return "Access updated successfully";
    }

    @Override
    public String linkAccessWithApi(LinkAccessWithApiRequestDto dto) {
        Access access = accessRepo.findById(dto.getAccessId())
                .orElseThrow(() -> new BusinessException("Access not found", null));
        Api api = apiRepo.findById(dto.getApiId())
                .orElseThrow(() -> new BusinessException("Api not found", null));
        List<AccessHasApi> existingLinks = accessHasApiRepo.findAllByAccessAndApi(access, api);

        if (!dto.getGrant()) {
            if (!existingLinks.isEmpty()) {
                accessHasApiRepo.deleteAll(existingLinks);
                return "Access unlinked from api successfully";
            }
            return "Access unlinked from api successfully";
        }

        List<Integer> featureIds = normalizeFeatureIds(dto.getApiFeatureIds());
        validateApiFeaturesForApi(api, featureIds);

        AccessHasApi linkToPersist;
        if (existingLinks.isEmpty()) {
            linkToPersist = AccessHasApi.builder()
                    .access(access)
                    .api(api)
                    .build();
        } else {
            linkToPersist = existingLinks.get(0);
            if (existingLinks.size() > 1) {
                accessHasApiRepo.deleteAll(existingLinks.subList(1, existingLinks.size()));
            }
        }

        linkToPersist.setApiFeaturesIds(featureIds);
        accessHasApiRepo.save(linkToPersist);

        return "Access linked with api successfully";
    }

    @Override
    public String removeApiFeaturesForApi(RemoveApiFeaturesForApiRequestDto dto) {
        Access access = accessRepo.findById(dto.getAccessId())
                .orElseThrow(() -> new BusinessException("Access not found", null));
        Api api = apiRepo.findById(dto.getApiId())
                .orElseThrow(() -> new BusinessException("Api not found", null));

        AccessHasApi accessHasApi = getAccessHasApiLink(access, api);

        List<Integer> featureIdsToRemove = normalizeFeatureIds(dto.getApiFeatureIds());
        if (featureIdsToRemove.isEmpty()) {
            throw new BusinessException("Api feature ids are required", null);
        }
        validateApiFeaturesForApi(api, featureIdsToRemove);

        Set<Integer> currentFeatureIds = new LinkedHashSet<>(normalizeFeatureIds(accessHasApi.getApiFeaturesIds()));
        if (!currentFeatureIds.containsAll(featureIdsToRemove)) {
            throw new BusinessException("One or more api features are not linked with the selected api", null);
        }

        Set<Integer> remainingFeatureIds = new LinkedHashSet<>(currentFeatureIds);
        remainingFeatureIds.removeAll(new HashSet<>(featureIdsToRemove));

        accessHasApi.setApiFeaturesIds(new ArrayList<>(remainingFeatureIds));
        accessHasApiRepo.save(accessHasApi);

        return "Api features removed successfully";
    }

    @Override
    public String setApiFeaturesForApi(SetApiFeaturesForApiRequestDto dto) {
        Access access = accessRepo.findById(dto.getAccessId())
                .orElseThrow(() -> new BusinessException("Access not found", null));
        Api api = apiRepo.findById(dto.getApiId())
                .orElseThrow(() -> new BusinessException("Api not found", null));

        AccessHasApi accessHasApi = getAccessHasApiLink(access, api);

        List<Integer> featureIds = normalizeFeatureIds(dto.getApiFeatureIds());
        validateApiFeaturesForApi(api, featureIds);

        accessHasApi.setApiFeaturesIds(featureIds);
        accessHasApiRepo.save(accessHasApi);

        return "Api features updated successfully";
    }

    @Override
    public List<CommonIdNameDto> getAccessTypes(Integer accessTypeId) {
        if (accessTypeId != null && accessTypeId > 0) {
            AccessType at = accessTypeRepo.findById(accessTypeId).orElseThrow(() -> new BusinessException("Access type not found", null));
            return List.of(CommonIdNameDto.builder().id(at.getId()).name(at.getName()).build());
        }

        return accessTypeRepo.findAll().stream()
                .map(at -> CommonIdNameDto.builder().id(at.getId()).name(at.getName()).build())
                .toList();
    }

    @Override
    public List<ApiFeatureDto> getApiFeatures(Integer apiFeatureId, Integer apiId) {
        if (apiFeatureId != null && apiFeatureId > 0) {
            ApiFeature f = apiFeatureRepo.findById(apiFeatureId).orElseThrow(() -> new BusinessException("Api feature not found", null));
            return List.of(ApiFeatureDto.builder()
                    .id(f.getId())
                    .name(f.getName())
                    .desc(f.getDesc())
                    .apiId(f.getApi().getId())
                    .build());
        }

        if (apiId != null && apiId > 0) {
            Api api = apiRepo.findById(apiId).orElseThrow(() -> new BusinessException("Api not found", null));
            return apiFeatureRepo.findAllByApi(api).stream()
                    .map(f -> ApiFeatureDto.builder()
                            .id(f.getId())
                            .name(f.getName())
                            .desc(f.getDesc())
                            .apiId(f.getApi().getId())
                            .build())
                    .toList();
        }

        return apiFeatureRepo.findAll().stream()
                .map(f -> ApiFeatureDto.builder()
                        .id(f.getId()).name(f.getName())
                        .desc(f.getDesc())
                        .apiId(f.getApi().getId())
                        .build())
                .toList();
    }

    public String getAccessDetails() {


        List<UserRole> allUserRoles = userRoleRepo.findAll();
        Map<String, Object> accessDetails = new HashMap<>();

        for (UserRole userRole : allUserRoles) {
            List<AccessHasUserRole> allAccesses = accessHasUserRoleRepo.findAllByUserRoles(userRole);

            int[] accessIds = allAccesses.stream().map(ahur -> ahur.getAccess().getId()).mapToInt(Integer::intValue).toArray();

            accessDetails.put(userRole.getId().toString(), Map.of("id", userRole.getId(), "accessIds", accessIds));
        }


        return jwtUtil.generateAccessDetail(accessDetails);
    }

    public List<UserDto> getAllAccessGrantedUsers() {
        List<UserHasAccess> userHasAccessList = userHasAccessRepo.findAll();

        return userHasAccessList.stream().map(uha -> modelMapper.map(uha.getUsers(), UserDto.class)).distinct().toList();
    }

    public List<AccessDetailDto> getAccessDetailsByUserId(Integer userId) {
        // Local record declaration inside the method

        List<UserHasAccess> userHasAccessList = userHasAccessRepo.findByUsers_id(userId);

        if (userHasAccessList.isEmpty()) {
            throw new BusinessException("No access found for this user", null);
        }

        return userHasAccessList.stream().map(uha -> new AccessDetailDto(uha.getAccess().getId(), uha.getAccess().getName(), uha.getAccess().getDesc(), uha.getExp(), uha.getCreatedAt(), uha.getUpdatedAt(), uha.getCreatedBy(), uha.getCreatedBy())).toList();
    }

    private AccessDto toAccessDto(Access access) {
        return AccessDto.builder()
                .id(access.getId())
                .name(access.getName())
                .desc(access.getDesc())
                .accessLevel(CommonIdNameDto.builder()
                        .id(access.getAccessLevel().getId())
                        .name(access.getAccessLevel().getName())
                        .build())
                .accessType(CommonIdNameDto.builder()
                        .id(access.getAccessType().getId())
                        .name(access.getAccessType().getName())
                        .build())
                .build();
    }

    private ApiDto toApiDto(Api api) {
        List<ApiFeature> features = apiFeatureRepo.findAllByApi(api);

        return ApiDto.builder()
                .id(api.getId())
                .name(api.getName())
                .desc(api.getDesc())
                .apiMethod(CommonIdNameDto.builder()
                        .id(api.getApiMethod().getId())
                        .name(api.getApiMethod().getName())
                        .build())
                .apiFeatures(features.stream().map(feature -> CommonIdNameDto.builder()
                        .id(feature.getId())
                        .name(feature.getName())
                        .build()).toList())
                .build();
    }

    private ApiDto toApiDto(AccessHasApi link) {
        return ApiDto.builder()
                .id(link.getApi().getId())
                .name(link.getApi().getName())
                .desc(link.getApi().getDesc())
                .apiMethod(CommonIdNameDto.builder()
                        .id(link.getApi().getApiMethod().getId())
                        .name(link.getApi().getApiMethod().getName())
                        .build())

                .apiFeatures(buildApiFeatureDtos(link.getApi(), link.getApiFeaturesIds()))
                .build();
    }

    private List<Integer> normalizeFeatureIds(List<Integer> featureIds) {
        if (featureIds == null) {
            return Collections.emptyList();
        }

        return featureIds.stream()
                .filter(Objects::nonNull)
                .distinct()
                .toList();
    }

    private List<Integer> normalizeAccessIds(Integer[] accessIds) {
        if (accessIds == null) {
            return Collections.emptyList();
        }

        return Arrays.stream(accessIds)
                .filter(Objects::nonNull)
                .distinct()
                .toList();
    }

    private List<Access> resolveAccessTargets(Integer[] accessIds) {
        List<Integer> normalizedAccessIds = normalizeAccessIds(accessIds);
        if (normalizedAccessIds.isEmpty()) {
            return accessRepo.findAll(Sort.by("id").ascending());
        }

        List<Access> accesses = accessRepo.findAllById(normalizedAccessIds);
        if (accesses.size() != normalizedAccessIds.size()) {
            throw new BusinessException("One or more accesses were not found", null);
        }

        return accesses;
    }

    private List<CommonIdNameDto> buildApiFeatureDtos(Api api, List<Integer> featureIds) {
        if (featureIds == null) {
            return null;
        }

        List<Integer> normalizedIds = normalizeFeatureIds(featureIds);
        if (normalizedIds.isEmpty()) {
            return Collections.emptyList();
        }

        Map<Integer, ApiFeature> featureMap = apiFeatureRepo.findAllByApi(api).stream()
                .collect(java.util.stream.Collectors.toMap(ApiFeature::getId, feature -> feature));

        return normalizedIds.stream()
                .map(featureMap::get)
                .filter(Objects::nonNull)
                .map(feature -> CommonIdNameDto.builder()
                        .id(feature.getId())
                        .name(feature.getName())
                        .build())
                .toList();
    }

    private void validateApiFeaturesForApi(Api api, List<Integer> featureIds) {
        List<Integer> normalizedIds = normalizeFeatureIds(featureIds);
        if (normalizedIds.isEmpty()) {
            return;
        }

        List<ApiFeature> features = apiFeatureRepo.findAllById(normalizedIds);
        if (features.size() != normalizedIds.size()) {
            throw new BusinessException("One or more api features were not found", null);
        }

        boolean hasForeignFeature = features.stream().anyMatch(feature -> !feature.getApi().getId().equals(api.getId()));
        if (hasForeignFeature) {
            throw new BusinessException("One or more api features do not belong to the selected api", null);
        }
    }

    private AccessHasApi getAccessHasApiLink(Access access, Api api) {
        List<AccessHasApi> links = accessHasApiRepo.findAllByAccessAndApi(access, api);
        if (links.isEmpty()) {
            throw new BusinessException("Access is not linked with api", null);
        }

        AccessHasApi canonical = links.get(0);
        if (links.size() > 1) {
            accessHasApiRepo.deleteAll(links.subList(1, links.size()));
        }

        return canonical;
    }

    private void populateApis(List<AccessDto> accessDtoList) {
        if (accessDtoList.isEmpty()) {
            return;
        }

        List<Integer> accessIds = accessDtoList.stream().map(AccessDto::getId).toList();
        Map<Integer, List<ApiDto>> apiMapByAccessId = new HashMap<>();

        accessHasApiRepo.findAllByAccess_IdIn(accessIds).forEach(link -> {
            apiMapByAccessId.computeIfAbsent(link.getAccess().getId(), key -> new ArrayList<>()).add(toApiDto(link));
        });

        accessDtoList.forEach(accessDto -> accessDto.setApis(apiMapByAccessId.getOrDefault(accessDto.getId(), Collections.emptyList())));
    }

    private void populateGrantMeta(PaginatedGrantedAccessesDto dto, List<AccessDto> accessDtoList) {
        if (accessDtoList.isEmpty()) {
            return;
        }

        if (dto.getUserId() != null && dto.getUserId() != 0) {
            User user = userRepo.findById(dto.getUserId()).orElseThrow(() -> new BusinessException("User not found", null));
            Map<Integer, UserHasAccess> mapByAccessId = new HashMap<>();
            userHasAccessRepo.findAllByUsers(user).forEach(link -> mapByAccessId.put(link.getAccess().getId(), link));

            accessDtoList.forEach(accessDto -> {
                UserHasAccess userHasAccess = mapByAccessId.get(accessDto.getId());
                if (userHasAccess != null) {
                    accessDto.setCreatedAt(userHasAccess.getCreatedAt());
                    accessDto.setUpdatedAt(userHasAccess.getUpdatedAt());
                    accessDto.setCreatedBy(userHasAccess.getCreatedBy());
                    accessDto.setUpdatedBy(userHasAccess.getUpdatedBy());
                    accessDto.setExp(userHasAccess.getExp());
                }
            });
        }

        if (dto.getUserRoleId() != null && dto.getUserRoleId() != 0) {
            UserRole userRole = userRoleRepo.findById(dto.getUserRoleId()).orElseThrow(() -> new BusinessException("User role not found", null));
            Map<Integer, AccessHasUserRole> mapByAccessId = new HashMap<>();
            accessHasUserRoleRepo.findAllByUserRoles(userRole).forEach(link -> mapByAccessId.put(link.getAccess().getId(), link));

            accessDtoList.forEach(accessDto -> {
                AccessHasUserRole link = mapByAccessId.get(accessDto.getId());
                if (link != null && accessDto.getCreatedAt() == null) {
                    accessDto.setCreatedAt(link.getCreatedAt());
                    accessDto.setUpdatedAt(link.getUpdatedAt());
                    accessDto.setCreatedBy(link.getCreatedBy());
                    accessDto.setUpdatedBy(link.getUpdatedBy());
                }
            });
        }
    }

    @Override
    public Set<Integer> getAccessDetailsByUser(Integer userId) {
        User user = userRepo.findById(userId).orElseThrow(() -> new BusinessException("User not found", null));

        Set<Integer> accessIds = new HashSet<>();

        // Get all user's direct accesses
        List<UserHasAccess> userAccesses = userHasAccessRepo.findAllByUsers(user);
        LocalDateTime now = LocalDateTime.now();
        List<Integer> expiredIds = new ArrayList<>();

        userAccesses.forEach(uha -> {
            if (uha.getExp() != null && uha.getExp().isBefore(now)) {
                expiredIds.add(uha.getId());
            } else {
                accessIds.add(uha.getAccess().getId());
            }
        });

        // Delete expired accesses
        if (!expiredIds.isEmpty()) {
            userHasAccessRepo.deleteAllById(expiredIds);
        }

        // Get accesses from user's assigned role
        if (user.getUserRole() != null) {
            List<AccessHasUserRole> roleAccesses = accessHasUserRoleRepo.findAllByUserRoles(user.getUserRole());
            roleAccesses.forEach(roleAccess -> accessIds.add(roleAccess.getAccess().getId()));
        }

        return accessIds;
    }

    @Override
    public Set<Integer> getFullAccessDetailsByUser(List<Integer> accessIds) {
        if (accessIds == null || accessIds.isEmpty()) {
            return Collections.emptySet();
        }

        return accessHasApiRepo.findAllByAccess_IdIn(accessIds).stream()
                .map(link -> link.getApi().getId())
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
    }


    public record AccessDetailDto(Integer id, String name, String desc, LocalDateTime exp, LocalDateTime grantedAt,
                                  LocalDateTime updatedAt, String grantedBy, String updatedBy) {
    }
}
