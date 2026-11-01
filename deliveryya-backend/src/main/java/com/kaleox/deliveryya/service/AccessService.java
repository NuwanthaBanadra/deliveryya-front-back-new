package com.kaleox.deliveryya.service;


import com.kaleox.deliveryya.dto.ResponseDto;
import com.kaleox.deliveryya.dto.paginatedDto.PaginatedApiDto;
import com.kaleox.deliveryya.dto.paginatedDto.PaginatedGrantedAccessesDto;
import com.kaleox.deliveryya.dto.paginatedDto.PaginatedGrantedUsersDto;
import com.kaleox.deliveryya.dto.user.*;
import com.kaleox.deliveryya.dto.customDto.CommonIdNameDto;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;

import java.util.List;
import java.util.Set;

public interface AccessService {
    ResponseDto<PaginatedGrantedAccessesDto> getAllAccesses(PaginatedGrantedAccessesDto dto);

    ResponseDto<PaginatedApiDto> getAllApis(PaginatedApiDto dto);

    ResponseDto<PaginatedGrantedUsersDto> getAllAccessGrantedUsers(PaginatedGrantedUsersDto dto);


    List<AccessHasUserRoleDto> getGrantedAccesses(Integer userRoleId);

    String grantAccessToUserRole(UpdateAccessDto dto);

    String grantAccessToUser(GrantAccessToUserDto dto);

    List<UserHasAccessDto> getGrantedAccessesByUserId(@Valid @Min(1) Integer userId);

    Integer createAccess(CreateAccessRequestDto dto);

    String setAccess(SetAccessRequestDto dto);

    String linkAccessWithApi(LinkAccessWithApiRequestDto dto);

    String removeApiFeaturesForApi(RemoveApiFeaturesForApiRequestDto dto);

    String setApiFeaturesForApi(SetApiFeaturesForApiRequestDto dto);

    List<CommonIdNameDto> getAccessTypes(Integer accessTypeId);

    List<ApiFeatureDto> getApiFeatures(Integer apiFeatureId, Integer apiId);

    Set<Integer> getAccessDetailsByUser(Integer userId);

    Set<Integer> getFullAccessDetailsByUser(List<Integer> accessIds);
}
