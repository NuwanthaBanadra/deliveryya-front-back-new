package com.kaleox.deliveryya.service.impl;

import com.kaleox.deliveryya.config.BusinessException;
import com.kaleox.deliveryya.dto.*;
import com.kaleox.deliveryya.dto.customDto.CommonIdNameDto;
import com.kaleox.deliveryya.dto.paginatedDto.PaginatedDeliveryFeesDto;
import com.kaleox.deliveryya.dto.paginatedDto.PaginatedPaymentRecodeDto;
import com.kaleox.deliveryya.entities.*;
import com.kaleox.deliveryya.repo.*;
import com.kaleox.deliveryya.service.PaymentService;
import com.kaleox.deliveryya.service.WalletService;
import com.kaleox.deliveryya.service.specification.DeliveryFeeSpec;
import com.kaleox.deliveryya.service.specification.PaymentRecodeSpec;
import com.kaleox.deliveryya.utill.FileStorageUtil;
import com.kaleox.deliveryya.enums.WalletType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jspecify.annotations.NonNull;
import org.modelmapper.ModelMapper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Slf4j
@Service
@Transactional
@RequiredArgsConstructor
public class PaymentServiceImpl implements PaymentService {

    private static final int PAYMENT_STATUS_PENDING_ID = 1;
    private static final int PAYMENT_STATUS_COMPLETED_ID = 2;
    private static final int VERIFICATION_STATUS_VERIFIED_ID = 1;

    private final PaymentTypeRepo paymentTypeRepo;
    private final PaymentStatusRepo paymentStatusRepo;
    private final DeliveryFeeRepo deliveryFeeRepo;
    private final CityRepo cityRepo;
    private final ModelMapper modelMapper;
    private final OrderRepo orderRepo;
    private final BankDetailRepo bankDetailRepo;
    private final PaymentRecodeRepo paymentRecodeRepo;
    private final PaymentRecordItemsRepo paymentRecordItemsRepo;
    private final UrgentJobRepo urgentJobRepo;
    private final VerificationStatusRepo verificationStatusRepo;
    private final UserRepo userRepo;
    private final FileStorageUtil fileStorageUtil;
    private final AgentJobRepo agentJobRepo;
    private final MarketOrderRepo marketOrderRepo;
    private final PaymentCategoryRepo paymentCategoryRepo;
    private final WalletService walletService;
    private final CompanyWalletRepo companyWalletRepo;
    private final AgentWalletRepo agentWalletRepo;
    private final ClientMarketOwnerWalletRepo clientMarketOwnerWalletRepo;
    private final DeliveryRepo deliveryRepo;
    private final EmployeeRepo employeeRepo;
    private final BranchRepo branchRepo;

    private static @NonNull Map<String, String> getErrorMap(PaymentRecordDto paymentRecordDto) {
        Map<String, String> errorMap = new HashMap<>();
        if (paymentRecordDto.getId() == null || paymentRecordDto.getId() <= 0) {
            errorMap.put("id", "Payment record id must be provided");
        }
        if (paymentRecordDto.getPaymentType() == null || paymentRecordDto.getPaymentType().getId() == null) {
            errorMap.put("paymentType", "Payment type must be provided");
        }
        if (paymentRecordDto.getPaymentRecordItems() == null || paymentRecordDto.getPaymentRecordItems().isEmpty()) {
            errorMap.put("paymentRecordItems", "At least one payment record item is required");
        }
        if (paymentRecordDto.getIsReturn() == null) {
            errorMap.put("isReturn", "isReturn must be provided");
        }
        return errorMap;
    }

    @Override
    public ResponseDto<List<PaymentTypeDto>> getAllPaymentTypes() {
        List<PaymentType> paymentTypes = paymentTypeRepo.findAll();

        List<PaymentTypeDto> paymentTypeDtoList = paymentTypes.stream().map(paymentType -> modelMapper.map(paymentType, PaymentTypeDto.class)).toList();

        return ResponseDto.<List<PaymentTypeDto>>builder().message("Success").desc("Payment types retrieved successfully").object(paymentTypeDtoList).build();
    }

    @Override
    public ResponseDto<List<PaymentStatusDto>> getAllPaymentStatuses(Integer id) {
        List<PaymentStatus> paymentStatuses = (id != null && id != 0) ? List.of(paymentStatusRepo.findById(id).orElseThrow(() -> new BusinessException("Payment status not found", null))) : paymentStatusRepo.findAll();

        List<PaymentStatusDto> dtoList = paymentStatuses.stream().map(ps -> modelMapper.map(ps, PaymentStatusDto.class)).toList();

        return ResponseDto.<List<PaymentStatusDto>>builder().message("Success").desc("Payment statuses retrieved successfully").object(dtoList).build();
    }

    @Override
    public ResponseDto<List<CommonIdNameDto>> getAllPaymentCategories() {
        List<CommonIdNameDto> categories = paymentCategoryRepo.findAll().stream()
                .map(category -> CommonIdNameDto.builder()
                        .id(category.getId())
                        .name(category.getName())
                        .build())
                .toList();

        return ResponseDto.<List<CommonIdNameDto>>builder()
                .message("Success")
                .desc("Payment categories retrieved successfully")
                .object(categories)
                .build();
    }

    @Override
    public ResponseDto<PaginatedDeliveryFeesDto> getDeliveryFees(PaginatedDeliveryFeesDto paginatedDeliveryFeesDto) {
        Pageable pageable = PageRequest.of(paginatedDeliveryFeesDto.getPageNumber(), paginatedDeliveryFeesDto.getCountPerPage(), Sort.by("id").ascending());

        Specification<DeliveryFee> spec = DeliveryFeeSpec.getDeliveryFeeSpecification(paginatedDeliveryFeesDto);

        Page<DeliveryFee> deliveryFees = deliveryFeeRepo.findAll(spec, pageable);

        paginatedDeliveryFeesDto.setTotalCount(deliveryFees.getTotalElements());
        paginatedDeliveryFeesDto.setTotalPages(deliveryFees.getTotalPages());
        paginatedDeliveryFeesDto.setCountPerPage(deliveryFees.getSize());

        List<DeliveryFeeDto> deliveryFeeDtoList = deliveryFees.getContent().stream().map(deliveryFee -> modelMapper.map(deliveryFee, DeliveryFeeDto.class)).toList();

        paginatedDeliveryFeesDto.setItems(deliveryFeeDtoList);

        return ResponseDto.<PaginatedDeliveryFeesDto>builder().status(200).message("Success").desc("Delivery fees fetched successfully.").object(paginatedDeliveryFeesDto).build();
    }

    @Override
    public ResponseDto<DeliveryFeeDto> upsertDeliveryFee(DeliveryFeeUpsertDto deliveryFeeUpsertDto) {
        City city = cityRepo.findById(deliveryFeeUpsertDto.getCityId())
                .orElseThrow(() -> new BusinessException("City not found with id: " + deliveryFeeUpsertDto.getCityId(), null));

        DeliveryFee deliveryFee;

        if (Objects.equals(deliveryFeeUpsertDto.getId(), 0)) {
            deliveryFeeRepo.getDeliveryFeeByCity_Id(deliveryFeeUpsertDto.getCityId()).ifPresent(existing -> {
                throw new BusinessException("Delivery fee already exists for city id: " + deliveryFeeUpsertDto.getCityId(), null);
            });

            deliveryFee = new DeliveryFee();
        } else {
            deliveryFee = deliveryFeeRepo.findById(deliveryFeeUpsertDto.getId())
                    .orElseThrow(() -> new BusinessException("Delivery fee not found with id: " + deliveryFeeUpsertDto.getId(), null));

            Integer existingDeliveryFeeId = deliveryFee.getId();
            deliveryFeeRepo.getDeliveryFeeByCity_Id(deliveryFeeUpsertDto.getCityId()).ifPresent(existing -> {
                if (!Objects.equals(existing.getId(), existingDeliveryFeeId)) {
                    throw new BusinessException("Delivery fee already exists for city id: " + deliveryFeeUpsertDto.getCityId(), null);
                }
            });
        }

        deliveryFee.setCity(city);
        deliveryFee.setFee(deliveryFeeUpsertDto.getFee());
        deliveryFee.setAdditionalFee(deliveryFeeUpsertDto.getAdditionalFee());

        DeliveryFee savedDeliveryFee = deliveryFeeRepo.save(deliveryFee);
        return ResponseDto.<DeliveryFeeDto>builder()
                .status(200)
                .message("Success")
                .desc(Objects.equals(deliveryFeeUpsertDto.getId(), 0) ? "Delivery fee created successfully" : "Delivery fee updated successfully")
                .object(modelMapper.map(savedDeliveryFee, DeliveryFeeDto.class))
                .build();
    }

