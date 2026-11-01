package com.kaleox.deliveryya.service.impl;

import com.kaleox.deliveryya.config.BusinessException;
import com.kaleox.deliveryya.dto.*;
import com.kaleox.deliveryya.dto.customDto.CommonIdNameDto;
import com.kaleox.deliveryya.dto.paginatedDto.PaginatedCityDto;
import com.kaleox.deliveryya.dto.paginatedDto.PaginatedUserDto;
import com.kaleox.deliveryya.dto.paginatedDto.PaginatedUserRequestDto;
import com.kaleox.deliveryya.dto.user.*;
import com.kaleox.deliveryya.entities.*;
import com.kaleox.deliveryya.repo.*;
import com.kaleox.deliveryya.service.EmailService;
import com.kaleox.deliveryya.service.SmsService;
import com.kaleox.deliveryya.service.UserService;
import com.kaleox.deliveryya.service.specification.CitySpec;
import com.kaleox.deliveryya.service.specification.UserRequestSpec;
import com.kaleox.deliveryya.service.specification.UserSpec;
import com.kaleox.deliveryya.utill.FileStorageUtil;
import com.kaleox.deliveryya.utill.JwtUtil;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jws;
import io.jsonwebtoken.JwtException;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.checkerframework.checker.nullness.qual.MonotonicNonNull;
import org.modelmapper.ModelMapper;
import org.modelmapper.TypeToken;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.LocalDateTime;
import java.util.*;

@Service
@Transactional
@RequiredArgsConstructor
@Slf4j
public class UserServiceImpl implements UserService {

    private final AccessTokenRepo accessTokenRepo;
    private final UserRepo userRepo;
    private final VerificationStatusRepo verificationStatusRepo;
    private final ModelMapper modelMapper;
    private final PasswordEncoder passwordEncoder;
    private final UserRoleRepo userRoleRepo;
    private final DistrictRepo districtRepo;
    private final CityRepo cityRepo;
    private final DeliveryDetailRepo deliveryDetailRepo;
    private final VerificationDataRepo verificationDataRepo;
    private final UserRequestRepo userRequestRepo;
    private final UserRequestTypeRepo userRequestTypeRepo;
    private final UserHasAccessRepo userHasAccessRepo;
    private final EmployeeRepo employeeRepo;
    private final GenderRepo genderRepo;
    private final EmailService emailService;
    private final FileStorageUtil fileStorageUtil;
    private final DocTypeRepo docTypeRepo;
    private final UserDataRepo userDataRepo;
    private final SmsService smsService;
    private final MarketRepo marketRepo;
    private final MarketOrderRepo marketOrderRepo;
    private final NotificationRepo notificationRepo;
    private final FeedbackRepo feedbackRepo;

    @Value("${app.cors.origin}")
    private String origin;

    @Override
    public ResponseDto<Void> setUser(UserDto dto) {
        Map<String, String> err = new HashMap<>();

        if (userRepo.findUserByEmail(dto.getEmail()).isPresent()) {
            err.put("email", "User already exists with this email");
        }
        if (userRepo.findUserByNic(dto.getNic()).isPresent()) {
            err.put("nic", "User already exists with this nic");
        }

        if (!err.isEmpty()) {
            throw new BusinessException("User Already Exists", err);
        }

        User user = modelMapper.map(dto, User.class);
        user.setPassword(passwordEncoder.encode(dto.getPassword()));
        user.setVerificationStatus(verificationStatusRepo.findById(4).orElseThrow(() -> new BusinessException("It's not you it's Us", Map.of("error", "Default verification status not found"))));

        user.setUserRole(userRoleRepo.findByName("customer").orElseGet(() -> userRoleRepo.save(UserRole.builder().name("customer").build())));

        user.setEmailVerified(false);
        user.setIsEmployee(false);
        user.setIsActive(true);
        user.setHasMarket(false);
        user.setIsDeleted(false);

        User savedUser = userRepo.save(user);

        int[] accessIds = userHasAccessRepo.findByUsers_id(savedUser.getId()).stream()
                .filter(uha -> uha.getExp().isAfter(LocalDateTime.now()))
                .map(uha -> uha.getAccess().getId())
                .mapToInt(Integer::intValue).toArray();

        String token = JwtUtil.createAccessToken(savedUser, accessIds);

        return ResponseDto.<Void>builder().status(200).message("User Registered Successfully").desc(token).build();
    }

    @Override
    public ResponseDto<Void> login(UserDto userDto) {

        User user = userRepo.findUserByEmail(userDto.getEmail()).orElseThrow(() -> new BusinessException("User does not exist with this email", null));

        if (Boolean.TRUE.equals(user.getIsDeleted())) {
            throw new BusinessException("User account is deleted", null);
        }

        if (!passwordEncoder.matches(userDto.getPassword(), user.getPassword())) {
            throw new BusinessException("Entered password is invalid", null);
        }
        int[] accessIds = userHasAccessRepo.findByUsers_id(user.getId()).stream()
                .map(uha -> uha.getAccess().getId())
                .mapToInt(Integer::intValue).toArray();


        return ResponseDto.<Void>builder().status(200).message("Success").desc("User login successful").exData(Map.of("token", JwtUtil.createAccessToken(user, accessIds))).build();

    }

    @Override
    public ResponseDto update(UserDto userDto) {
        Map<String, String> err = new HashMap<>();

        User existing = userRepo.findById(userDto.getId()).orElseThrow(() -> new BusinessException("User not found", null));

        if (userDto.getEmail() != null && !userDto.getEmail().equals(existing.getEmail())) {
            userRepo.findUserByEmail(userDto.getEmail()).ifPresent(u -> {
                if (!u.getId().equals(existing.getId())) {
                    err.put("email", "User already exists with this email");
                }
            });
        }

        if (userDto.getNic() != null && !userDto.getNic().equals(existing.getNic())) {
            userRepo.findUserByNic(userDto.getNic()).ifPresent(u -> {
                if (!u.getId().equals(existing.getId())) {
                    err.put("nic", "User already exists with this nic");
                }
            });
        }

        if (!err.isEmpty()) {
            throw new BusinessException("User Already Exists", err);
        }

        String existingProfileImg = normalizeFileReference(existing.getProfileImg());
        String incomingProfileImg = normalizeFileReference(userDto.getProfileImg());
        String incomingProfileImgValue = userDto.getProfileImg() == null ? null : userDto.getProfileImg().trim();
        if (incomingProfileImgValue != null && incomingProfileImgValue.isEmpty()) {
            incomingProfileImgValue = null;
        }
        boolean profileImageChanged = userDto.getProfileImg() != null
                && !Objects.equals(incomingProfileImg, existingProfileImg);

        if (profileImageChanged) {
            if (existingProfileImg != null) {
                scheduleFileDeletion(existing.getProfileImg());
            }

            // Validate and move new profile image
            if (incomingProfileImgValue != null && !incomingProfileImgValue.isEmpty()) {
                String filename = incomingProfileImgValue.substring(incomingProfileImgValue.lastIndexOf("/") + 1);
                if (!fileStorageUtil.isImageFile(filename)) {
                    throw new BusinessException("Only image files are allowed for profile pictures", Map.of("profileImg", "Only image files (jpg, jpeg, png, gif, webp) are allowed"));
                }

                String movedImageUrl = fileStorageUtil.moveFile(incomingProfileImgValue, "users");
                if (movedImageUrl == null) {
                    throw new BusinessException("Failed to process profile image", Map.of("profileImg", "Could not process the profile image"));
                }
                incomingProfileImgValue = movedImageUrl;
            }

            existing.setProfileImg(incomingProfileImgValue);
        }

        existing.setFirstName(userDto.getFirstName());
        existing.setLastName(userDto.getLastName());
        existing.setDob(userDto.getDob());
        existing.setNic(userDto.getNic());
        existing.setEmail(userDto.getEmail());

        if (userDto.getGender() != null) {
            existing.setGender(modelMapper.map(userDto.getGender(), Gender.class));
        }

        userRepo.save(existing);

        return ResponseDto.builder().status(200).message("User Updated Successfully").build();
    }

