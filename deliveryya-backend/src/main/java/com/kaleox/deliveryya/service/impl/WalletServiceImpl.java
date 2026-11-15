package com.kaleox.deliveryya.service.impl;

import com.kaleox.deliveryya.config.BusinessException;
import com.kaleox.deliveryya.dto.ResponseDto;
import com.kaleox.deliveryya.dto.WalletOperationDto;
import com.kaleox.deliveryya.dto.WalletRecordDto;
import com.kaleox.deliveryya.dto.customDto.CommonIdNameDto;
import com.kaleox.deliveryya.dto.paginatedDto.PaginatedWalletHistoryDto;
import com.kaleox.deliveryya.entities.*;
import com.kaleox.deliveryya.repo.*;
import com.kaleox.deliveryya.service.WalletService;
import com.kaleox.deliveryya.service.specification.WalletHistorySpec;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.modelmapper.ModelMapper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Transactional
@RequiredArgsConstructor
@Slf4j
public class WalletServiceImpl implements WalletService {

    private final AgentWalletRepo agentWalletRepo;
    private final ClientMarketOwnerWalletRepo clientMarketOwnerWalletRepo;
    private final CompanyWalletRepo companyWalletRepo;
    private final UserRepo userRepo;
    private final PaymentCategoryRepo paymentCategoryRepo;
    private final PaymentStatusRepo paymentStatusRepo;
    private final ModelMapper modelMapper;

    @Override
    public Double getAgentWalletCurrentBalance(Integer agentId) {
        validateAgentId(agentId);
        return agentWalletRepo.findLatestIdByAgentId(agentId)
                .flatMap(agentWalletRepo::findById)
                .map(AgentWallet::getBalance)
                .orElseThrow(() -> new BusinessException("No active AgentWallet found. Please initialize the agent wallet first.", null));
    }

    @Override
    public Double getClientMarketOwnerWalletCurrentBalance(Integer userId) {
        validateUserId(userId);
        return clientMarketOwnerWalletRepo.findLatestIdByUserId(userId)
                .flatMap(clientMarketOwnerWalletRepo::findById)
                .map(ClientMarketOwnerWallet::getBalance)
                .orElseThrow(() -> new BusinessException("No active ClientMarketOwnerWallet found for user id: " + userId + ". Please initialize the wallet first.", null));
    }

    @Override
    public Double getCompanyWalletCurrentBalance() {
        return companyWalletRepo.findLatestActiveId()
                .flatMap(companyWalletRepo::findById)
                .map(CompanyWallet::getBalance)
                .orElseThrow(() -> new BusinessException("No active CompanyWallet found. Please initialize the company wallet first.", null));
    }

    @Override
    @Transactional
    public WalletRecordDto createAgentWalletOperation(Integer agentId, WalletOperationDto operation) {
        validateAgentId(agentId);
        validateOperation(operation);

        User agent = userRepo.findById(agentId)
                .orElseThrow(() -> new BusinessException("Agent user not found with id: " + agentId, null));

        // Check if wallet is active
        AgentWallet activeWallet = agentWalletRepo.findByAgent_IdAndIsActiveTrue(agentId)
                .orElseThrow(() -> new BusinessException("No active AgentWallet found. Please initialize the agent wallet first.", null));

        if (!activeWallet.getIsActive()) {
            throw new BusinessException("AgentWallet is deactivated. Cannot create operations on deactivated wallet.", null);
        }

        Double previousBalance = getAgentWalletCurrentBalance(agentId);
        Double newBalance = calculateNewBalance(previousBalance, operation.getAmount(), operation.getIsExpense());

        if (newBalance < 0) {
            throw new BusinessException("Insufficient balance. Debit operation would result in negative balance.",
                    Map.of("currentBalance", String.valueOf(previousBalance),
                           "debitAmount", String.valueOf(operation.getAmount()),
                           "resultingBalance", String.valueOf(newBalance)));
        }

        PaymentCategory paymentCategory = resolvePaymentCategory(operation.getPaymentCategoryId());
        PaymentStatus paymentStatus = resolvePaymentStatus(operation.getPaymentStatusId());

        AgentWallet walletRecord = AgentWallet.builder()
                .agent(agent)
                .balance(newBalance)
                .isActive(true)
                .isExpense(operation.getIsExpense())
                .paymentCategory(paymentCategory)
                .paymentStatus(paymentStatus)
                .code(operation.getCode())
                .ref(operation.getRef())
                .otherReason(operation.getOtherReason())
                .note(operation.getNote())
                .toOrFrom(operation.getToOrFrom())
                .build();

        AgentWallet saved = agentWalletRepo.save(walletRecord);
        log.info("Created agent wallet operation for agent id: {}, amount: {}, new balance: {}", agentId, operation.getAmount(), newBalance);

        return mapToWalletRecordDto(saved);
    }