    @Override
    public String deleteDeliveryFee(Integer id) {
        DeliveryFee deliveryFee = deliveryFeeRepo.findById(id)
                .orElseThrow(() -> new BusinessException("Delivery fee not found with id: " + id, null));

        deliveryFeeRepo.delete(deliveryFee);
        return "Delivery fee deleted successfully";
    }

    @Override
    public DeliveryFeeDto getDeliveryFeeByCityId(Integer id) {
        return modelMapper.map(deliveryFeeRepo.getDeliveryFeeByCity_Id(id).orElseThrow(() -> new BusinessException("Delivery fee not found for city id: " + id, null)), DeliveryFeeDto.class);

    }

    @Override
    public Double getDeliveryCostByCityId(Integer cityId, Double weight) {
        DeliveryFee deliveryFee = deliveryFeeRepo.getDeliveryFeeByCity_Id(cityId).orElseThrow(() -> new BusinessException("Delivery fee not found for city id: " + cityId, null));

        double cost = deliveryFee.getFee();

        if (weight > 1.0) {
            cost += Math.ceil((weight - 1)) * deliveryFee.getAdditionalFee();
        }

        return cost;
    }

    @Override
    public String notifyPaymentDone(String orderCodes) {
        String[] codes = orderCodes.split(",");

        for (String code : codes) {
            orderRepo.findByOrderCode_code(code.trim()).ifPresentOrElse(order -> {
                order.setPaidAmount(order.getCollectivePrice() != null ? order.getCollectivePrice() : 0.0);
                syncOrderPaymentStatus(order);
                orderRepo.save(order);
            }, () -> {
                throw new BusinessException("Order not found for code: " + code, null);
            });
        }

        return "Order Updated Successfully";
    }

    @Override
    public Integer createPaymentRecode(PaymentRecordDto paymentRecordDto) {

        double itemsTotal = paymentRecordDto.getPaymentRecordItems().stream().map(PaymentRecordItemsDto::getAmount)
                .mapToDouble(amount -> amount != null ? amount : 0.0).sum();

        if (paymentRecordDto.getAmount() == null
                || Math.abs(paymentRecordDto.getAmount() - itemsTotal) > 0.0001) {
            throw new BusinessException("Payment record amount must equal the total of payment record items",
                    Map.of("amount", "Amount must equal the sum of all payment record items"));
        }

        for (PaymentRecordItemsDto itemDto : paymentRecordDto.getPaymentRecordItems()) {
            String itemCode = itemDto.getCode() == null ? "" : itemDto.getCode().trim();
            String normalizedCode = itemCode.toUpperCase();

            if (normalizedCode.startsWith("ORD")) {
                orderRepo.findByOrderCode_code(normalizedCode).orElseThrow(() -> new BusinessException("Order not found for code: " + itemCode, null));
            } else if (normalizedCode.startsWith("UJC")) {
                urgentJobRepo.findByJobCode(normalizedCode).orElseThrow(() -> new BusinessException("Urgent job not found for code: " + itemCode, null));
            }

            itemDto.setCode(normalizedCode);
        }

        PaymentType paymentType = paymentTypeRepo.findById(paymentRecordDto.getPaymentType().getId()).orElseThrow(() -> new BusinessException("Payment type not found with id: " + paymentRecordDto.getPaymentType().getId(), null));
        validateWalletOwner(paymentRecordDto);

        // For paymentType=4 (COD handover), validate ORD items before any state changes
        if (paymentType.getId() == 4) {
            // Validate overpayment for all ORD items
            for (PaymentRecordItemsDto itemDto : paymentRecordDto.getPaymentRecordItems()) {
                String itemCode = itemDto.getCode() == null ? "" : itemDto.getCode().trim().toUpperCase();
                if (itemCode.startsWith("ORD")) {
                    validateOverpayment(itemCode, itemDto.getAmount());
                }
            }

            // Validate all ORD items belong to the same agent
            validateSingleAgentForOrdItems(paymentRecordDto.getPaymentRecordItems());
        }

        int verificationStatusId = paymentType.getId() == 4 ? 1 : 3;
        VerificationStatus verificationStatus = verificationStatusRepo.findById(verificationStatusId).orElseThrow(() -> new BusinessException("Verification status not found with id: " + verificationStatusId, null));

        PaymentRecord paymentRecord = modelMapper.map(paymentRecordDto, PaymentRecord.class);
        paymentRecord.setId(null);
        paymentRecord.setPaymentType(paymentType);
        paymentRecord.setVerificationStatus(verificationStatus);
        paymentRecord.setIsReturn(paymentRecordDto.getIsReturn());
        paymentRecord.setFromWallet(paymentRecordDto.getFromWallet());
        paymentRecord.setToWallet(paymentRecordDto.getToWallet());
        paymentRecord.setFromUserId(paymentRecordDto.getFromUserId());
        paymentRecord.setToUserId(paymentRecordDto.getToUserId());
        paymentRecord.setBranchId(paymentRecordDto.getBranchId());

        if (paymentRecordDto.getBranchId() != null) {
            branchRepo.findById(paymentRecordDto.getBranchId())
                    .orElseThrow(() -> new BusinessException("Branch not found with id: " + paymentRecordDto.getBranchId(), null));
        }

        // Move and validate proof file if provided
        if (paymentRecordDto.getProofUrl() != null && !paymentRecordDto.getProofUrl().isEmpty()) {
            String proofUrl = paymentRecordDto.getProofUrl().trim();

            // Allow any file type for proof, but log the file type
            String movedProofUrl = fileStorageUtil.moveFile(proofUrl, "payment-profs");
            if (movedProofUrl == null) {
                throw new BusinessException("Failed to process proof file", Map.of("proofUrl", "Could not process the proof file"));
            }
            paymentRecord.setProofUrl(movedProofUrl);
        }

        applyBankDetail(paymentRecord, paymentRecordDto);

        if (paymentRecordDto.getPaymentCategory() != null && paymentRecordDto.getPaymentCategory().getId() != null) {
            PaymentCategory paymentCategory = paymentCategoryRepo.findById(paymentRecordDto.getPaymentCategory().getId()).orElseThrow(() -> new BusinessException("Payment category not found with id: " + paymentRecordDto.getPaymentCategory().getId(), null));
            paymentRecord.setPaymentCategory(paymentCategory);
        } else {
            paymentRecord.setPaymentCategory(null);
        }

        PaymentRecord savedPaymentRecord = paymentRecodeRepo.saveAndFlush(paymentRecord);

        List<PaymentRecordItems> paymentRecordItems = paymentRecordDto.getPaymentRecordItems().stream().map(itemDto -> {
            PaymentRecordItems item = modelMapper.map(itemDto, PaymentRecordItems.class);
            item.setId(null);
            item.setPaymentRecord(savedPaymentRecord);
            return item;
        }).toList();

        paymentRecordItemsRepo.saveAll(paymentRecordItems);

        if (paymentType.getId() == 4) {
            applyOrderPaidAmountAdjustments(paymentRecordItems, getPaidAmountDirection(paymentRecordDto.getIsReturn()));
            applyOrderCollectivePriceAdjustments(paymentRecordItems, -getPaidAmountDirection(paymentRecordDto.getIsReturn()));
            if (hasWalletDirection(savedPaymentRecord)) {
                applyWalletDirection(savedPaymentRecord, paymentRecordItems, false);
            } else {
                debitAgentWalletForOrdItems(paymentRecordItems, savedPaymentRecord);
                creditCompanyWalletForVerifiedPayment(savedPaymentRecord, paymentRecordItems);
            }
        } else if (isVerifiedVerificationStatus(savedPaymentRecord.getVerificationStatus())
                && hasWalletDirection(savedPaymentRecord)) {
            applyWalletDirection(savedPaymentRecord, paymentRecordItems, false);
        }

        return savedPaymentRecord.getId();
    }

