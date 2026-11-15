package com.kaleox.deliveryya.service;

import com.kaleox.deliveryya.dto.ResponseDto;
import com.kaleox.deliveryya.dto.WalletOperationDto;
import com.kaleox.deliveryya.dto.WalletRecordDto;
import com.kaleox.deliveryya.dto.paginatedDto.PaginatedWalletHistoryDto;

import java.util.List;

public interface WalletService {

    /**
     * Get current balance for agent wallet
     * @param agentId the agent user ID
     * @return the current balance
     */
    Double getAgentWalletCurrentBalance(Integer agentId);

    /**
     * Get current balance for client/market owner wallet
     * @param userId the user ID
     * @return the current balance
     */
    Double getClientMarketOwnerWalletCurrentBalance(Integer userId);

    /**
     * Get current balance for company wallet
     * @return the current balance
     */
    Double getCompanyWalletCurrentBalance();

    /**
     * Create a wallet operation for agent wallet
     * @param agentId the agent user ID
     * @param operation the wallet operation details
     * @return the resulting wallet record
     */
    WalletRecordDto createAgentWalletOperation(Integer agentId, WalletOperationDto operation);

    /**
     * Create a wallet operation for client/market owner wallet
     * @param userId the user ID
     * @param operation the wallet operation details
     * @return the resulting wallet record
     */
    WalletRecordDto createClientMarketOwnerWalletOperation(Integer userId, WalletOperationDto operation);

    /**
     * Create a wallet operation for company wallet
     * @param operation the wallet operation details
     * @return the resulting wallet record
     */
    WalletRecordDto createCompanyWalletOperation(WalletOperationDto operation);

    /**
     * Get wallet operation history for agent
     * @param agentId the agent user ID
     * @return list of wallet records
     */
    List<WalletRecordDto> getAgentWalletHistory(Integer agentId);

    /**
     * Get wallet operation history for client/market owner
     * @param userId the user ID
     * @return list of wallet records
     */
    List<WalletRecordDto> getClientMarketOwnerWalletHistory(Integer userId);

    /**
     * Get wallet operation history for company
     * @return list of wallet records
     */
    List<WalletRecordDto> getCompanyWalletHistory();

    /**
     * Initialize agent wallet with zero balance
     * @param agentId the agent user ID
     * @return the created wallet record
     */
    WalletRecordDto initializeAgentWallet(Integer agentId);

    /**
     * Initialize client/market owner wallet with zero balance
     * @param userId the user ID
     * @return the created wallet record
     */
    WalletRecordDto initializeClientMarketOwnerWallet(Integer userId);

    /**
     * Initialize company wallet with zero balance
     * @return the created wallet record
     */
    WalletRecordDto initializeCompanyWallet();

    /**
     * Activate or deactivate agent wallet
     * @param agentId the agent user ID
     * @param isActive the activation status
     * @return the updated wallet record
     */
    WalletRecordDto activateAgentWallet(Integer agentId, Boolean isActive);

    /**
     * Activate or deactivate client/market owner wallet
     * @param userId the user ID
     * @param isActive the activation status
     * @return the updated wallet record
     */
    WalletRecordDto activateClientMarketOwnerWallet(Integer userId, Boolean isActive);

    /**
     * Activate or deactivate company wallet
     * @param isActive the activation status
     * @return the updated wallet record
     */
    WalletRecordDto activateCompanyWallet(Boolean isActive);

    /**
     * Get paginated wallet operation history for agent
     * @param agentId the agent user ID
     * @param paginatedWalletHistoryDto pagination and filter parameters
     * @return paginated wallet history
     */
    ResponseDto<PaginatedWalletHistoryDto> getAgentWalletHistoryPaginated(Integer agentId, PaginatedWalletHistoryDto paginatedWalletHistoryDto);

    /**
     * Get paginated wallet operation history for client/market owner
     * @param userId the user ID
     * @param paginatedWalletHistoryDto pagination and filter parameters
     * @return paginated wallet history
     */
    ResponseDto<PaginatedWalletHistoryDto> getClientMarketOwnerWalletHistoryPaginated(Integer userId, PaginatedWalletHistoryDto paginatedWalletHistoryDto);

    /**
     * Get paginated wallet operation history for company
     * @param paginatedWalletHistoryDto pagination and filter parameters
     * @return paginated wallet history
     */
    ResponseDto<PaginatedWalletHistoryDto> getCompanyWalletHistoryPaginated(PaginatedWalletHistoryDto paginatedWalletHistoryDto);

    /**
     * Get wallet operation detail for agent
     * @param agentId the agent user ID
     * @param operationId the wallet operation/record ID
     * @return wallet operation detail
     */
    ResponseDto<WalletRecordDto> getAgentWalletOperationDetail(Integer agentId, Integer operationId);

    /**
     * Get wallet operation detail for client/market owner
     * @param userId the user ID
     * @param operationId the wallet operation/record ID
     * @return wallet operation detail
     */
    ResponseDto<WalletRecordDto> getClientMarketOwnerWalletOperationDetail(Integer userId, Integer operationId);

    /**
     * Get wallet operation detail for company
     * @param operationId the wallet operation/record ID
     * @return wallet operation detail
     */
    ResponseDto<WalletRecordDto> getCompanyWalletOperationDetail(Integer operationId);
}