    @Override
    @Transactional
    public WalletRecordDto createClientMarketOwnerWalletOperation(Integer userId, WalletOperationDto operation) {
        validateUserId(userId);
        validateOperation(operation);

        User user = userRepo.findById(userId)
                .orElseThrow(() -> new BusinessException("User not found with id: " + userId, null));

        // Check if wallet is active
        ClientMarketOwnerWallet activeWallet = clientMarketOwnerWalletRepo.findByUser_IdAndIsActiveTrue(userId)
                .orElseThrow(() -> new BusinessException("No active ClientMarketOwnerWallet found for user id: " + userId + ". Please initialize the wallet first.", null));

        if (!activeWallet.getIsActive()) {
            throw new BusinessException("ClientMarketOwnerWallet is deactivated. Cannot create operations on deactivated wallet.", null);
        }

        Double previousBalance = getClientMarketOwnerWalletCurrentBalance(userId);
        Double newBalance = calculateNewBalance(previousBalance, operation.getAmount(), operation.getIsExpense());

        if (newBalance < 0) {
            throw new BusinessException("Insufficient balance. Debit operation would result in negative balance.",
                    Map.of("currentBalance", String.valueOf(previousBalance),
                           "debitAmount", String.valueOf(operation.getAmount()),
                           "resultingBalance", String.valueOf(newBalance)));
        }

        PaymentCategory paymentCategory = resolvePaymentCategory(operation.getPaymentCategoryId());
        PaymentStatus paymentStatus = resolvePaymentStatus(operation.getPaymentStatusId());

        ClientMarketOwnerWallet walletRecord = ClientMarketOwnerWallet.builder()
                .user(user)
                .balance(newBalance)
                .isActive(true)
                .isExpense(operation.getIsExpense())
                .paymentCategory(paymentCategory)
                .paymentStatus(paymentStatus)
                .code(operation.getCode())
                .ref(operation.getRef())
                .otherReason(operation.getOtherReason())
                .note(operation.getNote())
                .toOrFrom(operation.getToOrFrom())
                .build();

        ClientMarketOwnerWallet saved = clientMarketOwnerWalletRepo.save(walletRecord);
        log.info("Created client market owner wallet operation for user id: {}, amount: {}, new balance: {}", userId, operation.getAmount(), newBalance);

        return mapToWalletRecordDto(saved);
    }

