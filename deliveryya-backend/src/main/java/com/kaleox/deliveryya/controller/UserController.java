package com.kaleox.deliveryya.controller;

import com.kaleox.deliveryya.config.BusinessException;
import com.kaleox.deliveryya.dto.*;
import com.kaleox.deliveryya.dto.customDto.CommonIdNameDto;
import com.kaleox.deliveryya.dto.customDto.UpdateGroup;
import com.kaleox.deliveryya.dto.paginatedDto.PaginatedCityDto;
import com.kaleox.deliveryya.dto.paginatedDto.PaginatedUserDto;
import com.kaleox.deliveryya.dto.paginatedDto.PaginatedUserRequestDto;
import com.kaleox.deliveryya.dto.user.*;
import com.kaleox.deliveryya.service.UserService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.groups.Default;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * REST Controller for User Management
 * Base URL: /api/v1/users
 * <p>
 * Handles user registration, authentication, and profile updates.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/users")
public class UserController {

    private final UserService userService;

    @PostMapping("/sign-up")
    public ResponseEntity<ResponseDto> signUp(@Valid @RequestBody UserDto dto) {

        return ResponseEntity.ok(userService.setUser(dto));
    }

    @PostMapping("/login")
    public ResponseEntity<ResponseDto> login(@RequestBody UserDto dto) {

        Map<String, String> err = new HashMap<>();

        String email = dto.getEmail();
        String password = dto.getPassword();

        if (email == null || email.trim().isEmpty()) {
            err.put("email", "Email is required");
        } else if (!email.matches("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+$")) {
            err.put("email", "Invalid email format");
        }

        if (password == null || password.trim().isEmpty()) {
            err.put("password", "Password is required");
        }

        if (!err.isEmpty()) {
            throw new BusinessException("Validation failed", err);
        }

        return ResponseEntity.ok(userService.login(dto));
    }

    @GetMapping(path = "/admin/get-user-by-id")
    public ResponseEntity<ResponseDto<UserDto>> adminGetUserById(@RequestParam @NotNull(message = "Id must not be null")
                                                                 @Min(value = 1, message = "Id must be greater than 0") Integer id) {

        return ResponseEntity.ok(ResponseDto.<UserDto>builder()
                .status(200).message("Success")
                .desc("User found")
                .object(userService.getUserById(id))
                .build());
    }

    @GetMapping(path = "/get-user-by-id")
    public ResponseEntity<ResponseDto<UserDto>> getUserById(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(ResponseDto.<UserDto>builder()
                .status(200).message("Success")
                .desc("User found")
                .object(userService.getUserById(Integer.parseInt(userDetails.getUsername())))
                .build());
    }

    @GetMapping("/get-all-user-ids")
    public ResponseEntity<ResponseDto<List<Integer>>> getAllUserIds(@RequestParam Boolean isActive, @RequestParam Boolean hasMarket
            , @RequestParam Boolean isEmployee, @RequestParam Boolean isEmailVerified) {

        return ResponseEntity.ok(ResponseDto.<List<Integer>>builder()
                .message("Success")
                .desc("User ids fetched successfully")
                .object(userService.getAllUserIds(isActive, hasMarket, isEmployee, isEmailVerified))
                .build());

    }

    @GetMapping(path = "/get-verification-statuses")
    public ResponseEntity<ResponseDto<List<CommonIdNameDto>>> getVerificationStatuses(@RequestParam(required = false) Integer id) {

        return ResponseEntity.ok(ResponseDto.<List<CommonIdNameDto>>builder()
                .message("Success")
                .desc("Verification statuses fetched successfully")
                .object(userService.getVerificationStatuses(id))
                .build());
    }

    @PostMapping("/update-user-role-or-delete")
    public ResponseEntity<ResponseDto<Void>> updateUserRoleOrDelete(@AuthenticationPrincipal UserDetails userDetails,
                                                                    @RequestBody @Valid UpdateUserRoleOrDeleteDto dto) {
        return ResponseEntity.ok(ResponseDto.<Void>builder()
                .message("Success")
                .desc(userService.updateUserRoleOrDelete(Integer.parseInt(userDetails.getUsername()), dto))
                .build());
    }

    @PostMapping("/get-cities")
    public ResponseEntity<ResponseDto> getCities(@RequestBody @Valid PaginatedCityDto paginatedCityDto) {

        return ResponseEntity.ok(userService.getPaginatedCities(paginatedCityDto));
    }

    @GetMapping("/get-districts")
    public ResponseEntity<ResponseDto<List<DistrictDto>>> getDistricts() {
        return ResponseEntity.ok(userService.getAllDistricts());
    }

    @PostMapping("/admin/update-user")
    public ResponseEntity<ResponseDto> adminUpdateUser(@Valid @RequestBody UserDto dto) {

        if (dto.getId() == null || dto.getId() == 0) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(ResponseDto.builder().message("error").desc("Details update unsuccessful").exData(Map.of("id", "Id is required for this process")).build());
        }

