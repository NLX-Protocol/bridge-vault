// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title LzLib.CallParams
 * @notice Call parameters for LayerZero transactions
 */
struct CallParams {
    address payable refundAddress;
    address zroPaymentAddress;
}

/**
 * @title IOriginalTokenBridge
 * @notice Interface for the OriginalTokenBridge contract
 */
interface IOriginalTokenBridge {
    function bridge(
        address token,
        uint256 amountLD,
        address to,
        CallParams calldata callParams,
        bytes calldata adapterParams
    ) external payable;
    
    function estimateBridgeFee(
        bool useZro,
        bytes calldata adapterParams
    ) external view returns (uint256 nativeFee, uint256 zroFee);
}