    @Override
    public UserDto getUserById(Integer id) {
        User user = userRepo.findById(id).orElseThrow(() -> new BusinessException("User not found", null));

        if (Boolean.TRUE.equals(user.getIsDeleted())) {
            throw new BusinessException("User not found", null);
        }

        UserDto userDto = modelMapper.map(user, UserDto.class);
        userDto.setPassword("");

        return userDto;

    }

    @Override
    public ResponseDto getPaginatedCities(PaginatedCityDto paginatedCityDto) {
        Pageable pageable = PageRequest.of(
                paginatedCityDto.getPageNumber(),
                paginatedCityDto.getCountPerPage(),
                Sort.by("id").ascending()
        );

        Specification<City> spec = CitySpec.getCitySpecification(paginatedCityDto);

        Page<City> cities = cityRepo.findAll(spec, pageable);

        paginatedCityDto.setTotalCount(cities.getTotalElements());
        paginatedCityDto.setTotalPages(cities.getTotalPages());
        paginatedCityDto.setCountPerPage(cities.getSize());

        List<CityDto> cityDtoList = cities.getContent().stream().map(city -> modelMapper.map(city, CityDto.class)).toList();

        paginatedCityDto.setItems(cityDtoList);

        return ResponseDto.builder()
                .status(200)
                .message("Success")
                .desc("Cities fetched successfully.")
                .object(paginatedCityDto)
                .build();
    }

    @Override
    public ResponseDto<List<DistrictDto>> getAllDistricts() {
        List<DistrictDto> districtDtos = districtRepo.findAll(Sort.by(Sort.Direction.ASC, "id"))
                .stream()
                .map(district -> modelMapper.map(district, DistrictDto.class))
                .toList();

        return ResponseDto.<List<DistrictDto>>builder()
                .status(200)
                .message("Success")
                .desc("Districts fetched successfully")
                .object(districtDtos)
                .build();
    }


    @Override
    public PaginatedUserDto getPaginatedUsers(PaginatedUserDto paginatedUserDto) {
        Pageable pageable = PageRequest.of(
                paginatedUserDto.getPageNumber(),
                paginatedUserDto.getCountPerPage(),
                Sort.by("id").descending()
        );

        Specification<User> spec = UserSpec.getUserSpecification(paginatedUserDto);
        spec = spec.and((root, query, cb) -> cb.isFalse(root.get("isDeleted")));

        Page<User> users = userRepo.findAll(spec, pageable);

        paginatedUserDto.setTotalCount(users.getTotalElements());
        paginatedUserDto.setTotalPages(users.getTotalPages());
        paginatedUserDto.setCountPerPage(users.getSize());

        List<UserDto> userDtoList = users.getContent().stream().map(user -> {
            UserDto userDto = modelMapper.map(user, UserDto.class);
            // Clear sensitive data
            userDto.setPassword(null);
            return userDto;
        }).toList();

        paginatedUserDto.setItems(userDtoList);

        return paginatedUserDto;
    }

    @Override
    public ResponseDto getUserRoles(Integer userRoleId) {
        if (userRoleId != null) {
            // Return specific user role by ID
            UserRole userRole = userRoleRepo.findById(userRoleId)
                    .orElseThrow(() -> new BusinessException("User role not found with id: " + userRoleId, null));

            UserRoleDto userRoleDto = modelMapper.map(userRole, UserRoleDto.class);

            return ResponseDto.builder()
                    .status(200)
                    .message("Success")
                    .desc("User role fetched successfully")
                    .object(userRoleDto)
                    .build();
        } else {
            // Return all user roles
            List<UserRole> userRoles = userRoleRepo.findAll();

            List<UserRoleDto> userRoleDtos = modelMapper.map(userRoles, new TypeToken<List<UserRoleDto>>() {
            }.getType());

            return ResponseDto.builder()
                    .status(200)
                    .message("Success")
                    .desc("User roles fetched successfully")
                    .object(userRoleDtos)
                    .build();
        }
    }

    @Override
    public List<DeliveryDetailDto> getAddressByIdOrUserId(int addressId, Boolean defaultAddress, int userId) {

        if (addressId != 0) {
            DeliveryDetail deliveryDetail = deliveryDetailRepo.findById(addressId).orElseThrow(() -> new BusinessException("Address not found with id: " + addressId, null));

            return Collections.singletonList(
                    DeliveryDetailDto.builder()
                            .id(deliveryDetail.getId())
                            .address(deliveryDetail.getAddress())
                            .tag(deliveryDetail.getTag())
                            .permanent(deliveryDetail.getPermanent())
                            .location(deliveryDetail.getLocation())
                            .primaryMobile(deliveryDetail.getPrimaryMobile())
                            .secondaryMobile(deliveryDetail.getSecondaryMobile())
                            .whatsapp(deliveryDetail.getWhatsapp())
                            .cities(modelMapper.map(deliveryDetail.getCities(), CityDto.class))
                            .build()
            );
        }

        List<DeliveryDetail> deliveryDetails;
        if (defaultAddress != null) {
            deliveryDetails = deliveryDetailRepo.findDeliveryDetailByUsers_IdAndPermanent(userId, defaultAddress);
        } else {
            deliveryDetails = deliveryDetailRepo.findDeliveryDetailByUsers_Id(userId);
        }

        return deliveryDetails.stream()
                .map(detail -> DeliveryDetailDto.builder()
                        .id(detail.getId())
                        .address(detail.getAddress())
                        .tag(detail.getTag())
                        .permanent(detail.getPermanent())
                        .location(detail.getLocation())
                        .primaryMobile(detail.getPrimaryMobile())
                        .secondaryMobile(detail.getSecondaryMobile())
                        .whatsapp(detail.getWhatsapp())
                        .cities(modelMapper.map(detail.getCities(), CityDto.class))
                        .build()
                )
                .toList();

    }