    @Override
    public ResponseDto<PaymentReferenceValidationDto> validatePaymentReference(
            PaymentReferenceValidationRequestDto dto) {
        String code = dto.getCode().trim().toUpperCase(Locale.ROOT);

        if (code.startsWith("ORD")) {
            Order order = orderRepo.findByOrderCode_code(code)
                    .orElseThrow(() -> new BusinessException("Order not found for code: " + code,
                            Map.of("code", "No order exists for this reference")));
            return ResponseDto.<PaymentReferenceValidationDto>builder()
                    .status(200)
                    .message("Success")
                    .desc("Order reference verified")
                    .object(PaymentReferenceValidationDto.builder()
                            .code(code)
                            .type("ORD")
                            .referenceId(order.getId())
                            .label("Order " + code)
                            .build())
                    .build();
        }

        if (code.startsWith("UJC")) {
            UrgentJob urgentJob = urgentJobRepo.findByJobCode(code)
                    .orElseThrow(() -> new BusinessException("Urgent job not found for code: " + code,
                            Map.of("code", "No urgent job exists for this reference")));
            return ResponseDto.<PaymentReferenceValidationDto>builder()
                    .status(200)
                    .message("Success")
                    .desc("Urgent job reference verified")
                    .object(PaymentReferenceValidationDto.builder()
                            .code(code)
                            .type("UJC")
                            .referenceId(urgentJob.getId())
                            .label("Urgent job " + code)
                            .build())
                    .build();
        }

        return ResponseDto.<PaymentReferenceValidationDto>builder()
                .status(200)
                .message("Success")
                .desc("Reference does not require existence verification")
                .object(PaymentReferenceValidationDto.builder()
                        .code(code)
                        .type("OTHER")
                        .referenceId(null)
                        .label(code)
                        .build())
                .build();
    }

    @Override
    public String updatePaymentRecode(PaymentRecordDto paymentRecordDto) {
        Map<String, String> errorMap = getErrorMap(paymentRecordDto);

        if (!errorMap.isEmpty()) {
            throw new BusinessException("Validation failed", errorMap);
        }

        PaymentRecord existingRecord = paymentRecodeRepo.findById(paymentRecordDto.getId()).orElseThrow(() -> new BusinessException("Payment record not found with id: " + paymentRecordDto.getId(), null));

        if (isVerifiedVerificationStatus(existingRecord.getVerificationStatus())) {
            throw new BusinessException("Payment record cannot be updated when verification status is verified", Map.of("verificationStatusId", "Only records that are not verified can be updated"));
        }

        double itemsTotal = paymentRecordDto.getPaymentRecordItems().stream().map(PaymentRecordItemsDto::getAmount).mapToDouble(amount -> amount != null ? amount : 0.0).sum();
        if (paymentRecordDto.getAmount() == null
                || Math.abs(paymentRecordDto.getAmount() - itemsTotal) > 0.0001) {
            throw new BusinessException("Payment record amount must equal the total of payment record items",
                    Map.of("amount", "Amount must equal the sum of all payment record items"));
        }

        for (PaymentRecordItemsDto itemDto : paymentRecordDto.getPaymentRecordItems()) {
            String itemCode = itemDto.getCode() == null ? "" : itemDto.getCode().trim();
            String normalizedCode = itemCode.toUpperCase();

            if (normalizedCode.startsWith("ORD")) {
                orderRepo.findByOrderCode_code(normalizedCode).orElseThrow(() -> new BusinessException("Order not found for code: " + itemCode, null));
            } else if (normalizedCode.startsWith("UJC")) {
                urgentJobRepo.findByJobCode(normalizedCode).orElseThrow(() -> new BusinessException("Urgent job not found for code: " + itemCode, null));
            }

            itemDto.setCode(normalizedCode);
        }

        PaymentType paymentType = paymentTypeRepo.findById(paymentRecordDto.getPaymentType().getId()).orElseThrow(() -> new BusinessException("Payment type not found with id: " + paymentRecordDto.getPaymentType().getId(), null));
        validateWalletOwner(paymentRecordDto);

        List<PaymentRecordItems> previousItems = paymentRecordItemsRepo.findByPaymentRecord_Id(existingRecord.getId());
        if (existingRecord.getPaymentType() != null && Objects.equals(existingRecord.getPaymentType().getId(), 4)) {
            applyOrderPaidAmountAdjustments(previousItems, -getPaidAmountDirection(existingRecord.getIsReturn()));
        }

        existingRecord.setAmount(paymentRecordDto.getAmount());
        existingRecord.setDesc(paymentRecordDto.getDesc());
        existingRecord.setPaymentType(paymentType);
        existingRecord.setIsReturn(Boolean.TRUE.equals(paymentRecordDto.getIsReturn()));
        existingRecord.setFromWallet(paymentRecordDto.getFromWallet());
        existingRecord.setToWallet(paymentRecordDto.getToWallet());
        existingRecord.setFromUserId(paymentRecordDto.getFromUserId());
        existingRecord.setToUserId(paymentRecordDto.getToUserId());
        if (paymentRecordDto.getBranchId() != null) {
            existingRecord.setBranchId(paymentRecordDto.getBranchId());
        }

        // Handle proof file update
        if (paymentRecordDto.getProofUrl() != null && !paymentRecordDto.getProofUrl().isEmpty()) {
            String incomingProof = paymentRecordDto.getProofUrl().trim();
            String existingProof = existingRecord.getProofUrl();

            // Only update if it's different (new file from temporary location)
            if (!Objects.equals(incomingProof, existingProof)) {
                // Move from temporary location if needed
                if (incomingProof.toLowerCase().contains("temporary")) {
                    String movedProofUrl = fileStorageUtil.moveFile(incomingProof, "payment-profs");
                    if (movedProofUrl == null) {
                        throw new BusinessException("Failed to process proof file", Map.of("proofUrl", "Could not process the proof file"));
                    }
                    existingRecord.setProofUrl(movedProofUrl);
                } else {
                    existingRecord.setProofUrl(incomingProof);
                }

                // Delete old proof if exists
                if (existingProof != null && !existingProof.isEmpty()) {
                    scheduleFileDeletion(existingProof);
                }
            }
        } else {
            existingRecord.setProofUrl(null);
        }

        applyBankDetail(existingRecord, paymentRecordDto);

        if (paymentRecordDto.getPaymentCategory() != null && paymentRecordDto.getPaymentCategory().getId() != null) {
            PaymentCategory paymentCategory = paymentCategoryRepo.findById(paymentRecordDto.getPaymentCategory().getId()).orElseThrow(() -> new BusinessException("Payment category not found with id: " + paymentRecordDto.getPaymentCategory().getId(), null));
            existingRecord.setPaymentCategory(paymentCategory);
        } else {
            existingRecord.setPaymentCategory(null);
        }

        PaymentRecord savedRecord = paymentRecodeRepo.save(existingRecord);

        paymentRecordItemsRepo.deleteByPaymentRecord_Id(savedRecord.getId());
        List<PaymentRecordItems> updatedItems = paymentRecordDto.getPaymentRecordItems().stream().map(itemDto -> {
            PaymentRecordItems item = modelMapper.map(itemDto, PaymentRecordItems.class);
            item.setId(null);
            item.setPaymentRecord(savedRecord);
            return item;
        }).toList();
        paymentRecordItemsRepo.saveAll(updatedItems);

        if (Objects.equals(paymentType.getId(), 4)) {
            applyOrderPaidAmountAdjustments(updatedItems, getPaidAmountDirection(paymentRecordDto.getIsReturn()));
        }

        return "Payment record updated successfully";
    }

    private void detachPaymentRecordFromWallets(Integer paymentRecordId) {
        List<CompanyWallet> companyWallets = companyWalletRepo.findByPaymentRecord_Id(paymentRecordId);
        if (!companyWallets.isEmpty()) {
            companyWallets.forEach(wallet -> wallet.setPaymentRecord(null));
            companyWalletRepo.saveAllAndFlush(companyWallets);
        }

        List<AgentWallet> agentWallets = agentWalletRepo.findByPaymentRecord_Id(paymentRecordId);
        if (!agentWallets.isEmpty()) {
            agentWallets.forEach(wallet -> wallet.setPaymentRecord(null));
            agentWalletRepo.saveAllAndFlush(agentWallets);
        }

        List<ClientMarketOwnerWallet> clientWallets = clientMarketOwnerWalletRepo.findByPaymentRecord_Id(paymentRecordId);
        if (!clientWallets.isEmpty()) {
            clientWallets.forEach(wallet -> wallet.setPaymentRecord(null));
            clientMarketOwnerWalletRepo.saveAllAndFlush(clientWallets);
        }
    }