    @Override
    @Transactional
    public WalletRecordDto createCompanyWalletOperation(WalletOperationDto operation) {
        validateOperation(operation);

        // Check if wallet is active
        CompanyWallet activeWallet = companyWalletRepo.findByIsActiveTrue()
                .orElseThrow(() -> new BusinessException("No active CompanyWallet found. Please initialize the company wallet first.", null));

        if (!activeWallet.getIsActive()) {
            throw new BusinessException("CompanyWallet is deactivated. Cannot create operations on deactivated wallet.", null);
        }

        Double previousBalance = getCompanyWalletCurrentBalance();
        Double newBalance = calculateNewBalance(previousBalance, operation.getAmount(), operation.getIsExpense());

        if (newBalance < 0) {
            throw new BusinessException("Insufficient balance. Debit operation would result in negative balance.",
                    Map.of("currentBalance", String.valueOf(previousBalance),
                           "debitAmount", String.valueOf(operation.getAmount()),
                           "resultingBalance", String.valueOf(newBalance)));
        }

        PaymentCategory paymentCategory = resolvePaymentCategory(operation.getPaymentCategoryId());
        PaymentStatus paymentStatus = resolvePaymentStatus(operation.getPaymentStatusId());

        CompanyWallet walletRecord = CompanyWallet.builder()
                .balance(newBalance)
                .isActive(true)
                .isExpense(operation.getIsExpense())
                .paymentCategory(paymentCategory)
                .paymentStatus(paymentStatus)
                .code(operation.getCode())
                .ref(operation.getRef())
                .otherReason(operation.getOtherReason())
                .note(operation.getNote())
                .toOrFrom(operation.getToOrFrom())
                .build();

        CompanyWallet saved = companyWalletRepo.save(walletRecord);
        log.info("Created company wallet operation, amount: {}, new balance: {}", operation.getAmount(), newBalance);

        return mapToWalletRecordDto(saved);
    }