    @Override
    public ResponseDto<DeliveryDetailDto> addAddress(DeliveryDetailsDto dto, Integer userId) {
        User user = userRepo.findById(userId)
                .orElseThrow(() -> new BusinessException("User not found", null));

        Integer cityId = dto.getCities() != null ? dto.getCities().getId() : null;
        if (cityId == null || cityId == 0) {
            throw new BusinessException("City id is required", Map.of("cities.id", "City id is required"));
        }

        City city = cityRepo.findById(cityId)
                .orElseThrow(() -> new BusinessException("City not found with id: " + cityId, null));

        DeliveryDetail deliveryDetail;
        boolean isUpdate = dto.getId() != null && dto.getId() != 0;
        boolean isFirstAddress = !isUpdate && deliveryDetailRepo.countByUsers_Id(userId) == 0;

        if (isUpdate) {
            deliveryDetail = deliveryDetailRepo.findByIdAndUsers_Id(dto.getId(), userId)
                    .orElseThrow(() -> new BusinessException("Address not found with id: " + dto.getId(), null));
        } else {
            deliveryDetail = new DeliveryDetail();
            deliveryDetail.setUsers(user);
        }

        deliveryDetail.setAddress(dto.getAddress());
        deliveryDetail.setTag(dto.getTag());
        deliveryDetail.setPermanent(isFirstAddress || (dto.getPermanent() != null ? dto.getPermanent() : false));
        deliveryDetail.setLocation(dto.getLocation());
        deliveryDetail.setPrimaryMobile(dto.getPrimaryMobile());
        deliveryDetail.setSecondaryMobile(dto.getSecondaryMobile());
        deliveryDetail.setWhatsapp(dto.getWhatsapp());
        deliveryDetail.setCities(city);

        DeliveryDetail saved = deliveryDetailRepo.save(deliveryDetail);

        DeliveryDetailDto responseDto = DeliveryDetailDto.builder()
                .id(saved.getId())
                .address(saved.getAddress())
                .tag(saved.getTag())
                .permanent(saved.getPermanent())
                .location(saved.getLocation())
                .primaryMobile(saved.getPrimaryMobile())
                .secondaryMobile(saved.getSecondaryMobile())
                .whatsapp(saved.getWhatsapp())
                .users(UserDto.builder().id(saved.getUsers().getId()).build())
                .cities(modelMapper.map(saved.getCities(), CityDto.class))
                .build();

        return ResponseDto.<DeliveryDetailDto>builder()
                .status(200)
                .message("Success")
                .desc(isUpdate ? "Address updated successfully" : "Address added successfully")
                .object(responseDto)
                .build();
    }

    @Override
    public String saveUserToken(SetUserTokenDto dto, int i) {
        User user = userRepo.findById(i).orElseThrow(() -> new BusinessException("User not found", null));

        String normalizedDeviceId = normalizeDeviceId(dto.getDeviceId());
        Integer tokenTypeId = dto.getTokenType().getId();

        List<AccessToken> matchingTokens = normalizedDeviceId == null
                ? accessTokenRepo.findAllByUsersAndTokenType_IdAndDeviceIdIsNull(user, tokenTypeId)
                : accessTokenRepo.findAllByUsersAndTokenType_IdAndDeviceId(user, tokenTypeId, normalizedDeviceId);

        AccessToken accessToken;
        if (matchingTokens.isEmpty()) {
            accessToken = AccessToken.builder()
                    .users(user)
                    .tokenType(TokenType.builder().id(tokenTypeId).build())
                    .build();
        } else {
            accessToken = matchingTokens.get(0);
            if (matchingTokens.size() > 1) {
                accessTokenRepo.deleteAllInBatch(matchingTokens.subList(1, matchingTokens.size()));
            }
        }

        accessToken.setToken(dto.getToken());
        accessToken.setDeviceId(normalizedDeviceId);
        accessToken.setExpAt(dto.getExpAt());
        accessTokenRepo.save(accessToken);


        return "Token saved successfully";
    }

    @Override
    public List<CommonIdNameDto> getVerificationStatuses(Integer id) {
        if (id != null && id != 0) {
            VerificationStatus verificationStatus = verificationStatusRepo.findById(id).orElseThrow(() -> new BusinessException("Verification status not found with id: " + id, null));

            CommonIdNameDto dto = modelMapper.map(verificationStatus, CommonIdNameDto.class);

            return Collections.singletonList(dto);
        } else {
            List<VerificationStatus> verificationStatuses = verificationStatusRepo.findAll();

            return verificationStatuses.stream()
                    .map(status -> modelMapper.map(status, CommonIdNameDto.class))
                    .toList();
        }
    }

    @Override
    public List<CommonIdNameDto> getGenders(Integer id) {
        if (id != null && id != 0) {
            Gender gender = genderRepo.findById(id).orElseThrow(() -> new BusinessException("Verification status not found with id: " + id, null));

            CommonIdNameDto dto = modelMapper.map(gender, CommonIdNameDto.class);

            return Collections.singletonList(dto);
        } else {
            List<Gender> genders = genderRepo.findAll();

            return genders.stream()
                    .map(status -> modelMapper.map(status, CommonIdNameDto.class))
                    .toList();
        }
    }

    @Override
    public ResponseDto<List<CommonIdNameDto>> getDocTypes(Integer docTypeId) {
        if (docTypeId != null && docTypeId != 0) {
            DocType docType = docTypeRepo.findById(docTypeId)
                    .orElseThrow(() -> new BusinessException("Doc type not found with id: " + docTypeId, null));

            CommonIdNameDto dto = modelMapper.map(docType, CommonIdNameDto.class);

            return ResponseDto.<List<CommonIdNameDto>>builder()
                    .status(200)
                    .message("Success")
                    .desc("Doc type fetched successfully")
                    .object(Collections.singletonList(dto))
                    .build();
        }

        List<CommonIdNameDto> docTypes = docTypeRepo.findAll().stream()
                .map(docType -> modelMapper.map(docType, CommonIdNameDto.class))
                .toList();

        return ResponseDto.<List<CommonIdNameDto>>builder()
                .status(200)
                .message("Success")
                .desc("Doc types fetched successfully")
                .object(docTypes)
                .build();
    }

    @Override
    public ResponseDto<PaginatedUserRequestDto> getUserRequests(PaginatedUserRequestDto paginatedUserRequestDto) {
        Pageable pageable = PageRequest.of(
                paginatedUserRequestDto.getPageNumber(),
                paginatedUserRequestDto.getCountPerPage(),
                Sort.by("id").descending()
        );

        Specification<UserRequest> spec = UserRequestSpec.getUserRequestSpecification(paginatedUserRequestDto);
        Page<UserRequest> userRequests = userRequestRepo.findAll(spec, pageable);

        paginatedUserRequestDto.setTotalCount(userRequests.getTotalElements());
        paginatedUserRequestDto.setTotalPages(userRequests.getTotalPages());

        List<UserRequestDto> items = userRequests.getContent().stream()
                .map(this::mapUserRequestToDto)
                .toList();

        paginatedUserRequestDto.setItems(items);

        return ResponseDto.<PaginatedUserRequestDto>builder()
                .status(200)
                .message("Success")
                .desc("User requests fetched successfully")
                .object(paginatedUserRequestDto)
                .build();
    }