        return ResponseEntity.ok(userService.update(dto));
    }

    @PostMapping("/update-user")
    public ResponseEntity<ResponseDto> updateUser(@Validated({UpdateGroup.class, Default.class}) @RequestBody UserDto dto, @AuthenticationPrincipal UserDetails userDetails) {
        dto.setId(Integer.parseInt(userDetails.getUsername()));

        if (dto.getId() == null || dto.getId() == 0) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(ResponseDto.builder().message("error").desc("Details update unsuccessful").exData(Map.of("id", "Id is required for this process")).build());
        }

        return ResponseEntity.ok(userService.update(dto));
    }


    @PostMapping("/get-users")
    public ResponseEntity<ResponseDto> getUsers(@RequestBody @Valid PaginatedUserDto paginatedUserDto) {

        return ResponseEntity.ok(ResponseDto.builder()
                .status(200)
                .message("Success")
                .desc("Users fetched successfully")
                .object(userService.getPaginatedUsers(paginatedUserDto))
                .build());
    }

    @GetMapping("/get-user-roles")
    public ResponseEntity<ResponseDto> getUserRoles(@RequestParam(required = false) Integer id) {
        return ResponseEntity.ok(userService.getUserRoles(id));
    }

//    @PostMapping("/update-is")

    @GetMapping("/get-genders")
    public ResponseEntity<ResponseDto<List<CommonIdNameDto>>> getGenders(@RequestParam(required = false) Integer id) {
        return ResponseEntity.ok(ResponseDto.<List<CommonIdNameDto>>builder()
                .message("Success")
                .desc("Genders fetched successfully")
                .object(userService.getGenders(id)).build());
    }


    @GetMapping("/get-address-by-id-or-user-id")
    public ResponseEntity<ResponseDto<List<DeliveryDetailDto>>> getUserCities(@AuthenticationPrincipal UserDetails userDetails,
                                                                              @RequestParam(required = false) Boolean defaultAddress,
                                                                              @RequestParam(required = false) Integer userId,
                                                                              @RequestParam(required = false) @Min(1) Integer addressId) {
        return ResponseEntity.ok(ResponseDto.<List<DeliveryDetailDto>>builder()
                .status(200)
                .message("Success")
                .object(userService.getAddressByIdOrUserId(addressId == null ? 0 : addressId, defaultAddress, (userId == null || userId == 0) ? Integer.parseInt(userDetails.getUsername()) : userId))
                .build());
    }

    @PostMapping("/add-address")
    public ResponseEntity<ResponseDto<DeliveryDetailDto>> addAddress(@RequestBody @Valid DeliveryDetailsDto dto,
                                                                     @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(userService.addAddress(dto, Integer.parseInt(userDetails.getUsername())));
    }

    @PostMapping("/save-user-token")
    public ResponseEntity<ResponseDto<Void>> saveUserToken(@RequestBody @Valid SetUserTokenDto dto, @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(ResponseDto.<Void>builder()
                .message("Success")
                .desc(userService.saveUserToken(dto, Integer.parseInt(userDetails.getUsername())))
                .build());
    }

    @PostMapping("/send-reset-password-email")
    public ResponseEntity<ResponseDto<Void>> sendResetPasswordEmail(@RequestBody @Valid EmailDto dto) {
        return ResponseEntity.ok(ResponseDto.<Void>builder()
                .message("Success")
                .desc(userService.sendResetPasswordEmail(dto))
                .build());
    }

    @PostMapping("/reset-password-email")
    public ResponseEntity<ResponseDto<Void>> resetPassword(@RequestBody ResetPasswordDto dto) {

        return ResponseEntity.ok(ResponseDto.<Void>builder()
                .message("Success")
                .desc(userService.resetPassword(dto))
                .build());
    }

    @DeleteMapping("/drop-address-by-id")
    public ResponseEntity<ResponseDto<Void>> dropAddressById(@RequestParam @NotNull(message = "Address Id must be provided") @Min(1) Integer addressId,
                                                             @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(ResponseDto.<Void>builder()
                .message("Success")
                .desc(userService.dropAddress(addressId, Integer.parseInt(userDetails.getUsername())))
                .build());
    }


    @PostMapping("/set-user-documents")
    public ResponseEntity<ResponseDto<Void>> setUserDocuments(@RequestBody @Valid VerificationDataDto dto) {

        return ResponseEntity.ok(ResponseDto.<Void>builder()
                .message("Success")
                .desc(userService.setUserDocuments(dto))
                .build());
    }

    @GetMapping("/get-verification-data")
    public ResponseEntity<ResponseDto<List<VerificationDataDto>>> getVerificationData(@RequestParam(required = false) Integer userId,
                                                                                      @RequestParam(required = false) Integer verificationDataId) {
        return ResponseEntity.ok(userService.getVerificationData(userId, verificationDataId));
    }

    @GetMapping("/get-doc-types")
    public ResponseEntity<ResponseDto<List<CommonIdNameDto>>> getDocTypes(@RequestParam(required = false) Integer docTypeId) {
        return ResponseEntity.ok(userService.getDocTypes(docTypeId));
    }

    @GetMapping("/get-user-request-types")
    public ResponseEntity<ResponseDto<List<CommonIdNameDto>>> getUserRequestTypes(@RequestParam(required = false) Integer userRequestTypeId) {
        return ResponseEntity.ok(userService.getUserRequestTypes(userRequestTypeId));
    }

    @PostMapping("/get-user-requests")
    public ResponseEntity<ResponseDto<PaginatedUserRequestDto>> getUserRequests(@RequestBody @Valid PaginatedUserRequestDto paginatedUserRequestDto) {
        return ResponseEntity.ok(userService.getUserRequests(paginatedUserRequestDto));
    }

    @PostMapping("/set-user-request")
    public ResponseEntity<ResponseDto<UserRequestDto>> setUserRequest(@RequestBody @Valid SetUserRequestDto dto,
                                                                      @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(userService.setUserRequest(dto, Integer.parseInt(userDetails.getUsername())));
    }

    @DeleteMapping("/delete-request")
    public ResponseEntity<ResponseDto<Void>> deleteRequest(@RequestParam @NotNull(message = "User request Id must be provided") @Min(1) Integer userRequestId) {
        return ResponseEntity.ok(ResponseDto.<Void>builder()
                .message("Success")
                .desc(userService.deleteUserRequest(userRequestId))
                .build());
    }

    //User-requests
    @PostMapping("/update-read-accepted")
    public ResponseEntity<ResponseDto<UserRequestDto>> updateReadAccepted(@RequestBody @Valid UpdateUserRequestDto dto) {
        return ResponseEntity.ok(userService.updateUserRequest(dto));
    }

    @PostMapping("/update-verification-status")
    public ResponseEntity<ResponseDto<VerificationDataDto>> updateVerificationStatus(@RequestBody @Valid UpdateVerificationDataStatusDto dto) {
        return ResponseEntity.ok(userService.updateVerificationDataStatus(dto));
    }


    @DeleteMapping("/delete-verification-data")
    public ResponseEntity<ResponseDto<Void>> deleteVerificationData(@RequestParam(required = false) Integer userId,
                                                                    @RequestParam(required = false) Integer verificationDataId) {
        return ResponseEntity.ok(ResponseDto.<Void>builder()
                .message("Success")
                .desc(userService.deleteVerificationData(userId, verificationDataId))
                .build());
    }

    @GetMapping("/get-user-data")
    public ResponseEntity<ResponseDto<List<UserDataDto>>> getUserData(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(ResponseDto.<List<UserDataDto>>builder()
                .status(200)
                .message("Success")
                .desc("User data fetched successfully")
                .object(userService.getUserDataByUserId(Integer.parseInt(userDetails.getUsername())))
                .build());
    }

    @PostMapping("/add-user-data")
    public ResponseEntity<ResponseDto<UserDataDto>> addUserData(@Valid @RequestBody UserDataDto dto,
                                                                 @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(userService.addUserData(dto, Integer.parseInt(userDetails.getUsername())));
    }

    @DeleteMapping("/delete-user-data")
    public ResponseEntity<ResponseDto<Void>> deleteUserData(@RequestParam @NotNull(message = "User data Id must be provided") @Min(1) Integer userDataId,
                                                             @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(ResponseDto.<Void>builder()
                .message("Success")
                .desc(userService.deleteUserData(userDataId, Integer.parseInt(userDetails.getUsername())))
                .build());
    }

    @PostMapping("/send-mobile-verification")
    public ResponseEntity<ResponseDto<Void>> sendMobileVerificationCode(@RequestParam @NotBlank(message = "Mobile number is required") String mobileNumber,
                                                                         jakarta.servlet.http.HttpServletRequest request) {
        return ResponseEntity.ok(ResponseDto.<Void>builder()
                .message("Success")
                .desc(userService.sendMobileVerificationCode(mobileNumber, request))
                .build());
    }

    @PostMapping("/verify-mobile-code")
    public ResponseEntity<ResponseDto<Boolean>> verifyMobileCode(@RequestParam @NotBlank(message = "Verification code is required") String code,
                                                                  jakarta.servlet.http.HttpServletRequest request,
                                                                  @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(userService.verifyMobileCode(code, request, Integer.parseInt(userDetails.getUsername())));
    }

    @GetMapping("/preview-force-delete-user")
    public ResponseEntity<ResponseDto<ForceDeletePreviewDto>> previewForceDeleteUser(@RequestParam @NotNull Integer userId) {
        return ResponseEntity.ok(userService.previewForceDeleteUser(userId));
    }

    @DeleteMapping("/force-delete-user")
    public ResponseEntity<ResponseDto<Void>> forceDeleteUser(@Valid @RequestBody ForceDeleteConfirmDto dto) {
        return ResponseEntity.ok(userService.forceDeleteUser(dto));
    }
}