    @Override
    public List<WalletRecordDto> getAgentWalletHistory(Integer agentId) {
        validateAgentId(agentId);
        return agentWalletRepo.findHistoryByAgentId(agentId).stream()
                .map(this::mapToWalletRecordDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<WalletRecordDto> getClientMarketOwnerWalletHistory(Integer userId) {
        validateUserId(userId);
        return clientMarketOwnerWalletRepo.findHistoryByUserId(userId).stream()
                .map(this::mapToWalletRecordDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<WalletRecordDto> getCompanyWalletHistory() {
        return companyWalletRepo.findAllHistory().stream()
                .map(this::mapToWalletRecordDto)
                .collect(Collectors.toList());
    }

    private Double calculateNewBalance(Double previousBalance, Double amount, Boolean isExpense) {
        if (Boolean.TRUE.equals(isExpense)) {
            return previousBalance - amount;
        }
        return previousBalance + amount;
    }

    private PaymentCategory resolvePaymentCategory(Integer categoryId) {
        if (categoryId == null || categoryId == 0) {
            return null;
        }
        return paymentCategoryRepo.findById(categoryId)
                .orElseThrow(() -> new BusinessException("Payment category not found with id: " + categoryId, null));
    }

    private PaymentStatus resolvePaymentStatus(Integer statusId) {
        if (statusId == null || statusId == 0) {
            return null;
        }
        return paymentStatusRepo.findById(statusId)
                .orElseThrow(() -> new BusinessException("Payment status not found with id: " + statusId, null));
    }

    private WalletRecordDto mapToWalletRecordDto(AgentWallet wallet) {
        return WalletRecordDto.builder()
                .id(wallet.getId())
                .amount(null) // Will be calculated by calculateAmountsForPaginatedResults for paginated APIs
                .balance(wallet.getBalance())
                .isActive(wallet.getIsActive())
                .isExpense(wallet.getIsExpense())
                .paymentCategory(toCommon(wallet.getPaymentCategory()))
                .paymentStatus(toCommon(wallet.getPaymentStatus()))
                .code(wallet.getCode())
                .ref(wallet.getRef())
                .otherReason(wallet.getOtherReason())
                .note(wallet.getNote())
                .toOrFrom(wallet.getToOrFrom())
                .createdAt(wallet.getCreatedAt())
                .updatedAt(wallet.getUpdatedAt())
                .createdBy(wallet.getCreatedBy())
                .updatedBy(wallet.getUpdatedBy())
                .agent(toCommon(wallet.getAgent()))
                .build();
    }

    private WalletRecordDto mapToWalletRecordDto(ClientMarketOwnerWallet wallet) {
        return WalletRecordDto.builder()
                .id(wallet.getId())
                .amount(null) // Will be calculated by calculateAmountsForPaginatedResults for paginated APIs
                .balance(wallet.getBalance())
                .isActive(wallet.getIsActive())
                .isExpense(wallet.getIsExpense())
                .paymentCategory(toCommon(wallet.getPaymentCategory()))
                .paymentStatus(toCommon(wallet.getPaymentStatus()))
                .code(wallet.getCode())
                .ref(wallet.getRef())
                .otherReason(wallet.getOtherReason())
                .note(wallet.getNote())
                .toOrFrom(wallet.getToOrFrom())
                .createdAt(wallet.getCreatedAt())
                .updatedAt(wallet.getUpdatedAt())
                .createdBy(wallet.getCreatedBy())
                .updatedBy(wallet.getUpdatedBy())
                .user(toCommon(wallet.getUser()))
                .build();
    }

    private WalletRecordDto mapToWalletRecordDto(CompanyWallet wallet) {
        return WalletRecordDto.builder()
                .id(wallet.getId())
                .amount(null) // Will be calculated by calculateAmountsForPaginatedResults for paginated APIs
                .balance(wallet.getBalance())
                .isActive(wallet.getIsActive())
                .isExpense(wallet.getIsExpense())
                .paymentCategory(toCommon(wallet.getPaymentCategory()))
                .paymentStatus(toCommon(wallet.getPaymentStatus()))
                .code(wallet.getCode())
                .ref(wallet.getRef())
                .otherReason(wallet.getOtherReason())
                .note(wallet.getNote())
                .toOrFrom(wallet.getToOrFrom())
                .createdAt(wallet.getCreatedAt())
                .updatedAt(wallet.getUpdatedAt())
                .createdBy(wallet.getCreatedBy())
                .updatedBy(wallet.getUpdatedBy())
                .build();
    }

    private CommonIdNameDto toCommon(PaymentCategory category) {
        if (category == null) return null;
        return CommonIdNameDto.builder().id(category.getId()).name(category.getName()).build();
    }

    private CommonIdNameDto toCommon(PaymentStatus status) {
        if (status == null) return null;
        return CommonIdNameDto.builder().id(status.getId()).name(status.getName()).build();
    }

    private CommonIdNameDto toCommon(User user) {
        if (user == null) return null;
        String fullName = (user.getFirstName() != null ? user.getFirstName() : "") + 
                          (user.getLastName() != null ? " " + user.getLastName() : "");
        return CommonIdNameDto.builder().id(user.getId()).name(fullName.trim()).build();
    }

    private void validateAgentId(Integer agentId) {
        if (agentId == null || agentId <= 0) {
            throw new BusinessException("Invalid agent id", Map.of("agentId", agentId == null ? "null" : String.valueOf(agentId)));
        }
    }

    private void validateUserId(Integer userId) {
        if (userId == null || userId <= 0) {
            throw new BusinessException("Invalid user id", Map.of("userId", userId == null ? "null" : String.valueOf(userId)));
        }
    }

    private void validateOperation(WalletOperationDto operation) {
        if (operation == null) {
            throw new BusinessException("Operation cannot be null", null);
        }
        if (operation.getAmount() == null) {
            throw new BusinessException("Amount cannot be null", null);
        }
        if (operation.getAmount() <= 0) {
            throw new BusinessException("Amount must be greater than 0", Map.of("amount", String.valueOf(operation.getAmount())));
        }
    }

    /**
     * Calculate transaction amount from previous balance.
     * Formula:
     * - If isExpense (debit): amount = previousBalance - currentBalance
     * - If credit: amount = currentBalance - previousBalance
     * Returns null if this is the first transaction (no previous record).
     * NOTE: This method is only used for single-record operations (detail APIs).
     * For paginated history, use calculateAmountsForPaginatedResults to avoid N+1 queries.
     */
    private Double calculateTransactionAmount(Integer ownerId, Integer currentId, Double currentBalance, Boolean isExpense, java.util.function.Function<Integer, List<?>> historyFetcher) {
        List<?> history = historyFetcher.apply(ownerId);
        if (history.isEmpty()) {
            return null; // No history
        }
        
        // Find the current record in history
        int currentIndex = -1;
        for (int i = 0; i < history.size(); i++) {
            Object record = history.get(i);
            Integer recordId = extractId(record);
            if (recordId != null && recordId.equals(currentId)) {
                currentIndex = i;
                break;
            }
        }
        
        if (currentIndex == -1) {
            return null; // Current record not found in history
        }
        
        // Get the previous record (next in DESC-ordered list)
        if (currentIndex + 1 < history.size()) {
            Object previousRecord = history.get(currentIndex + 1);
            Double previousBalance = extractBalance(previousRecord);
            return calculateAmountFromBalances(previousBalance, currentBalance, isExpense);
        }
        
        return null; // No previous record
    }

    private Integer extractId(Object walletRecord) {
        if (walletRecord instanceof AgentWallet) {
            return ((AgentWallet) walletRecord).getId();
        } else if (walletRecord instanceof ClientMarketOwnerWallet) {
            return ((ClientMarketOwnerWallet) walletRecord).getId();
        } else if (walletRecord instanceof CompanyWallet) {
            return ((CompanyWallet) walletRecord).getId();
        }
        return null;
    }

    private Double extractBalance(Object walletRecord) {
        if (walletRecord instanceof AgentWallet) {
            return ((AgentWallet) walletRecord).getBalance();
        } else if (walletRecord instanceof ClientMarketOwnerWallet) {
            return ((ClientMarketOwnerWallet) walletRecord).getBalance();
        } else if (walletRecord instanceof CompanyWallet) {
            return ((CompanyWallet) walletRecord).getBalance();
        }
        return 0.0;
    }

    private Double calculateAmountFromBalances(Double previousBalance, Double currentBalance, Boolean isExpense) {
        if (previousBalance == null || currentBalance == null) {
            return null;
        }
        if (Boolean.TRUE.equals(isExpense)) {
            // Debit: amount = previousBalance - currentBalance
            return previousBalance - currentBalance;
        } else {
            // Credit: amount = currentBalance - previousBalance
            return currentBalance - previousBalance;
        }
    }

    /**
     * Calculate amounts for paginated wallet history results.
     * This avoids N+1 query issues by fetching history once and calculating amounts for all records.
     */
    private void calculateAmountsForPaginatedResults(List<WalletRecordDto> dtos, Integer ownerId, java.util.function.Function<Integer, List<?>> historyFetcher) {
        if (dtos.isEmpty()) {
            return;
        }

        List<?> history = historyFetcher.apply(ownerId);
        if (history.isEmpty()) {
            return;
        }

        // Build a map of record ID to index in history for O(1) lookup
        java.util.Map<Integer, Integer> idToIndexMap = new java.util.HashMap<>();
        for (int i = 0; i < history.size(); i++) {
            Object record = history.get(i);
            Integer recordId = extractId(record);
            if (recordId != null) {
                idToIndexMap.put(recordId, i);
            }
        }

        // Calculate amount for each DTO
        for (WalletRecordDto dto : dtos) {
            Integer currentIndex = idToIndexMap.get(dto.getId());
            if (currentIndex != null && currentIndex + 1 < history.size()) {
                Object previousRecord = history.get(currentIndex + 1);
                Double previousBalance = extractBalance(previousRecord);
                dto.setAmount(calculateAmountFromBalances(previousBalance, dto.getBalance(), dto.getIsExpense()));
            }
        }
    }

    @Override
    @Transactional
    public WalletRecordDto initializeAgentWallet(Integer agentId) {
        validateAgentId(agentId);

        // Check if active wallet already exists
        if (agentWalletRepo.findByAgent_IdAndIsActiveTrue(agentId).isPresent()) {
            throw new BusinessException("Active AgentWallet already exists for agent id: " + agentId, null);
        }

        User agent = userRepo.findById(agentId)
                .orElseThrow(() -> new BusinessException("Agent user not found with id: " + agentId, null));

        AgentWallet wallet = AgentWallet.builder()
                .agent(agent)
                .balance(0.0)
                .isActive(true)
                .isExpense(false)
                .paymentCategory(null)
                .paymentStatus(null)
                .code(null)
                .ref(null)
                .otherReason(null)
                .note("Wallet initialized")
                .toOrFrom(null)
                .build();

        AgentWallet saved = agentWalletRepo.save(wallet);
        log.info("Initialized AgentWallet for agent id: {}", agentId);

        return mapToWalletRecordDto(saved);
    }

    @Override
    @Transactional
    public WalletRecordDto initializeClientMarketOwnerWallet(Integer userId) {
        validateUserId(userId);

        // Check if active wallet already exists
        if (clientMarketOwnerWalletRepo.findByUser_IdAndIsActiveTrue(userId).isPresent()) {
            throw new BusinessException("Active ClientMarketOwnerWallet already exists for user id: " + userId, null);
        }

        User user = userRepo.findById(userId)
                .orElseThrow(() -> new BusinessException("User not found with id: " + userId, null));

        ClientMarketOwnerWallet wallet = ClientMarketOwnerWallet.builder()
                .user(user)
                .balance(0.0)
                .isActive(true)
                .isExpense(false)
                .paymentCategory(null)
                .paymentStatus(null)
                .code(null)
                .ref(null)
                .otherReason(null)
                .note("Wallet initialized")
                .toOrFrom(null)
                .build();

        ClientMarketOwnerWallet saved = clientMarketOwnerWalletRepo.save(wallet);
        log.info("Initialized ClientMarketOwnerWallet for user id: {}", userId);

        return mapToWalletRecordDto(saved);
    }

    @Override
    @Transactional
    public WalletRecordDto initializeCompanyWallet() {
        // Check if active wallet already exists
        if (companyWalletRepo.findByIsActiveTrue().isPresent()) {
            throw new BusinessException("Active CompanyWallet already exists", null);
        }

        CompanyWallet wallet = CompanyWallet.builder()
                .balance(0.0)
                .isActive(true)
                .isExpense(false)
                .paymentCategory(null)
                .paymentStatus(null)
                .code(null)
                .ref(null)
                .otherReason(null)
                .note("Wallet initialized")
                .toOrFrom(null)
                .build();

        CompanyWallet saved = companyWalletRepo.save(wallet);
        log.info("Initialized CompanyWallet");

        return mapToWalletRecordDto(saved);
    }

    @Override
    @Transactional
    public WalletRecordDto activateAgentWallet(Integer agentId, Boolean isActive) {
        validateAgentId(agentId);

        AgentWallet wallet = agentWalletRepo.findLatestIdByAgentId(agentId)
                .flatMap(agentWalletRepo::findById)
                .orElseThrow(() -> new BusinessException("No AgentWallet found for agent id: " + agentId, null));

        wallet.setIsActive(isActive);
        AgentWallet saved = agentWalletRepo.save(wallet);
        log.info("AgentWallet activation status changed to {} for agent id: {}", isActive, agentId);

        return mapToWalletRecordDto(saved);
    }

    @Override
    @Transactional
    public WalletRecordDto activateClientMarketOwnerWallet(Integer userId, Boolean isActive) {
        validateUserId(userId);

        ClientMarketOwnerWallet wallet = clientMarketOwnerWalletRepo.findLatestIdByUserId(userId)
                .flatMap(clientMarketOwnerWalletRepo::findById)
                .orElseThrow(() -> new BusinessException("No ClientMarketOwnerWallet found for user id: " + userId, null));

        wallet.setIsActive(isActive);
        ClientMarketOwnerWallet saved = clientMarketOwnerWalletRepo.save(wallet);
        log.info("ClientMarketOwnerWallet activation status changed to {} for user id: {}", isActive, userId);

        return mapToWalletRecordDto(saved);
    }

    @Override
    @Transactional
    public WalletRecordDto activateCompanyWallet(Boolean isActive) {
        CompanyWallet wallet = companyWalletRepo.findLatestActiveId()
                .flatMap(companyWalletRepo::findById)
                .orElseThrow(() -> new BusinessException("No CompanyWallet found", null));

        wallet.setIsActive(isActive);
        CompanyWallet saved = companyWalletRepo.save(wallet);
        log.info("CompanyWallet activation status changed to {}", isActive);

        return mapToWalletRecordDto(saved);
    }

    @Override
    public ResponseDto<PaginatedWalletHistoryDto> getAgentWalletHistoryPaginated(Integer agentId, PaginatedWalletHistoryDto paginatedWalletHistoryDto) {
        validateAgentId(agentId);

        Pageable pageable = PageRequest.of(
                paginatedWalletHistoryDto.getPageNumber(),
                paginatedWalletHistoryDto.getCountPerPage(),
                Sort.by("createdAt").descending()
        );

        Specification<AgentWallet> spec = WalletHistorySpec.getAgentWalletSpecification(agentId, paginatedWalletHistoryDto);
        Page<AgentWallet> agentWalletPage = agentWalletRepo.findAll(spec, pageable);

        paginatedWalletHistoryDto.setTotalCount(agentWalletPage.getTotalElements());
        paginatedWalletHistoryDto.setTotalPages(agentWalletPage.getTotalPages());
        paginatedWalletHistoryDto.setCountPerPage(agentWalletPage.getSize());

        List<WalletRecordDto> walletRecordDtos = agentWalletPage.getContent().stream()
                .map(this::mapToWalletRecordDto)
                .collect(Collectors.toList());

        // Calculate amounts for paginated results to avoid N+1 queries
        calculateAmountsForPaginatedResults(walletRecordDtos, agentId, agentWalletRepo::findHistoryByAgentId);

        paginatedWalletHistoryDto.setItems(walletRecordDtos);

        return ResponseDto.<PaginatedWalletHistoryDto>builder()
                .status(200)
                .message("Success")
                .desc("Agent wallet history fetched successfully")
                .object(paginatedWalletHistoryDto)
                .build();
    }

    @Override
    public ResponseDto<PaginatedWalletHistoryDto> getClientMarketOwnerWalletHistoryPaginated(Integer userId, PaginatedWalletHistoryDto paginatedWalletHistoryDto) {
        validateUserId(userId);

        Pageable pageable = PageRequest.of(
                paginatedWalletHistoryDto.getPageNumber(),
                paginatedWalletHistoryDto.getCountPerPage(),
                Sort.by("createdAt").descending()
        );

        Specification<ClientMarketOwnerWallet> spec = WalletHistorySpec.getClientMarketOwnerWalletSpecification(userId, paginatedWalletHistoryDto);
        Page<ClientMarketOwnerWallet> clientMarketOwnerWalletPage = clientMarketOwnerWalletRepo.findAll(spec, pageable);

        paginatedWalletHistoryDto.setTotalCount(clientMarketOwnerWalletPage.getTotalElements());
        paginatedWalletHistoryDto.setTotalPages(clientMarketOwnerWalletPage.getTotalPages());
        paginatedWalletHistoryDto.setCountPerPage(clientMarketOwnerWalletPage.getSize());

        List<WalletRecordDto> walletRecordDtos = clientMarketOwnerWalletPage.getContent().stream()
                .map(this::mapToWalletRecordDto)
                .collect(Collectors.toList());

        // Calculate amounts for paginated results to avoid N+1 queries
        calculateAmountsForPaginatedResults(walletRecordDtos, userId, clientMarketOwnerWalletRepo::findHistoryByUserId);

        paginatedWalletHistoryDto.setItems(walletRecordDtos);

        return ResponseDto.<PaginatedWalletHistoryDto>builder()
                .status(200)
                .message("Success")
                .desc("Client market owner wallet history fetched successfully")
                .object(paginatedWalletHistoryDto)
                .build();
    }

    @Override
    public ResponseDto<PaginatedWalletHistoryDto> getCompanyWalletHistoryPaginated(PaginatedWalletHistoryDto paginatedWalletHistoryDto) {
        Pageable pageable = PageRequest.of(
                paginatedWalletHistoryDto.getPageNumber(),
                paginatedWalletHistoryDto.getCountPerPage(),
                Sort.by("createdAt").descending()
        );

        Specification<CompanyWallet> spec = WalletHistorySpec.getCompanyWalletSpecification(paginatedWalletHistoryDto);
        Page<CompanyWallet> companyWalletPage = companyWalletRepo.findAll(spec, pageable);

        paginatedWalletHistoryDto.setTotalCount(companyWalletPage.getTotalElements());
        paginatedWalletHistoryDto.setTotalPages(companyWalletPage.getTotalPages());
        paginatedWalletHistoryDto.setCountPerPage(companyWalletPage.getSize());

        List<WalletRecordDto> walletRecordDtos = companyWalletPage.getContent().stream()
                .map(this::mapToWalletRecordDto)
                .collect(Collectors.toList());

        // Calculate amounts for paginated results to avoid N+1 queries
        // CompanyWallet has no owner, so we pass null and use a lambda
        calculateAmountsForPaginatedResults(walletRecordDtos, null, ownerId -> companyWalletRepo.findAllHistory());

        paginatedWalletHistoryDto.setItems(walletRecordDtos);

        return ResponseDto.<PaginatedWalletHistoryDto>builder()
                .status(200)
                .message("Success")
                .desc("Company wallet history fetched successfully")
                .object(paginatedWalletHistoryDto)
                .build();
    }

    @Override
    public ResponseDto<WalletRecordDto> getAgentWalletOperationDetail(Integer agentId, Integer operationId) {
        validateAgentId(agentId);
        AgentWallet wallet = agentWalletRepo.findByIdAndAgent_Id(operationId, agentId)
                .orElseThrow(() -> new BusinessException("Wallet operation not found for the specified agent", null));
        return ResponseDto.<WalletRecordDto>builder()
                .status(200)
                .message("Success")
                .desc("Agent wallet operation detail fetched successfully")
                .object(mapToWalletRecordDto(wallet))
                .build();
    }

    @Override
    public ResponseDto<WalletRecordDto> getClientMarketOwnerWalletOperationDetail(Integer userId, Integer operationId) {
        validateUserId(userId);
        ClientMarketOwnerWallet wallet = clientMarketOwnerWalletRepo.findByIdAndUser_Id(operationId, userId)
                .orElseThrow(() -> new BusinessException("Wallet operation not found for the specified user", null));
        return ResponseDto.<WalletRecordDto>builder()
                .status(200)
                .message("Success")
                .desc("Client market owner wallet operation detail fetched successfully")
                .object(mapToWalletRecordDto(wallet))
                .build();
    }

    @Override
    public ResponseDto<WalletRecordDto> getCompanyWalletOperationDetail(Integer operationId) {
        CompanyWallet wallet = companyWalletRepo.findById(operationId)
                .orElseThrow(() -> new BusinessException("Company wallet operation not found", null));
        return ResponseDto.<WalletRecordDto>builder()
                .status(200)
                .message("Success")
                .desc("Company wallet operation detail fetched successfully")
                .object(mapToWalletRecordDto(wallet))
                .build();
    }
}