    private void applyBankDetail(PaymentRecord paymentRecord, PaymentRecordDto paymentRecordDto) {
        Integer bankDetailId = paymentRecordDto.getBankDetail() != null
                ? paymentRecordDto.getBankDetail().getId()
                : null;

        if (bankDetailId == null || bankDetailId <= 0) {
            paymentRecord.setBankDetail(null);
            paymentRecord.setBank_id(null);
            return;
        }

        BankDetail bankDetail = bankDetailRepo.findByIdAndIsDeletedFalse(bankDetailId)
                .orElseThrow(() -> new BusinessException("Bank detail not found with id: " + bankDetailId, null));

        if (paymentRecordDto.getBranchId() != null
                && (!Boolean.TRUE.equals(bankDetail.getIsCompany()) || !Boolean.TRUE.equals(bankDetail.getIsActive()))) {
            throw new BusinessException("An active company bank detail is required for branch payment records.", null);
        }

        paymentRecord.setBankDetail(bankDetail);
        paymentRecord.setBank_id(bankDetail.getBank() != null ? bankDetail.getBank().getId() : null);
    }

    private void validateWalletOwner(PaymentRecordDto paymentRecordDto) {
        validateWalletSide("from", paymentRecordDto.getFromWallet(), paymentRecordDto.getFromUserId());
        validateWalletSide("to", paymentRecordDto.getToWallet(), paymentRecordDto.getToUserId());

        if (paymentRecordDto.getFromWallet() == null || paymentRecordDto.getFromWallet() == WalletType.COMPANY) {
            paymentRecordDto.setFromUserId(null);
        }
        if (paymentRecordDto.getToWallet() == null || paymentRecordDto.getToWallet() == WalletType.COMPANY) {
            paymentRecordDto.setToUserId(null);
        }
    }

    private void validateWalletSide(String side, WalletType walletType, Integer userId) {
        if (walletType == null || walletType == WalletType.COMPANY) {
            return;
        }

        if (userId == null || userId <= 0) {
            throw new BusinessException(
                    side + "UserId is required when " + side + "Wallet is not COMPANY",
                    Map.of(side + "UserId", "A valid user id is required for this wallet"));
        }

        User user = userRepo.findById(userId)
                .orElseThrow(() -> new BusinessException("User not found with id: " + userId, null));
        Integer roleId = user.getUserRole() != null ? user.getUserRole().getId() : null;

        if (walletType == WalletType.AGENT && !Objects.equals(roleId, 7)) {
            throw new BusinessException("The selected user is not an agent",
                    Map.of(side + "UserId", "AGENT wallet requires user role 7 (Agent)"));
        }

        if ((walletType == WalletType.CLIENT || walletType == WalletType.CUSTOMER)
                && !Objects.equals(roleId, 5) && !Objects.equals(roleId, 8)) {
            throw new BusinessException("The selected user is not a client or market owner",
                    Map.of(side + "UserId", "CLIENT/CUSTOMER wallet requires user role 5 or 8"));
        }
    }

    private boolean isNonCompanyWallet(WalletType walletType) {
        return walletType != null && walletType != WalletType.COMPANY;
    }

    @Override
    public String updatePaymentVerificationStatusOrDelete(UpdatePaymentVerificationStatusOrDeleteDto dto) {
        boolean deleteRequested = Boolean.TRUE.equals(dto.getIsDeleted());

        if (dto.getVerificationStatusId() == null && !deleteRequested) {
            throw new BusinessException("At least one field is required", Map.of("request", "Provide verificationStatusId or set isDeleted to true"));
        }

        if (dto.getVerificationStatusId() != null && deleteRequested) {
            throw new BusinessException("Invalid request", Map.of("request", "Cannot update verification status and delete in the same request"));
        }

        PaymentRecord paymentRecord = paymentRecodeRepo.findById(dto.getPaymentRecordId()).orElseThrow(() -> new BusinessException("Payment record not found with id: " + dto.getPaymentRecordId(), null));

        if (deleteRequested) {
            List<PaymentRecordItems> existingItems = paymentRecordItemsRepo.findByPaymentRecord_Id(paymentRecord.getId());
            if (paymentRecord.getPaymentType() != null
                    && Objects.equals(paymentRecord.getPaymentType().getId(), 4)
                    && isVerifiedVerificationStatus(paymentRecord.getVerificationStatus())) {
                applyOrderPaidAmountAdjustments(existingItems, -getPaidAmountDirection(paymentRecord.getIsReturn()));
            }

            if (!hasWalletDirection(paymentRecord)
                    && paymentRecord.getPaymentType() != null
                    && Objects.equals(paymentRecord.getPaymentType().getId(), 4)
                    && isVerifiedVerificationStatus(paymentRecord.getVerificationStatus())) {
                // Reverse AgentWallet debit for verified paymentType=4
                reverseAgentWalletDebitForOrdItems(paymentRecord, existingItems);
            }

            // Reverse the collective-price settlement and restore the order payment status.
            if (isVerifiedVerificationStatus(paymentRecord.getVerificationStatus())) {
                applyOrderCollectivePriceAdjustments(existingItems, getPaidAmountDirection(paymentRecord.getIsReturn()));
            }

            // Reverse CompanyWallet credit for verified records (only paymentType=4)
            if (isVerifiedVerificationStatus(paymentRecord.getVerificationStatus()) && hasWalletDirection(paymentRecord)) {
                applyWalletDirection(paymentRecord, existingItems, true);
            } else if (isVerifiedVerificationStatus(paymentRecord.getVerificationStatus()) &&
                    paymentRecord.getPaymentType() != null && Objects.equals(paymentRecord.getPaymentType().getId(), 4)) {
                reverseCompanyWalletCreditForUnverifiedPayment(paymentRecord, existingItems);
            }

            // Reverse Client/MarketOwnerWallet credit for verified records (only paymentType=2)
            if (!hasWalletDirection(paymentRecord) && isVerifiedVerificationStatus(paymentRecord.getVerificationStatus()) &&
                paymentRecord.getPaymentType() != null && Objects.equals(paymentRecord.getPaymentType().getId(), 2)) {
                reverseClientMarketOwnerWalletCreditForUnverifiedPayment(paymentRecord, existingItems);
            }

            detachPaymentRecordFromWallets(paymentRecord.getId());

            paymentRecordItemsRepo.deleteByPaymentRecord_Id(paymentRecord.getId());
            paymentRecodeRepo.delete(paymentRecord);
            paymentRecodeRepo.flush();
            return "Payment record deleted successfully";
        }

        VerificationStatus verificationStatus = verificationStatusRepo.findById(dto.getVerificationStatusId()).orElseThrow(() -> new BusinessException("Verification status not found with id: " + dto.getVerificationStatusId(), null));

        if (Objects.equals(paymentRecord.getVerificationStatus() != null ? paymentRecord.getVerificationStatus().getId() : null, verificationStatus.getId())) {
            return "Payment verification status updated successfully";
        }

         // Determine current and target verification states
        boolean currentVerified = isVerifiedVerificationStatus(paymentRecord.getVerificationStatus());
        boolean targetVerified = isVerifiedVerificationStatus(verificationStatus);

        // Handle payment type 4: adjust paid amount
        if (paymentRecord.getPaymentType() != null && Objects.equals(paymentRecord.getPaymentType().getId(), 4)) {
            List<PaymentRecordItems> existingItems = paymentRecordItemsRepo.findByPaymentRecord_Id(paymentRecord.getId());

            if (currentVerified && !targetVerified) {
                applyOrderPaidAmountAdjustments(existingItems, -getPaidAmountDirection(paymentRecord.getIsReturn()));
            } else if (!currentVerified && targetVerified) {
                applyOrderPaidAmountAdjustments(existingItems, getPaidAmountDirection(paymentRecord.getIsReturn()));
            }
        }

        // Settle or restore the linked order collective amount on verification transitions.
        List<PaymentRecordItems> existingItems = paymentRecordItemsRepo.findByPaymentRecord_Id(paymentRecord.getId());

        if (currentVerified && !targetVerified) {
            applyOrderCollectivePriceAdjustments(existingItems, getPaidAmountDirection(paymentRecord.getIsReturn()));
        } else if (!currentVerified && targetVerified) {
            applyOrderCollectivePriceAdjustments(existingItems, -getPaidAmountDirection(paymentRecord.getIsReturn()));
        }

        // Apply the explicitly selected wallet direction when present.
        if (hasWalletDirection(paymentRecord)) {
            if (!currentVerified && targetVerified) {
                applyWalletDirection(paymentRecord, existingItems, false);
            } else if (currentVerified && !targetVerified) {
                applyWalletDirection(paymentRecord, existingItems, true);
            }
        } else if (paymentRecord.getPaymentType() != null && Objects.equals(paymentRecord.getPaymentType().getId(), 4)) {
            if (!currentVerified && targetVerified) {
                creditCompanyWalletForVerifiedPayment(paymentRecord, existingItems);
            } else if (currentVerified && !targetVerified) {
                reverseCompanyWalletCreditForUnverifiedPayment(paymentRecord, existingItems);
            }
        }

        // Handle Client/MarketOwnerWallet credit/reversal based on verification transition
        // Only applies to paymentType=2 (Bank Transfer - Client/MarketOwner payment)
        if (!hasWalletDirection(paymentRecord) && paymentRecord.getPaymentType() != null && Objects.equals(paymentRecord.getPaymentType().getId(), 2)) {
            if (!currentVerified && targetVerified) {
                // UNVERIFIED → VERIFIED: credit Client/MarketOwnerWallet
                creditClientMarketOwnerWalletForVerifiedPayment(paymentRecord, existingItems);
            } else if (currentVerified && !targetVerified) {
                // VERIFIED → UNVERIFIED: reverse Client/MarketOwnerWallet credit
                reverseClientMarketOwnerWalletCreditForUnverifiedPayment(paymentRecord, existingItems);
            }
        }

        // Legacy agent debit/reversal remains for records without explicit wallet direction.
        if (!hasWalletDirection(paymentRecord) && paymentRecord.getPaymentType() != null && Objects.equals(paymentRecord.getPaymentType().getId(), 4)) {
            if (!currentVerified && targetVerified) {
                // UNVERIFIED → VERIFIED: debit AgentWallet (only for paymentType≠4 since paymentType=4 is created as VERIFIED)
                debitAgentWalletForOrdItems(existingItems, paymentRecord);
            } else if (currentVerified && !targetVerified) {
                // VERIFIED → UNVERIFIED: reverse AgentWallet debit
                reverseAgentWalletDebitForOrdItems(paymentRecord, existingItems);
            }
        }

        paymentRecord.setVerificationStatus(verificationStatus);
        paymentRecodeRepo.save(paymentRecord);
        return "Payment verification status updated successfully";
    }