    @Override
    public ResponseDto<UserRequestDto> setUserRequest(SetUserRequestDto dto, Integer userId) {
        User user = userRepo.findById(userId)
                .orElseThrow(() -> new BusinessException("User not found", Map.of("userId", "User not found")));

        UserRequestType userRequestType = userRequestTypeRepo.findById(dto.getUserRequestTypeId())
                .orElseThrow(() -> new BusinessException("User request type not found", Map.of("userRequestTypeId", "User request type not found")));

        List<String> storedDocUrls = storeUserRequestDocUrls(dto.getDocUrls());

        UserRequest userRequest = new UserRequest();
        userRequest.setTitle(dto.getTitle().trim());
        userRequest.setDesc(dto.getDesc().trim());
        userRequest.setAccepted(false);
        userRequest.setRead(false);
        userRequest.setIsDeleted(false);
        userRequest.setDocUrls(storedDocUrls);
        userRequest.setUser(user);
        userRequest.setUserRequestType(userRequestType);

        UserRequest saved = userRequestRepo.save(userRequest);

        return ResponseDto.<UserRequestDto>builder()
                .status(200)
                .message("Success")
                .desc("User request saved successfully")
                .object(mapUserRequestToDto(saved))
                .build();
    }

    @Override
    public String deleteUserRequest(Integer userRequestId) {
        UserRequest userRequest = userRequestRepo.findByIdAndIsDeletedFalse(userRequestId)
                .orElseThrow(() -> new BusinessException("User request not found", Map.of("userRequestId", "User request not found")));

        List<String> docUrls = userRequest.getDocUrls() == null ? List.of() : userRequest.getDocUrls();
        for (String docUrl : docUrls) {
            scheduleFileDeletion(docUrl);
        }

        userRequest.setDocUrls(List.of());
        userRequest.setIsDeleted(true);
        userRequestRepo.save(userRequest);
        return "User request deleted successfully";
    }

    @Override
    public ResponseDto<UserRequestDto> updateUserRequest(UpdateUserRequestDto dto) {
        if (dto.getIsRead() == null && dto.getIsAccepted() == null) {
            throw new BusinessException("At least one field is required", Map.of("request", "Provide isRead or isAccepted"));
        }

        UserRequest userRequest = userRequestRepo.findByIdAndIsDeletedFalse(dto.getUserRequestId())
                .orElseThrow(() -> new BusinessException("User request not found", Map.of("userRequestId", "User request not found")));

        if (dto.getIsRead() != null) {
            userRequest.setRead(dto.getIsRead());
        }

        if (dto.getIsAccepted() != null) {
            userRequest.setAccepted(dto.getIsAccepted());
        }

        UserRequest saved = userRequestRepo.save(userRequest);

        return ResponseDto.<UserRequestDto>builder()
                .status(200)
                .message("Success")
                .desc("User request updated successfully")
                .object(mapUserRequestToDto(saved))
                .build();
    }

    @Override
    public ResponseDto<VerificationDataDto> updateVerificationDataStatus(UpdateVerificationDataStatusDto dto) {
        VerificationData verificationData;
        if (dto.getUserId() != null && dto.getUserId() > 0) {
            verificationData = verificationDataRepo.findByIdAndUsers_Id(dto.getVerificationDataId(), dto.getUserId())
                    .orElseThrow(() -> new BusinessException("Verification data not found", Map.of("verificationDataId", "Verification data not found")));
        } else {
            verificationData = verificationDataRepo.findById(dto.getVerificationDataId())
                    .orElseThrow(() -> new BusinessException("Verification data not found", Map.of("verificationDataId", "Verification data not found")));
        }

        VerificationStatus verificationStatus = verificationStatusRepo.findById(dto.getVerificationStatusId())
                .orElseThrow(() -> new BusinessException("Verification status not found", Map.of("verificationStatusId", "Verification status not found")));

        verificationData.setVerificationStatus(verificationStatus);
        VerificationData saved = verificationDataRepo.save(verificationData);

        return ResponseDto.<VerificationDataDto>builder()
                .status(200)
                .message("Success")
                .desc("Verification status updated successfully")
                .object(mapVerificationDataToDto(saved))
                .build();
    }

    @Override
    public String dropAddress(Integer addressId, int userId) {
        DeliveryDetail deliveryDetail = deliveryDetailRepo.findByIdAndUsers_Id(addressId, userId)
                .orElseThrow(() -> new BusinessException("Address not found with id: " + addressId, null));

        deliveryDetailRepo.delete(deliveryDetail);
        return "Address deleted successfully";
    }

    @Override
    public String sendResetPasswordEmail(@MonotonicNonNull EmailDto dto) {

        userRepo.findUserByEmail(dto.getEmail()).orElseThrow(() -> new BusinessException("User does not exist with provided email", null));

        String token = JwtUtil.generateResetPasswordToken(dto.getEmail());

        String verifyUrl = origin + "/" + dto.getRoute().replace("/", "") + "?token=" + token;
        String design = dto.getDesign().replace("{{verification_link}}", verifyUrl);

        return emailService.sendEmail(EmailDto.builder()
                .email(dto.getEmail())
                .subject(dto.getSubject())
                .design(design)
                .build());

    }

    @Override
    public String resetPassword(ResetPasswordDto dto) {
        Jws<Claims> claims;
        try {
            claims = JwtUtil.parseEmailJwtToken(dto.getToken());
        } catch (JwtException e) {
            throw new BusinessException("Password resetting failed. Please try again", null);
        }

        String email = claims.getBody().get("email", String.class);

        if (email == null || email.isBlank()) {
            throw new BusinessException("Password resetting failed. Please try again", Map.of("Error", "User not found"));
        }
        User user = userRepo.findUserByEmail(email).orElseThrow(() -> new BusinessException("Password resetting failed. Please try again", Map.of("Error", "User not found with email")));
        user.setPassword(passwordEncoder.encode(dto.getPassword()));

        userRepo.save(user);

        return "Password reset successfully";
    }

