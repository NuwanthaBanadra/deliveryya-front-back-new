package com.kaleox.deliveryya.service;

import com.kaleox.deliveryya.dto.DeliveryDetailDto;
import com.kaleox.deliveryya.dto.DeliveryDetailsDto;
import com.kaleox.deliveryya.dto.EmailDto;
import com.kaleox.deliveryya.dto.DistrictDto;
import com.kaleox.deliveryya.dto.ForceDeleteConfirmDto;
import com.kaleox.deliveryya.dto.ForceDeletePreviewDto;
import com.kaleox.deliveryya.dto.ResponseDto;
import com.kaleox.deliveryya.dto.UserDataDto;
import com.kaleox.deliveryya.dto.customDto.CommonIdNameDto;
import com.kaleox.deliveryya.dto.paginatedDto.PaginatedCityDto;
import com.kaleox.deliveryya.dto.paginatedDto.PaginatedUserRequestDto;
import com.kaleox.deliveryya.dto.paginatedDto.PaginatedUserDto;
import com.kaleox.deliveryya.dto.user.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public interface UserService {
    ResponseDto setUser(UserDto dto);

    ResponseDto login(UserDto userDto);

    ResponseDto update(UserDto userDto);

    UserDto getUserById(Integer id);

    ResponseDto getPaginatedCities(PaginatedCityDto paginatedCityDto);

    ResponseDto<List<DistrictDto>> getAllDistricts();

    PaginatedUserDto getPaginatedUsers(PaginatedUserDto paginatedUserDto);

    ResponseDto getUserRoles(Integer userRoleId);

    List<DeliveryDetailDto> getAddressByIdOrUserId(int addressId, Boolean defaultAddress, int userId);

    ResponseDto<DeliveryDetailDto> addAddress(DeliveryDetailsDto dto, Integer userId);

    String saveUserToken(SetUserTokenDto dto, int i);

    List<CommonIdNameDto> getVerificationStatuses(Integer id);

List<CommonIdNameDto> getGenders(Integer id);

    ResponseDto<List<CommonIdNameDto>> getDocTypes(Integer docTypeId);

    ResponseDto<PaginatedUserRequestDto> getUserRequests(PaginatedUserRequestDto paginatedUserRequestDto);

    ResponseDto<UserRequestDto> setUserRequest(SetUserRequestDto dto, Integer userId);

    String deleteUserRequest(Integer userRequestId);

    ResponseDto<UserRequestDto> updateUserRequest(UpdateUserRequestDto dto);

    ResponseDto<VerificationDataDto> updateVerificationDataStatus(UpdateVerificationDataStatusDto dto);

    String dropAddress(@NotNull(message = "Address Id must be provided") @Min(1) Integer addressId, int userId);

    String sendResetPasswordEmail(EmailDto email);

    String resetPassword(ResetPasswordDto dto);

    List<Integer> getAllUserIds(Boolean isActive, Boolean hasMarket, Boolean isEmployee, Boolean isEmailVerified);

    String updateUserRoleOrDelete(Integer actorUserId, UpdateUserRoleOrDeleteDto dto);

    String setUserDocuments(VerificationDataDto dto);

    ResponseDto<List<VerificationDataDto>> getVerificationData(Integer userId, Integer verificationDataId);

    String deleteVerificationData(Integer userId, Integer verificationDataId);

    ResponseDto<List<CommonIdNameDto>> getUserRequestTypes(Integer userRequestTypeId);

    List<UserDataDto> getUserDataByUserId(Integer userId);

    ResponseDto<UserDataDto> addUserData(UserDataDto dto, Integer userId);

    String deleteUserData(Integer userDataId, Integer userId);

    String sendMobileVerificationCode(String mobileNumber, jakarta.servlet.http.HttpServletRequest request);

    ResponseDto<Boolean> verifyMobileCode(String code, jakarta.servlet.http.HttpServletRequest request, Integer userId);

    ResponseDto<ForceDeletePreviewDto> previewForceDeleteUser(@NotNull Integer userId);

    ResponseDto<Void> forceDeleteUser(@Valid ForceDeleteConfirmDto dto);
}