    @Override
    public ResponseDto<PaginatedPaymentRecodeDto> getPaymentRecodes(PaginatedPaymentRecodeDto paginatedPaymentRecodeDto) {
        Pageable pageable = PageRequest.of(
                paginatedPaymentRecodeDto.getPageNumber(),
                paginatedPaymentRecodeDto.getCountPerPage(),
                Sort.by("id").descending()
        );

        Specification<PaymentRecord> spec = PaymentRecodeSpec.getPaymentRecodeSpecification(paginatedPaymentRecodeDto);
        Page<PaymentRecord> paymentRecordPage = paymentRecodeRepo.findAll(spec, pageable);

        paginatedPaymentRecodeDto.setTotalCount(paymentRecordPage.getTotalElements());
        paginatedPaymentRecodeDto.setTotalPages(paymentRecordPage.getTotalPages());
        paginatedPaymentRecodeDto.setCountPerPage(paymentRecordPage.getSize());

        List<PaymentRecord> paymentRecords = paymentRecordPage.getContent();
        List<Integer> paymentRecordIds = paymentRecords.stream().map(PaymentRecord::getId).filter(Objects::nonNull).toList();

        List<PaymentRecordItems> items = paymentRecordIds.isEmpty()
                ? Collections.emptyList()
                : paymentRecordItemsRepo.findByPaymentRecord_IdIn(paymentRecordIds);

        Map<Integer, List<PaymentRecordItemsDto>> itemsByRecordId = items.stream().collect(Collectors.groupingBy(item -> item.getPaymentRecord().getId(), Collectors.mapping(item -> modelMapper.map(item, PaymentRecordItemsDto.class), Collectors.toList())));

        List<Integer> createdByUserIds = paymentRecords.stream().map(PaymentRecord::getCreatedBy).filter(Objects::nonNull).map(String::trim).filter(value -> value.matches("\\d+")).map(Integer::valueOf).distinct().toList();

        Map<Integer, User> usersById = userRepo.findAllById(createdByUserIds).stream().collect(Collectors.toMap(User::getId, Function.identity()));

        List<PaymentRecordDto> paymentRecordDtos = paymentRecords.stream().map(record -> {
            PaymentRecordDto dto = modelMapper.map(record, PaymentRecordDto.class);
            dto.setPaymentRecordItems(itemsByRecordId.getOrDefault(record.getId(), Collections.emptyList()));
            dto.setPaymentType(toCommon(record.getPaymentType()));
            dto.setBankDetail(toBankDetailDto(record.getBankDetail()));
            dto.setVerificationStatus(toCommon(record.getVerificationStatus()));
            dto.setPaymentCategory(toCommon(record.getPaymentCategory()));
            dto.setMadeBy(resolveMadeBy(record.getCreatedBy(), usersById));
            return dto;
        }).toList();

        paginatedPaymentRecodeDto.setItems(paymentRecordDtos);

        return ResponseDto.<PaginatedPaymentRecodeDto>builder()
                .status(200)
                .message("Success")
                .desc("Payment records fetched successfully")
                .object(paginatedPaymentRecodeDto)
                .build();
    }

    private CommonIdNameDto toCommon(PaymentType paymentType) {
        if (paymentType == null) {
            return null;
        }
        return CommonIdNameDto.builder().id(paymentType.getId()).name(paymentType.getName()).build();
    }

    private BankDetailDto toBankDetailDto(BankDetail bankDetail) {
        if (bankDetail == null) {
            return null;
        }
        return BankDetailDto.builder()
                .id(bankDetail.getId())
                .name(bankDetail.getName())
                .accNumber(bankDetail.getAccNumber())
                .branch(bankDetail.getBranch())
                .bank(bankDetail.getBank() == null ? null : CommonIdNameDto.builder()
                        .id(bankDetail.getBank().getId())
                        .name(bankDetail.getBank().getName())
                        .build())
                .userId(bankDetail.getUser() != null ? bankDetail.getUser().getId() : null)
                .balance(bankDetail.getBalance() != null ? bankDetail.getBalance() : 0.0)
                .isActive(bankDetail.getIsActive())
                .isDeleted(bankDetail.getIsDeleted())
                .build();
    }

    private CommonIdNameDto toCommon(VerificationStatus verificationStatus) {
        if (verificationStatus == null) {
            return null;
        }
        return CommonIdNameDto.builder().id(verificationStatus.getId()).name(verificationStatus.getName()).build();
    }

    private CommonIdNameDto toCommon(PaymentCategory paymentCategory) {
        if (paymentCategory == null) {
            return null;
        }
        return CommonIdNameDto.builder().id(paymentCategory.getId()).name(paymentCategory.getName()).build();
    }

    private String resolveMadeBy(String createdBy, Map<Integer, User> usersById) {
        if (createdBy == null) {
            return null;
        }

        String trimmed = createdBy.trim();
        if (!trimmed.matches("\\d+")) {
            return trimmed;
        }

        User user = usersById.get(Integer.valueOf(trimmed));
        if (user == null) {
            return trimmed;
        }

        return (user.getFirstName() + " " + user.getLastName()).trim();
    }

    private double getPaidAmountDirection(Boolean isReturn) {
        return Boolean.TRUE.equals(isReturn) ? -1.0 : 1.0;
    }