    @Override
    public List<Integer> getAllUserIds(Boolean isActive, Boolean hasMarket, Boolean isEmployee, Boolean isEmailVerified) {
        Specification<User> spec = (root, query, cb) -> cb.conjunction();

        spec = spec.and((root, query, cb) -> cb.isFalse(root.get("isDeleted")));

        if (isActive != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("isActive"), isActive));
        }

        if (hasMarket != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("hasMarket"), hasMarket));
        }

        if (isEmployee != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("isEmployee"), isEmployee));
        }

        if (isEmailVerified != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("emailVerified"), isEmailVerified));
        }

        return userRepo.findAll(spec, Sort.by(Sort.Direction.ASC, "id"))
                .stream()
                .map(User::getId)
                .toList();
    }

    @Override
    public String updateUserRoleOrDelete(Integer actorUserId, UpdateUserRoleOrDeleteDto dto) {
        final int privilegedLevelThreshold = 4;

        if (dto.getUserRoleId() == null
                && dto.getVerificationStatusId() == null
                && dto.getIsActive() == null
                && dto.getIsDeleted() == null
                && dto.getIsEmployee() == null
                && dto.getHasMarket() == null) {
            throw new BusinessException("At least one field is required for update", Map.of("request", "Provide at least one of userRoleId, verificationStatusId, isActive, isDeleted, isEmployee, or hasMarket"));
        }

        User actor = userRepo.findById(actorUserId)
                .orElseThrow(() -> new BusinessException("Authenticated user not found", null));
        if (actor.getUserRole() == null || actor.getUserRole().getLevel() == null) {
            throw new BusinessException("Authenticated user role level is not configured", null);
        }

        Integer actorRoleLevel = actor.getUserRole().getLevel();

        User user = userRepo.findById(dto.getUserId())
                .orElseThrow(() -> new BusinessException("User not found", null));

        if (user.getUserRole() == null || user.getUserRole().getLevel() == null) {
            throw new BusinessException("Target user role level is not configured", null);
        }

        Integer targetRoleLevel = user.getUserRole().getLevel();
        boolean isPrivilegedActor = actorRoleLevel <= privilegedLevelThreshold;

        if (!isPrivilegedActor && actorRoleLevel >= targetRoleLevel) {
            throw new BusinessException("Unauthorized role/status update", Map.of("userRoleLevel", "You can only update users with lower privilege level than yours"));
        }

        if (dto.getUserRoleId() != null) {
            UserRole userRole = userRoleRepo.findById(dto.getUserRoleId())
                    .orElseThrow(() -> new BusinessException("User role not found with id: " + dto.getUserRoleId(), null));

            if (userRole.getLevel() == null) {
                throw new BusinessException("Target role level is not configured", null);
            }

            if (!isPrivilegedActor && actorRoleLevel >= userRole.getLevel()) {
                throw new BusinessException("Unauthorized role assignment", Map.of("userRoleId", "You can only assign roles with lower privilege level than yours"));
            }

            user.setUserRole(userRole);
        }

        if (dto.getVerificationStatusId() != null) {
            VerificationStatus verificationStatus = verificationStatusRepo.findById(dto.getVerificationStatusId())
                    .orElseThrow(() -> new BusinessException("Verification status not found with id: " + dto.getVerificationStatusId(), null));
            user.setVerificationStatus(verificationStatus);
        }

        if (dto.getIsActive() != null) {
            user.setIsActive(dto.getIsActive());
        }

        if (dto.getIsDeleted() != null) {
            user.setIsDeleted(dto.getIsDeleted());
        }

        if (dto.getIsEmployee() != null) {
            user.setIsEmployee(dto.getIsEmployee());
        }
        if (dto.getHasMarket() != null) {
            user.setHasMarket(dto.getHasMarket());
        }

        userRepo.save(user);
        return "User updated successfully";
    }

    @Override
    public String setUserDocuments(VerificationDataDto dto) {
        if (dto.getUserId() == null || dto.getUserId() <= 0) {
            throw new BusinessException("User id is required", Map.of("userId", "User id is required"));
        }
        if (dto.getVerificationStatusId() == null || dto.getVerificationStatusId() <= 0) {
            throw new BusinessException("Verification status id is required", Map.of("verificationStatusId", "Verification status id is required"));
        }
        if (dto.getUrl() == null || dto.getUrl().trim().isEmpty()) {
            throw new BusinessException("Document url is required", Map.of("url", "Document url is required"));
        }
        if (dto.getDesc() == null || dto.getDesc().trim().isEmpty()) {
            throw new BusinessException("Document description is required", Map.of("desc", "Document description is required"));
        }

        User user = userRepo.findById(dto.getUserId())
                .orElseThrow(() -> new BusinessException("User not found", Map.of("userId", "User not found")));

        VerificationStatus verificationStatus = verificationStatusRepo.findById(dto.getVerificationStatusId())
                .orElseThrow(() -> new BusinessException("Verification status not found", Map.of("verificationStatusId", "Verification status not found")));

        DocType docType = docTypeRepo.findById(dto.getDocType()).orElseThrow(() -> new BusinessException("DocType not found", Map.of("docType", "DocType not found")));

        String normalizedUrl = normalizeFileReference(dto.getUrl());
        if (normalizedUrl == null) {
            throw new BusinessException("Document url is required", Map.of("url", "Document url is required"));
        }

        String filename = normalizedUrl.substring(normalizedUrl.lastIndexOf('/') + 1);
        if (!fileStorageUtil.isAllowedDocumentFile(filename)) {
            throw new BusinessException("Unsupported file type", Map.of("url", "Allowed formats include jpg, jpeg, png, mp4, mp3, video, doc, docx, pdf, csv, and other common office files"));
        }

        boolean isUpdate = dto.getId() != null && dto.getId() > 0;
        VerificationData verificationData;
        if (isUpdate) {
            verificationData = verificationDataRepo.findByIdAndUsers_Id(dto.getId(), dto.getUserId())
                    .orElseThrow(() -> new BusinessException("Verification data not found", Map.of("id", "Verification data not found")));

            String existingUrl = normalizeFileReference(verificationData.getUrl());
            if (existingUrl != null && !Objects.equals(existingUrl, normalizedUrl)) {
                scheduleFileDeletion(verificationData.getUrl());
            }
        } else {
            verificationData = new VerificationData();
            verificationData.setUsers(user);
        }

        String storedUrl = normalizedUrl;
        if (storedUrl.toLowerCase(Locale.ROOT).startsWith("temporary/")) {
            storedUrl = fileStorageUtil.moveFile(storedUrl, "users-documents");
            if (storedUrl == null) {
                throw new BusinessException("Failed to process document file", Map.of("url", "Could not move the document file to permanent storage"));
            }
        } else {
            storedUrl = normalizeFileReference(storedUrl);
        }

        verificationData.setUrl(storedUrl);
        verificationData.setDesc(dto.getDesc().trim());
        verificationData.setUsers(user);
        verificationData.setVerificationStatus(verificationStatus);
        verificationData.setDocType(docType);

        verificationDataRepo.save(verificationData);

        return isUpdate ? "Verification data updated successfully" : "Verification data saved successfully";
    }

    @Override
    public ResponseDto<List<VerificationDataDto>> getVerificationData(Integer userId, Integer verificationDataId) {
        List<VerificationData> verificationDataList;
        if (verificationDataId != null && verificationDataId > 0) {
            verificationDataList = resolveVerificationDataTargets(userId, verificationDataId);
        } else if (userId != null && userId > 0) {
            verificationDataList = verificationDataRepo.findAllByUsers_Id(userId);
        } else {
            throw new BusinessException("Either userId or verificationDataId is required", Map.of("request", "Provide userId or verificationDataId"));
        }

        List<VerificationDataDto> items = verificationDataList.stream()
                .map(this::mapVerificationDataToDto)
                .toList();

        return ResponseDto.<List<VerificationDataDto>>builder()
                .status(200)
                .message("Success")
                .desc("Verification data fetched successfully")
                .object(items)
                .build();
    }

    @Override
    public String deleteVerificationData(Integer userId, Integer verificationDataId) {
        List<VerificationData> verificationDataList = resolveVerificationDataTargets(userId, verificationDataId);

        for (VerificationData verificationData : verificationDataList) {
            scheduleFileDeletion(verificationData.getUrl());
        }

        verificationDataRepo.deleteAllInBatch(verificationDataList);
        return "Verification data deleted successfully";
    }

    @Override
    public ResponseDto<List<CommonIdNameDto>> getUserRequestTypes(Integer userRequestTypeId) {
        if (userRequestTypeId != null && userRequestTypeId != 0) {
            UserRequestType userRequestType = userRequestTypeRepo.findById(userRequestTypeId)
                    .orElseThrow(() -> new BusinessException("Doc type not found with id: " + userRequestTypeId, null));

            CommonIdNameDto dto = modelMapper.map(userRequestType, CommonIdNameDto.class);

            return ResponseDto.<List<CommonIdNameDto>>builder()
                    .status(200)
                    .message("Success")
                    .desc("Doc type fetched successfully")
                    .object(Collections.singletonList(dto))
                    .build();
        }

        List<CommonIdNameDto> docTypes = userRequestTypeRepo.findAll().stream()
                .map(userRequestType -> modelMapper.map(userRequestType, CommonIdNameDto.class))
                .toList();

        return ResponseDto.<List<CommonIdNameDto>>builder()
                .status(200)
                .message("Success")
                .desc("Doc types fetched successfully")
                .object(docTypes)
                .build();
    }

    private List<VerificationData> resolveVerificationDataTargets(Integer userId, Integer verificationDataId) {
        if (verificationDataId != null && verificationDataId > 0) {
            if (userId != null && userId > 0) {
                return Collections.singletonList(
                        verificationDataRepo.findByIdAndUsers_Id(verificationDataId, userId)
                                .orElseThrow(() -> new BusinessException("Verification data not found", Map.of("verificationDataId", "Verification data not found")))
                );
            }

            return Collections.singletonList(
                    verificationDataRepo.findById(verificationDataId)
                            .orElseThrow(() -> new BusinessException("Verification data not found", Map.of("verificationDataId", "Verification data not found")))
            );
        }

        if (userId != null && userId > 0) {
            List<VerificationData> verificationDataList = verificationDataRepo.findAllByUsers_Id(userId);
            if (verificationDataList.isEmpty()) {
                throw new BusinessException("Verification data not found", Map.of("userId", "Verification data not found"));
            }
            return verificationDataList;
        }

        throw new BusinessException("Either userId or verificationDataId is required", Map.of("request", "Provide userId or verificationDataId"));
    }

    private VerificationDataDto mapVerificationDataToDto(VerificationData verificationData) {
        return VerificationDataDto.builder()
                .id(verificationData.getId())
                .url(verificationData.getUrl())
                .desc(verificationData.getDesc())
                .userId(verificationData.getUsers() != null ? verificationData.getUsers().getId() : null)
                .verificationStatusId(verificationData.getVerificationStatus() != null ? verificationData.getVerificationStatus().getId() : null)
                .docType(verificationData.getDocType().getId())
                .build();
    }

    private UserRequestDto mapUserRequestToDto(UserRequest userRequest) {
        return new UserRequestDto(
                userRequest.getId(),
                userRequest.getTitle(),
                userRequest.getDesc(),
                userRequest.getAccepted(),
                userRequest.getRead(),
                userRequest.getIsDeleted(),
                userRequest.getDocUrls() == null ? List.of() : new ArrayList<>(userRequest.getDocUrls()),
                userRequest.getUser() == null ? null : new UserRequestDto.UserRef(
                        userRequest.getUser().getId(),
                        userRequest.getUser().getFirstName(),
                        userRequest.getUser().getLastName(),
                        userRequest.getUser().getEmail()
                ),
                userRequest.getUserRequestType() == null ? null : new UserRequestDto.UserRequestTypeRef(
                        userRequest.getUserRequestType().getId(),
                        userRequest.getUserRequestType().getName()
                )
        );
    }

    private List<String> storeUserRequestDocUrls(List<String> docUrls) {
        List<String> normalizedDocUrls = normalizeDocUrls(docUrls);
        if (normalizedDocUrls.isEmpty()) {
            return List.of();
        }

        List<String> movedDocUrls = new ArrayList<>();
        List<String> storedDocUrls = new ArrayList<>();

        try {
            for (String docUrl : normalizedDocUrls) {
                String filename = docUrl.substring(docUrl.lastIndexOf('/') + 1);
                if (!fileStorageUtil.isAllowedDocumentFile(filename)) {
                    throw new BusinessException("Unsupported file type", Map.of("docUrls", "Allowed formats include images, audio, video, doc, docx, pdf, csv, and other common office files"));
                }

                String storedDocUrl = docUrl;
                if (docUrl.toLowerCase(Locale.ROOT).startsWith("temporary/")) {
                    storedDocUrl = fileStorageUtil.moveFile(docUrl, "user-request-docs");
                    if (storedDocUrl == null) {
                        throw new BusinessException("Failed to process request documents", Map.of("docUrls", "Could not move one or more documents to permanent storage"));
                    }
                    movedDocUrls.add(storedDocUrl);
                }

                String normalizedStoredDocUrl = normalizeFileReference(storedDocUrl);
                if (normalizedStoredDocUrl == null) {
                    throw new BusinessException("Invalid document url", Map.of("docUrls", "One or more document urls are invalid"));
                }
                storedDocUrls.add(normalizedStoredDocUrl);
            }
        } catch (RuntimeException ex) {
            for (String movedDocUrl : movedDocUrls) {
                fileStorageUtil.deleteFile(movedDocUrl);
            }
            throw ex;
        }

        return storedDocUrls;
    }

    private List<String> normalizeDocUrls(List<String> docUrls) {
        if (docUrls == null || docUrls.isEmpty()) {
            return new ArrayList<>();
        }

        Set<String> uniqueUrls = new LinkedHashSet<>();
        for (String docUrl : docUrls) {
            String normalized = normalizeFileReference(docUrl);
            if (normalized != null) {
                uniqueUrls.add(normalized);
            }
        }

        return new ArrayList<>(uniqueUrls);
    }

    private String normalizeFileReference(String fileReference) {
        String normalized = fileStorageUtil.normalizeFileReference(fileReference);
        if (normalized != null) {
            return normalized;
        }

        if (fileReference == null || fileReference.trim().isEmpty()) {
            return null;
        }

        return fileReference.trim();
    }

    private void scheduleFileDeletion(String fileReference) {
        if (fileReference == null || fileReference.trim().isEmpty()) {
            return;
        }

        if (TransactionSynchronizationManager.isActualTransactionActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    fileStorageUtil.deleteFile(fileReference);
                }
            });
            return;
        }

        fileStorageUtil.deleteFile(fileReference);
    }

    private String normalizeDeviceId(String deviceId) {
        if (deviceId == null) {
            return null;
        }

        String trimmed = deviceId.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    @Override
    public List<UserDataDto> getUserDataByUserId(Integer userId) {
        User user = userRepo.findById(userId)
                .orElseThrow(() -> new BusinessException("User not found", null));

        List<UserData> userDataList = userDataRepo.findByUsers_Id(userId);

        return userDataList.stream()
                .map(userData -> UserDataDto.builder()
                        .id(userData.getId())
                        .primaryMobile(userData.getPrimaryMobile())
                        .secondaryMobile(userData.getSecondaryMobile())
                        .whatsapp(userData.getWhatsapp())
                        .postalCode(userData.getPostalCode())
                        .address(userData.getAddress())
                        .cities(modelMapper.map(userData.getCities(), CityDto.class))
                        .isPnoVerified(userData.getIsPnoVerified())
                        .build())
                .toList();
    }

    @Override
    public ResponseDto<UserDataDto> addUserData(UserDataDto dto, Integer userId) {
        User user = userRepo.findById(userId)
                .orElseThrow(() -> new BusinessException("User not found", null));

        Integer cityId = dto.getCities() != null ? dto.getCities().getId() : null;
        if (cityId == null || cityId == 0) {
            throw new BusinessException("City id is required", Map.of("cities.id", "City id is required"));
        }

        City city = cityRepo.findById(cityId)
                .orElseThrow(() -> new BusinessException("City not found with id: " + cityId, null));

        UserData userData;
        boolean isUpdate = dto.getId() != null && dto.getId() != 0;

        if (isUpdate) {
            userData = userDataRepo.findByIdAndUsers_Id(dto.getId(), userId)
                    .orElseThrow(() -> new BusinessException("User data not found with id: " + dto.getId(), null));
        } else {
            userData = new UserData();
            userData.setUsers(user);
        }

        userData.setPrimaryMobile(dto.getPrimaryMobile());
        userData.setSecondaryMobile(dto.getSecondaryMobile());
        userData.setWhatsapp(dto.getWhatsapp());
        userData.setPostalCode(dto.getPostalCode());
        userData.setAddress(dto.getAddress());
        userData.setCities(city);
        
        // Preserve existing isPnoVerified if updating and not provided in dto
        if (isUpdate && dto.getIsPnoVerified() == null) {
            // Keep existing value
        } else {
            userData.setIsPnoVerified(dto.getIsPnoVerified() != null ? dto.getIsPnoVerified() : false);
        }

        UserData saved = userDataRepo.save(userData);

        UserDataDto responseDto = UserDataDto.builder()
                .id(saved.getId())
                .primaryMobile(saved.getPrimaryMobile())
                .secondaryMobile(saved.getSecondaryMobile())
                .whatsapp(saved.getWhatsapp())
                .postalCode(saved.getPostalCode())
                .address(saved.getAddress())
                .cities(modelMapper.map(saved.getCities(), CityDto.class))
                .isPnoVerified(saved.getIsPnoVerified())
                .build();

        return ResponseDto.<UserDataDto>builder()
                .status(200)
                .message("Success")
                .desc(isUpdate ? "User data updated successfully" : "User data added successfully")
                .object(responseDto)
                .build();
    }

    @Override
    public String deleteUserData(Integer userDataId, Integer userId) {
        UserData userData = userDataRepo.findByIdAndUsers_Id(userDataId, userId)
                .orElseThrow(() -> new BusinessException("User data not found with id: " + userDataId, null));

        userDataRepo.delete(userData);
        return "User data deleted successfully";
    }

    @Override
    public String sendMobileVerificationCode(String mobileNumber, jakarta.servlet.http.HttpServletRequest request) {
        if (mobileNumber == null || mobileNumber.trim().isEmpty()) {
            throw new BusinessException("Mobile number is required", Map.of("mobileNumber", "Mobile number is required"));
        }

        // Validate mobile number format (10 digits, optionally with +94 prefix)
        String normalizedMobile = mobileNumber.replaceAll("\\D", "");
        if (normalizedMobile.length() != 10) {
            throw new BusinessException("Invalid mobile number format", Map.of("mobileNumber", "Please enter a valid 10-digit mobile number"));
        }

        // Generate 4-digit verification code
        String verificationCode = String.format("%04d", new java.util.Random().nextInt(10000));

        // Store in session
        var session = request.getSession(true);
        session.setAttribute("mobileVerificationCode", verificationCode);
        session.setAttribute("mobileNumber", normalizedMobile);
        session.setAttribute("codeExpiry", System.currentTimeMillis() + 5 * 60 * 1000); // 5 minutes expiry
        session.setMaxInactiveInterval(5 * 60); // Set session timeout to 5 minutes

        log.info("Mobile verification code stored in session. Session ID: {}, Mobile: {}", session.getId(), normalizedMobile);

        // Send SMS
        String message = String.format("Your DeliveryYa verification code is: %s. Valid for 5 minutes.", verificationCode);
        String contactNumber = "+94" + normalizedMobile.substring(1); // Convert to +94 format

        SmsSingleDto smsDto = SmsSingleDto.builder()
                .contact(contactNumber)
                .message(message)
                .senderId("DeliveryYa")
                .build();

        ResponseDto<Void> smsResponse = smsService.sendSingleSms(smsDto);

        if (smsResponse.getStatus() == null || smsResponse.getStatus() != 200) {
            throw new BusinessException("Failed to send verification SMS", Map.of("sms", smsResponse.getDesc() != null ? smsResponse.getDesc() : "Unknown error"));
        }

        return "Verification code sent successfully";
    }

    @Override
    public ResponseDto<Boolean> verifyMobileCode(String code, jakarta.servlet.http.HttpServletRequest request, Integer userId) {
        var session = request.getSession(false);
        
        if (session == null) {
            log.error("No session found for mobile verification. Session may have expired or cookies not sent.");
            return ResponseDto.<Boolean>builder()
                    .status(400)
                    .message("Failed")
                    .desc("No verification code found. Please request a new code.")
                    .object(false)
                    .build();
        }
        
        log.info("Attempting to verify mobile code. Session ID: {}", session.getId());
        
        String storedCode = (String) session.getAttribute("mobileVerificationCode");
        Long expiryTime = (Long) session.getAttribute("codeExpiry");

        if (storedCode == null) {
            log.error("Mobile verification code not found in session. Session ID: {}", session.getId());
            return ResponseDto.<Boolean>builder()
                    .status(400)
                    .message("Failed")
                    .desc("No verification code found. Please request a new code.")
                    .object(false)
                    .build();
        }

        if (expiryTime == null || System.currentTimeMillis() > expiryTime) {
            session.removeAttribute("mobileVerificationCode");
            session.removeAttribute("mobileNumber");
            session.removeAttribute("codeExpiry");
            log.error("Mobile verification code expired. Session ID: {}", session.getId());
            return ResponseDto.<Boolean>builder()
                    .status(400)
                    .message("Failed")
                    .desc("Verification code has expired. Please request a new code.")
                    .object(false)
                    .build();
        }

        if (!storedCode.equals(code)) {
            log.error("Mobile verification code mismatch. Expected: {}, Received: {}. Session ID: {}", storedCode, code, session.getId());
            return ResponseDto.<Boolean>builder()
                    .status(400)
                    .message("Failed")
                    .desc("Invalid verification code. Please try again.")
                    .object(false)
                    .build();
        }

        // Update is_pno_verified in user_data table
        List<UserData> userDataList = userDataRepo.findByUsers_Id(userId);
        if (!userDataList.isEmpty()) {
            UserData userData = userDataList.get(0);
            userData.setIsPnoVerified(true);
            userDataRepo.save(userData);
            log.info("Updated is_pno_verified to true for user data id: {}, user id: {}", userData.getId(), userId);
        }

        // Clear session after successful verification
        session.removeAttribute("mobileVerificationCode");
        session.removeAttribute("codeExpiry");
        
        log.info("Mobile verification code verified successfully. Session ID: {}", session.getId());

        return ResponseDto.<Boolean>builder()
                .status(200)
                .message("Success")
                .desc("Mobile number verified successfully")
                .object(true)
                .build();
    }

    @Override
    public ResponseDto<ForceDeletePreviewDto> previewForceDeleteUser(Integer userId) {
        User user = userRepo.findById(userId)
                .orElseThrow(() -> new BusinessException("User not found with id: " + userId, null));

        Map<String, Long> relatedRecordCounts = new HashMap<>();
        List<String> recordsToBeDeleted = new ArrayList<>();
        List<String> recordsToBeDetached = new ArrayList<>();
        String blockingReason = null;
        Boolean canDelete = true;

        long employeeCount = employeeRepo.countByUsersId(userId);
        relatedRecordCounts.put("employees", employeeCount);
        if (employeeCount > 0) {
            blockingReason = "User has " + employeeCount + " employee record(s). Historical employee data should not be deleted.";
            canDelete = false;
        }

        long marketCount = marketRepo.countByUsersId(userId);
        relatedRecordCounts.put("markets", marketCount);
        if (marketCount > 0) {
            blockingReason = "User has " + marketCount + " market record(s). Delete or transfer markets first.";
            canDelete = false;
        }

        long marketOrderCount = marketOrderRepo.countByUserId(userId);
        relatedRecordCounts.put("market_orders", marketOrderCount);
        if (marketOrderCount > 0) {
            blockingReason = "User has " + marketOrderCount + " market order record(s). Historical order data should not be deleted.";
            canDelete = false;
        }

        long feedbackCount = feedbackRepo.countByUserId(userId);
        relatedRecordCounts.put("feedbacks", feedbackCount);
        if (feedbackCount > 0) {
            recordsToBeDeleted.add(feedbackCount + " feedback record(s)");
        }

        long notificationCount = notificationRepo.countByUsersId(userId);
        relatedRecordCounts.put("notifications", notificationCount);
        if (notificationCount > 0) {
            recordsToBeDeleted.add(notificationCount + " notification record(s)");
        }

        long deliveryDetailCount = deliveryDetailRepo.countByUsersId(userId);
        relatedRecordCounts.put("delivery_details", deliveryDetailCount);
        if (deliveryDetailCount > 0) {
            recordsToBeDeleted.add(deliveryDetailCount + " delivery detail record(s)");
        }

        long userDataCount = userDataRepo.countByUsersId(userId);
        relatedRecordCounts.put("user_data", userDataCount);
        if (userDataCount > 0) {
            recordsToBeDeleted.add(userDataCount + " user data record(s)");
        }

        long userRequestCount = userRequestRepo.countByUserId(userId);
        relatedRecordCounts.put("user_requests", userRequestCount);
        if (userRequestCount > 0) {
            recordsToBeDeleted.add(userRequestCount + " user request record(s)");
        }

        long verificationDataCount = verificationDataRepo.countByUsersId(userId);
        relatedRecordCounts.put("verification_data", verificationDataCount);
        if (verificationDataCount > 0) {
            recordsToBeDeleted.add(verificationDataCount + " verification data record(s)");
        }

        long accessTokenCount = accessTokenRepo.countByUsersId(userId);
        relatedRecordCounts.put("access_tokens", accessTokenCount);
        if (accessTokenCount > 0) {
            recordsToBeDeleted.add(accessTokenCount + " access token record(s)");
        }

        ForceDeletePreviewDto preview = ForceDeletePreviewDto.builder()
                .entityName("User")
                .entityId(userId)
                .entityIdentifier(user.getFirstName() + " " + user.getLastName() + " (" + user.getEmail() + ")")
                .canDelete(canDelete)
                .blockingReason(blockingReason)
                .relatedRecordCounts(relatedRecordCounts)
                .recordsToBeDeleted(recordsToBeDeleted)
                .recordsToBeDetached(recordsToBeDetached)
                .build();

        return ResponseDto.<ForceDeletePreviewDto>builder()
                .message("Success")
                .desc("Force delete preview generated")
                .object(preview)
                .build();
    }

    @Override
    @Transactional
    public ResponseDto<Void> forceDeleteUser(@Valid ForceDeleteConfirmDto dto) {
        if (!Boolean.TRUE.equals(dto.getConfirmed())) {
            throw new BusinessException("Confirmation required for force delete", Map.of("confirmed", "You must confirm this action"));
        }

        User user = userRepo.findById(dto.getEntityId())
                .orElseThrow(() -> new BusinessException("User not found with id: " + dto.getEntityId(), null));

        long employeeCount = employeeRepo.countByUsersId(user.getId());
        if (employeeCount > 0) {
            throw new BusinessException("Cannot delete user with employee records", 
                Map.of("employees", "User has " + employeeCount + " employee record(s). Historical employee data should not be deleted."));
        }

        long marketCount = marketRepo.countByUsersId(user.getId());
        if (marketCount > 0) {
            throw new BusinessException("Cannot delete user with markets", 
                Map.of("markets", "User has " + marketCount + " market record(s). Delete or transfer markets first."));
        }

        long marketOrderCount = marketOrderRepo.countByUserId(user.getId());
        if (marketOrderCount > 0) {
            throw new BusinessException("Cannot delete user with market orders", 
                Map.of("market_orders", "User has " + marketOrderCount + " market order record(s). Historical order data should not be deleted."));
        }

        List<String> filesToDelete = new ArrayList<>();
        
        if (user.getProfileImg() != null && !user.getProfileImg().trim().isEmpty()) {
            filesToDelete.add(user.getProfileImg());
        }

        userDataRepo.deleteByUsersId(user.getId());
        userRequestRepo.deleteByUserId(user.getId());
        verificationDataRepo.deleteByUsersId(user.getId());
        notificationRepo.deleteByUsersId(user.getId());
        deliveryDetailRepo.deleteByUsersId(user.getId());
        accessTokenRepo.deleteByUsersId(user.getId());
        feedbackRepo.deleteByUserId(user.getId());

        if (!filesToDelete.isEmpty()) {
            scheduleFileDeletion(filesToDelete);
        }

        userRepo.delete(user);

        return ResponseDto.<Void>builder()
                .message("Success")
                .desc("User permanently deleted")
                .build();
    }

    private void scheduleFileDeletion(List<String> fileReferences) {
        if (fileReferences == null || fileReferences.isEmpty()) {
            return;
        }

        if (TransactionSynchronizationManager.isActualTransactionActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    fileStorageUtil.deleteFiles(fileReferences);
                }
            });
            return;
        }

        fileStorageUtil.deleteFiles(fileReferences);
    }

}
