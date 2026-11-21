package com.kaleox.deliveryya.service;

import com.kaleox.deliveryya.dto.DeliveryFeeDto;
import com.kaleox.deliveryya.dto.DeliveryFeeUpsertDto;
import com.kaleox.deliveryya.dto.PaymentRecordDto;
import com.kaleox.deliveryya.dto.PaymentReferenceValidationDto;
import com.kaleox.deliveryya.dto.PaymentReferenceValidationRequestDto;
import com.kaleox.deliveryya.dto.PaymentStatusDto;
import com.kaleox.deliveryya.dto.PaymentTypeDto;
import com.kaleox.deliveryya.dto.ResponseDto;
import com.kaleox.deliveryya.dto.UpdatePaymentVerificationStatusOrDeleteDto;
import com.kaleox.deliveryya.dto.customDto.CommonIdNameDto;
import com.kaleox.deliveryya.dto.paginatedDto.PaginatedDeliveryFeesDto;
import com.kaleox.deliveryya.dto.paginatedDto.PaginatedPaymentRecodeDto;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public interface PaymentService {
    ResponseDto<List<PaymentTypeDto>> getAllPaymentTypes();

    ResponseDto<List<PaymentStatusDto>> getAllPaymentStatuses(Integer id);

    ResponseDto<List<CommonIdNameDto>> getAllPaymentCategories();

    ResponseDto<PaginatedDeliveryFeesDto> getDeliveryFees(PaginatedDeliveryFeesDto paginatedDeliveryFeesDto);

    ResponseDto<DeliveryFeeDto> upsertDeliveryFee(DeliveryFeeUpsertDto deliveryFeeUpsertDto);

    String deleteDeliveryFee(Integer id);

    DeliveryFeeDto getDeliveryFeeByCityId(Integer id);

    Double getDeliveryCostByCityId(Integer id, Double weight);

    String notifyPaymentDone(@NotNull String orderCodes);

    Integer createPaymentRecode(PaymentRecordDto paymentRecordDto);

    ResponseDto<PaymentReferenceValidationDto> validatePaymentReference(PaymentReferenceValidationRequestDto dto);

    String updatePaymentRecode(PaymentRecordDto paymentRecordDto);

    String updatePaymentVerificationStatusOrDelete(UpdatePaymentVerificationStatusOrDeleteDto dto);

    ResponseDto<PaginatedPaymentRecodeDto> getPaymentRecodes(PaginatedPaymentRecodeDto paginatedPaymentRecodeDto);
}