    private void applyOrderPaidAmountAdjustments(List<PaymentRecordItems> items, double multiplier) {
        for (PaymentRecordItems item : items) {
            String itemCode = item.getCode() == null ? "" : item.getCode().trim().toUpperCase();
            if (!itemCode.startsWith("ORD")) {
                continue;
            }

            Order order = orderRepo.findByOrderCode_code(itemCode).orElseThrow(() -> new BusinessException("Order not found for code: " + itemCode, null));
            double existingPaidAmount = order.getPaidAmount() != null ? order.getPaidAmount() : 0.0;
            double itemAmount = item.getAmount() != null ? item.getAmount() : 0.0;
            double updatedPaidAmount = existingPaidAmount + (itemAmount * multiplier);
            order.setPaidAmount(Math.max(0.0, updatedPaidAmount));
            syncOrderPaymentStatus(order);
            orderRepo.save(order);
        }
    }

    /**
     * Deduct or restore the amount settled by a verified payment record.
     * Each item owns the amount applied to its linked order, so multi-order
     * payment records cannot incorrectly complete every order with one total.
     */
    private void applyOrderCollectivePriceAdjustments(List<PaymentRecordItems> items, double multiplier) {
        for (PaymentRecordItems item : items) {
            String itemCode = item.getCode() == null ? "" : item.getCode().trim().toUpperCase();
            if (!itemCode.startsWith("ORD")) {
                continue;
            }

            Order order = orderRepo.findByOrderCode_code(itemCode).orElseThrow(() -> new BusinessException("Order not found for code: " + itemCode, null));

            double existingCollectivePrice = order.getCollectivePrice() != null ? order.getCollectivePrice() : 0.0;
            double itemAmount = item.getAmount() != null ? item.getAmount() : 0.0;
            double updatedCollectivePrice = existingCollectivePrice + (itemAmount * multiplier);
            order.setCollectivePrice(updatedCollectivePrice);

            if (multiplier < 0 && updatedCollectivePrice <= 0) {
                order.setPaymentStatus(PaymentStatus.builder().id(PAYMENT_STATUS_COMPLETED_ID).build());
            } else if (multiplier > 0) {
                syncOrderPaymentStatus(order);
            }

            orderRepo.save(order);
        }
    }

    private void syncOrderPaymentStatus(Order order) {
        if (order == null || order.getCollectivePrice() == null) {
            return;
        }

        order.setPaymentStatus(PaymentStatus.builder().id(order.getPaidAmount() >= order.getCollectivePrice() ? PAYMENT_STATUS_COMPLETED_ID : PAYMENT_STATUS_PENDING_ID).build());
    }

    private boolean isVerifiedVerificationStatus(VerificationStatus verificationStatus) {
        if (verificationStatus == null) {
            return false;
        }

        if (Objects.equals(verificationStatus.getId(), VERIFICATION_STATUS_VERIFIED_ID)) {
            return true;
        }

        String verificationStatusName = verificationStatus.getName();
        return verificationStatusName != null && "verified".equalsIgnoreCase(verificationStatusName.trim());
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

    private boolean hasWalletDirection(PaymentRecord paymentRecord) {
        return paymentRecord.getFromWallet() != null || paymentRecord.getToWallet() != null;
    }

    private void applyWalletDirection(PaymentRecord paymentRecord, List<PaymentRecordItems> items, boolean reversal) {
        double amount = paymentRecord.getAmount() != null ? paymentRecord.getAmount() : 0.0;
        if (amount <= 0) {
            throw new BusinessException("Wallet transfer amount must be greater than zero", null);
        }

        applyWalletSide(paymentRecord, items, paymentRecord.getFromWallet(), amount,
                true, reversal, "FROM");
        applyWalletSide(paymentRecord, items, paymentRecord.getToWallet(), amount,
                false, reversal, "TO");
    }

    private void applyWalletSide(PaymentRecord paymentRecord, List<PaymentRecordItems> items,
                                 WalletType walletType, double amount, boolean expense,
                                 boolean reversal, String side) {
        if (walletType == null) {
            return;
        }

        WalletType effectiveWalletType = walletType;
        boolean effectiveExpense = reversal ? !expense : expense;
        String ref = "PAYMENT_RECORD_WALLET:" + paymentRecord.getId() + ":" + side
                + (reversal ? ":REVERSAL" : "");

        if (walletOperationExists(effectiveWalletType, ref)) {
            return;
        }

        WalletOperationDto operation = WalletOperationDto.builder()
                .amount(amount)
                .isExpense(effectiveExpense)
                .paymentCategoryId(paymentRecord.getPaymentCategory() != null ? paymentRecord.getPaymentCategory().getId() : null)
                .paymentStatusId(PAYMENT_STATUS_COMPLETED_ID)
                .paymentRecordId(paymentRecord.getId())
                .branchId(paymentRecord.getBranchId())
                .code(items != null && items.size() == 1 ? items.get(0).getCode() : null)
                .ref(ref)
                .note((reversal ? "Reversal of " : "") + "PaymentRecord " + side.toLowerCase() + " wallet transfer")
                .build();

        switch (effectiveWalletType) {
            case COMPANY -> walletService.createCompanyWalletOperation(operation);
            case AGENT -> walletService.createAgentWalletOperation(
                    resolveWalletUserId(paymentRecord, WalletType.AGENT, items, side), operation);
            case CLIENT, CUSTOMER -> walletService.createClientMarketOwnerWalletOperation(
                    resolveWalletUserId(paymentRecord, effectiveWalletType, items, side), operation);
        }
    }

    private boolean walletOperationExists(WalletType walletType, String ref) {
        return switch (walletType) {
            case COMPANY -> companyWalletRepo.findByRef(ref).isPresent();
            case AGENT -> agentWalletRepo.findByRef(ref).isPresent();
            case CLIENT, CUSTOMER -> clientMarketOwnerWalletRepo.findByRef(ref).isPresent();
        };
    }

    private Integer resolveWalletUserId(PaymentRecord paymentRecord, WalletType walletType,
                                        List<PaymentRecordItems> items, String side) {
        Integer explicitUserId = "FROM".equals(side)
                ? paymentRecord.getFromUserId()
                : paymentRecord.getToUserId();
        if (explicitUserId != null) {
            return explicitUserId;
        }

        if (items == null) {
            throw new BusinessException("Payment record items are required to resolve the wallet owner", null);
        }

        for (PaymentRecordItems item : items) {
            String code = item.getCode() == null ? "" : item.getCode().trim().toUpperCase();
            if (!code.startsWith("ORD")) {
                continue;
            }

            if (walletType == WalletType.AGENT) {
                return resolveResponsibleAgentForOrder(code);
            }

            Order order = orderRepo.findByOrderCode_code(code)
                    .orElseThrow(() -> new BusinessException("Order not found for code: " + code, null));
            if (order.getMarketOrder() != null && order.getMarketOrder().getUser() != null) {
                return order.getMarketOrder().getUser().getId();
            }
            if (order.getOrderCode() != null && order.getOrderCode().getUsers() != null) {
                return order.getOrderCode().getUsers().getId();
            }
        }

        throw new BusinessException("Unable to resolve " + walletType.name().toLowerCase() + " wallet owner from payment items", null);
    }

    private void creditCompanyWalletForVerifiedPayment(PaymentRecord paymentRecord, List<PaymentRecordItems> items) {
        String idempotencyRef = "PAYMENT_RECORD:" + paymentRecord.getId();
        String reversalRef = "PAYMENT_RECORD_REVERSAL:" + paymentRecord.getId();

        // Check if this PaymentRecord has already been credited in the current verification cycle
        // (credit exists but reversal does not exist = current cycle already credited)
        boolean creditExists = companyWalletRepo.findByRef(idempotencyRef).isPresent();
        boolean reversalExists = companyWalletRepo.findByRef(reversalRef).isPresent();

        if (creditExists && !reversalExists) {
            log.info("PaymentRecord {} already credited in current verification cycle, skipping", paymentRecord.getId());
            return;
        }

        // If credit exists with reversal, this is a new verification cycle after reversal
        // Allow new credit (the old credit was already reversed)

        // Determine code: use single code if only one item, otherwise null
        String code = null;
        if (items != null && items.size() == 1) {
            code = items.get(0).getCode();
        }

        // Build wallet operation DTO
        WalletOperationDto walletOperation = WalletOperationDto.builder()
                .amount(paymentRecord.getAmount() != null ? paymentRecord.getAmount() : 0.0)
                .isExpense(Boolean.TRUE.equals(paymentRecord.getIsReturn()))
                .paymentCategoryId(paymentRecord.getPaymentCategory() != null ? paymentRecord.getPaymentCategory().getId() : null)
                .paymentStatusId(PAYMENT_STATUS_COMPLETED_ID)
                .paymentRecordId(paymentRecord.getId())
                .branchId(paymentRecord.getBranchId())
                .code(code)
                .ref(idempotencyRef)
                .toOrFrom(null)
                .note("Verified PaymentRecord credit")
                .build();

        // Create CompanyWallet operation
        walletService.createCompanyWalletOperation(walletOperation);
        log.info("Credited CompanyWallet for verified PaymentRecord {}, amount: {}", paymentRecord.getId(), paymentRecord.getAmount());
    }

    private void reverseCompanyWalletCreditForUnverifiedPayment(PaymentRecord paymentRecord, List<PaymentRecordItems> items) {
        String reversalRef = "PAYMENT_RECORD_REVERSAL:" + paymentRecord.getId();

        // Check if this PaymentRecord has already been reversed
        if (companyWalletRepo.findByRef(reversalRef).isPresent()) {
            log.info("PaymentRecord {} already reversed in CompanyWallet, skipping", paymentRecord.getId());
            return;
        }

        // Determine code: use single code if only one item, otherwise null
        String code = null;
        if (items != null && items.size() == 1) {
            code = items.get(0).getCode();
        }

        // Build reversal wallet operation DTO
        WalletOperationDto walletOperation = WalletOperationDto.builder()
                .amount(paymentRecord.getAmount() != null ? paymentRecord.getAmount() : 0.0)
                .isExpense(true)
                .paymentCategoryId(paymentRecord.getPaymentCategory() != null ? paymentRecord.getPaymentCategory().getId() : null)
                .paymentStatusId(PAYMENT_STATUS_COMPLETED_ID)
                .paymentRecordId(paymentRecord.getId())
                .branchId(paymentRecord.getBranchId())
                .code(code)
                .ref(reversalRef)
                .toOrFrom(null)
                .note("Reversal of verified PaymentRecord credit")
                .build();

        // Create CompanyWallet operation (debit)
        walletService.createCompanyWalletOperation(walletOperation);
        log.info("Reversed CompanyWallet credit for unverified PaymentRecord {}, amount: {}", paymentRecord.getId(), paymentRecord.getAmount());
    }

    /**
     * Resolve the responsible agent (User.id) for an ORD item.
     * Path: Order → Delivery → Employee → User
     * Returns the most recent delivery's agent.
     */
    private Integer resolveResponsibleAgentForOrder(String orderCode) {
        Order order = orderRepo.findByOrderCode_code(orderCode)
                .orElseThrow(() -> new BusinessException("Order not found for code: " + orderCode, null));

        List<Delivery> deliveries = deliveryRepo.findAllByOrdersOrderByCreatedAtDesc(order);
        if (deliveries.isEmpty()) {
            throw new BusinessException("No delivery found for order: " + orderCode + ". Cannot determine responsible agent.", null);
        }

        Delivery mostRecentDelivery = deliveries.get(0);
        if (mostRecentDelivery.getEmployees() == null) {
            throw new BusinessException("No agent assigned to delivery for order: " + orderCode, null);
        }

        Employee employee = mostRecentDelivery.getEmployees();
        if (employee.getUsers() == null) {
            throw new BusinessException("No user associated with agent for order: " + orderCode, null);
        }

        return employee.getUsers().getId();
    }

    /**
     * Validate that adding the payment amount will not cause overpayment.
     * existingPaidAmount + itemAmount <= collectivePrice
     */
    private void validateOverpayment(String orderCode, double itemAmount) {
        Order order = orderRepo.findByOrderCode_code(orderCode)
                .orElseThrow(() -> new BusinessException("Order not found for code: " + orderCode, null));

        double existingPaidAmount = order.getPaidAmount() != null ? order.getPaidAmount() : 0.0;
        double collectivePrice = order.getCollectivePrice() != null ? order.getCollectivePrice() : 0.0;
        double resultingPaidAmount = existingPaidAmount + itemAmount;

        if (resultingPaidAmount > collectivePrice) {
            Map<String, String> errorDetails = Map.of(
                    "orderCode", orderCode,
                    "collectivePrice", String.valueOf(collectivePrice),
                    "currentPaidAmount", String.valueOf(existingPaidAmount),
                    "attemptedPaymentAmount", String.valueOf(itemAmount),
                    "resultingPaidAmount", String.valueOf(resultingPaidAmount)
            );
            throw new BusinessException("Payment amount would exceed collective price. Overpayment not allowed.", errorDetails);
        }
    }

    /**
     * Check if all ORD items in a PaymentRecord belong to the same agent.
     * Returns the common agent ID if all items belong to the same agent.
     * Throws BusinessException if items belong to different agents.
     * Returns null if there are no ORD items.
     */
    private Integer validateSingleAgentForOrdItems(List<PaymentRecordItemsDto> itemDtos) {
        Integer commonAgentId = null;

        for (PaymentRecordItemsDto itemDto : itemDtos) {
            String itemCode = itemDto.getCode() == null ? "" : itemDto.getCode().trim().toUpperCase();
            if (!itemCode.startsWith("ORD")) {
                continue; // Skip non-ORD items (UJC)
            }

            Integer itemAgentId = resolveResponsibleAgentForOrder(itemCode);

            if (commonAgentId == null) {
                commonAgentId = itemAgentId;
            } else if (!commonAgentId.equals(itemAgentId)) {
                throw new BusinessException(
                        "PaymentRecord contains ORD items belonging to different agents. " +
                                "All ORD items must belong to the same agent for COD handover.",
                        Map.of("conflictingAgents", "ORD items have different responsible agents")
                );
            }
        }

        return commonAgentId;
    }

    /**
     * Debit AgentWallet for ORD PaymentRecordItems when paymentType=4 PaymentRecord is created/verified.
     */
    private void debitAgentWalletForOrdItems(List<PaymentRecordItems> items, PaymentRecord paymentRecord) {
        for (PaymentRecordItems item : items) {
            String itemCode = item.getCode() == null ? "" : item.getCode().trim().toUpperCase();
            if (!itemCode.startsWith("ORD")) {
                continue; // Skip non-ORD items (UJC)
            }

            String idempotencyRef = "PAYMENT_RECORD_ITEM:" + item.getId();
            String reversalRef = "PAYMENT_RECORD_ITEM_REVERSAL:" + item.getId();

            // Check if this item has already been debited in the current cycle
            boolean debitExists = agentWalletRepo.findByRef(idempotencyRef).isPresent();
            boolean reversalExists = agentWalletRepo.findByRef(reversalRef).isPresent();

            // If debit exists but reversal does not exist, already debited in current cycle
            if (debitExists && !reversalExists) {
                log.info("PaymentRecordItem {} already debited in AgentWallet, skipping", item.getId());
                continue;
            }

            // If reversal exists, this is a re-verification cycle, allow new debit
            if (reversalExists) {
                log.info("PaymentRecordItem {} was previously reversed, allowing new debit", item.getId());
            }

            // Resolve responsible agent
            Integer agentId = resolveResponsibleAgentForOrder(itemCode);

            // Build wallet operation DTO
            WalletOperationDto walletOperation = WalletOperationDto.builder()
                    .amount(item.getAmount() != null ? item.getAmount() : 0.0)
                    .isExpense(true) // Debit
                    .paymentCategoryId(paymentRecord.getPaymentCategory() != null ? paymentRecord.getPaymentCategory().getId() : null)
                    .paymentStatusId(PAYMENT_STATUS_COMPLETED_ID)
                    .paymentRecordId(paymentRecord.getId())
                    .branchId(paymentRecord.getBranchId())
                    .code(itemCode)
                    .ref(idempotencyRef)
                    .toOrFrom(null)
                    .note("COD handover debit for PaymentRecordItem: " + itemCode)
                    .otherReason(null)
                    .build();

            // Create AgentWallet operation
            walletService.createAgentWalletOperation(agentId, walletOperation);
            log.info("Debited AgentWallet for agent {}, PaymentRecordItem {}, amount: {}", agentId, item.getId(), item.getAmount());
        }
    }

    /**
     * Credit Client/MarketOwnerWallet for verified PaymentRecordItems.
     * Only applies to ORD items (orders). UJC items are not supported.
     * For market orders: credits MarketOrder.user
     * For direct client orders: credits Order.orderCode.users
     */
    private void creditClientMarketOwnerWalletForVerifiedPayment(PaymentRecord paymentRecord, List<PaymentRecordItems> items) {
        for (PaymentRecordItems item : items) {
            String itemCode = item.getCode() == null ? "" : item.getCode().trim().toUpperCase();
            if (!itemCode.startsWith("ORD")) {
                continue; // Skip non-ORD items (UJC not supported for this flow)
            }

            String idempotencyRef = "PAYMENT_RECORD_ITEM_CLIENT:" + item.getId();
            String reversalRef = "PAYMENT_RECORD_ITEM_CLIENT_REVERSAL:" + item.getId();

            // Check if this item has already been credited in the current cycle
            boolean creditExists = clientMarketOwnerWalletRepo.findByRef(idempotencyRef).isPresent();
            boolean reversalExists = clientMarketOwnerWalletRepo.findByRef(reversalRef).isPresent();

            if (creditExists && !reversalExists) {
                log.info("PaymentRecordItem {} already credited in ClientMarketOwnerWallet, skipping", item.getId());
                continue;
            }

            // If credit exists with reversal, this is a new verification cycle after reversal
            // Allow new credit (the old credit was already reversed)

            // Resolve wallet owner (user)
            Order order = orderRepo.findByOrderCode_code(itemCode)
                    .orElseThrow(() -> new BusinessException("Order not found for code: " + itemCode, null));

            Integer walletOwnerId = null;
            if (order.getMarketOrder() != null && order.getMarketOrder().getUser() != null) {
                // Market order: credit market owner
                walletOwnerId = order.getMarketOrder().getUser().getId();
            } else if (order.getOrderCode() != null && order.getOrderCode().getUsers() != null) {
                // Direct client order: credit the order code user
                walletOwnerId = order.getOrderCode().getUsers().getId();
            } else {
                log.warn("Cannot resolve wallet owner for order {}: no market order or order code user", itemCode);
                continue; // Skip this item - no valid wallet owner
            }

            // Build wallet operation DTO
            WalletOperationDto walletOperation = WalletOperationDto.builder()
                    .amount(item.getAmount() != null ? item.getAmount() : 0.0)
                    .isExpense(Boolean.TRUE.equals(paymentRecord.getIsReturn())) // Expense or credit by payment kind
                    .paymentCategoryId(paymentRecord.getPaymentCategory() != null ? paymentRecord.getPaymentCategory().getId() : null)
                    .paymentStatusId(PAYMENT_STATUS_COMPLETED_ID)
                    .paymentRecordId(paymentRecord.getId())
                    .branchId(paymentRecord.getBranchId())
                    .code(itemCode)
                    .ref(idempotencyRef)
                    .toOrFrom(null)
                    .note("Verified PaymentRecord credit for order: " + itemCode)
                    .otherReason(null)
                    .build();

            // Create ClientMarketOwnerWallet operation
            walletService.createClientMarketOwnerWalletOperation(walletOwnerId, walletOperation);
            log.info("Credited ClientMarketOwnerWallet for user {}, PaymentRecordItem {}, amount: {}", walletOwnerId, item.getId(), item.getAmount());
        }
    }

    /**
     * Reverse ClientMarketOwnerWallet credit for unverified PaymentRecordItems.
     */
    private void reverseClientMarketOwnerWalletCreditForUnverifiedPayment(PaymentRecord paymentRecord, List<PaymentRecordItems> items) {
        for (PaymentRecordItems item : items) {
            String itemCode = item.getCode() == null ? "" : item.getCode().trim().toUpperCase();
            if (!itemCode.startsWith("ORD")) {
                continue; // Skip non-ORD items (UJC not supported for this flow)
            }

            String reversalRef = "PAYMENT_RECORD_ITEM_CLIENT_REVERSAL:" + item.getId();

            // Check if this item has already been reversed
            if (clientMarketOwnerWalletRepo.findByRef(reversalRef).isPresent()) {
                log.info("PaymentRecordItem {} already reversed in ClientMarketOwnerWallet, skipping", item.getId());
                continue;
            }

            // Resolve wallet owner (user)
            Order order = orderRepo.findByOrderCode_code(itemCode)
                    .orElseThrow(() -> new BusinessException("Order not found for code: " + itemCode, null));

            Integer walletOwnerId = null;
            if (order.getMarketOrder() != null && order.getMarketOrder().getUser() != null) {
                walletOwnerId = order.getMarketOrder().getUser().getId();
            } else if (order.getOrderCode() != null && order.getOrderCode().getUsers() != null) {
                walletOwnerId = order.getOrderCode().getUsers().getId();
            } else {
                log.warn("Cannot resolve wallet owner for order {}: no market order or order code user", itemCode);
                continue;
            }

            // Build reversal wallet operation DTO (debit to reverse credit)
            WalletOperationDto walletOperation = WalletOperationDto.builder()
                    .amount(item.getAmount() != null ? item.getAmount() : 0.0)
                    .isExpense(true) // Debit to reverse credit
                    .paymentCategoryId(paymentRecord.getPaymentCategory() != null ? paymentRecord.getPaymentCategory().getId() : null)
                    .paymentStatusId(PAYMENT_STATUS_COMPLETED_ID)
                    .paymentRecordId(paymentRecord.getId())
                    .branchId(paymentRecord.getBranchId())
                    .code(itemCode)
                    .ref(reversalRef)
                    .toOrFrom(null)
                    .note("Reversal of verified PaymentRecord credit for order: " + itemCode)
                    .otherReason(null)
                    .build();

            // Create ClientMarketOwnerWallet operation
            walletService.createClientMarketOwnerWalletOperation(walletOwnerId, walletOperation);
            log.info("Reversed ClientMarketOwnerWallet credit for user {}, PaymentRecordItem {}, amount: {}", walletOwnerId, item.getId(), item.getAmount());
        }
    }

    /**
     * Reverse AgentWallet debit for ORD PaymentRecordItems when PaymentRecord transitions VERIFIED → UNVERIFIED.
     */
    private void reverseAgentWalletDebitForOrdItems(PaymentRecord paymentRecord, List<PaymentRecordItems> items) {
        for (PaymentRecordItems item : items) {
            String itemCode = item.getCode() == null ? "" : item.getCode().trim().toUpperCase();
            if (!itemCode.startsWith("ORD")) {
                continue; // Skip non-ORD items (UJC)
            }

            String reversalRef = "PAYMENT_RECORD_ITEM_REVERSAL:" + item.getId();

            // Check if this item has already been reversed
            if (agentWalletRepo.findByRef(reversalRef).isPresent()) {
                log.info("PaymentRecordItem {} already reversed in AgentWallet, skipping", item.getId());
                continue;
            }

            // Resolve responsible agent
            Integer agentId = resolveResponsibleAgentForOrder(itemCode);

            // Build reversal wallet operation DTO (credit to reverse debit)
            WalletOperationDto walletOperation = WalletOperationDto.builder()
                    .amount(item.getAmount() != null ? item.getAmount() : 0.0)
                    .isExpense(false) // Credit to reverse debit
                    .paymentCategoryId(paymentRecord.getPaymentCategory() != null ? paymentRecord.getPaymentCategory().getId() : null)
                    .paymentStatusId(PAYMENT_STATUS_COMPLETED_ID)
                    .paymentRecordId(paymentRecord.getId())
                    .branchId(paymentRecord.getBranchId())
                    .code(itemCode)
                    .ref(reversalRef)
                    .toOrFrom(null)
                    .note("Reversal of COD handover debit for PaymentRecordItem: " + itemCode)
                    .otherReason(null)
                    .build();

            // Create AgentWallet operation
            walletService.createAgentWalletOperation(agentId, walletOperation);
            log.info("Reversed AgentWallet debit for agent {}, PaymentRecordItem {}, amount: {}", agentId, item.getId(), item.getAmount());
        }
    }
}
