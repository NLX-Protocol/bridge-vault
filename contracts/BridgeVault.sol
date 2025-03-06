// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// --------------------------------------------------
// Imports
// --------------------------------------------------
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/Create2.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@pythnetwork/pyth-sdk-solidity/IPyth.sol";
import "@pythnetwork/pyth-sdk-solidity/PythStructs.sol";
import "./SimpleBridgeParams.sol";

// --------------------------------------------------
// Vault Contract
// --------------------------------------------------
/**
 * @title Vault
 * @notice Minimal vault for user token storage.
 * @dev Only the VaultFactory is allowed to trigger withdrawals.
 */
contract Vault {
    using SafeERC20 for IERC20;

    /// @notice Address of the factory that deployed this vault.
    address public immutable factory;

    /**
     * @notice Constructor sets the factory as the deployer.
     */
    constructor() {
        factory = msg.sender;
    }
    
    /**
     * @notice Withdraw all of a given token to the factory.
     * @param _token The ERC20 token address.
     * @return amount The withdrawn token amount.
     */
    function withdraw(address _token) external returns (uint256 amount) {
        require(msg.sender == factory, "Not factory");
        amount = IERC20(_token).balanceOf(address(this));
        if (amount > 0) {
            IERC20(_token).safeTransfer(msg.sender, amount);
        }
    }
}

// --------------------------------------------------
// VaultFactory Contract
// --------------------------------------------------
/**
 * @title VaultFactory
 * @notice Manages user vaults, enabling deterministic deployment using Create2.
 * @dev Integrates with the Pyth oracle for token pricing and applies a fixed fee in USD terms.
 */
contract VaultFactory is Ownable, Pausable {
    using SafeERC20 for IERC20;

    // --------------------------------------------------
    // State Variables & Constants
    // --------------------------------------------------
    address public bridgeContract;
    address public pythOracle;
    uint16 public remoteChainId = 1116; // CORE_CHAIN_ID as uint16 for compatibility
    address public feeRecipient;
    uint256 public constant FEE_USD_AMOUNT = 1.5 * 10**18; // $1.5 with 18 decimals
    bytes32 public immutable VAULT_INIT_CODE_HASH;
    uint32 public constant PRICE_STALENESS_THRESHOLD = 60; // Max age of price in seconds

    // Mapping of token addresses to Pyth price feed IDs.
    mapping(address => bytes32) public tokenPriceFeeds;
    
    // --------------------------------------------------
    // Events
    // --------------------------------------------------
    event TokenWhitelisted(address indexed token, bytes32 priceId);
    event TokenRemoved(address indexed token);
    event FeeTaken(address indexed receiver, address indexed token, uint256 tokenAmount, uint256 usdValue);
    event PriceUpdated(bytes32 indexed priceId, int64 price, uint256 publishTime);
    event BridgeExecuted(address indexed token, address indexed receiver, uint256 amount);
    
    // --------------------------------------------------
    // Constructor
    // --------------------------------------------------
    /**
     * @notice Initializes the factory with critical parameters.
     * @param _feeRecipient Address which receives execution fees.
     * @param _bridgeContract Address of the bridge contract.
     * @param _pythOracle Address of the Pyth oracle.
     */
    constructor(address _feeRecipient, address _bridgeContract, address _pythOracle) Ownable(msg.sender) {
        feeRecipient = _feeRecipient;
        bridgeContract = _bridgeContract;
        pythOracle = _pythOracle;
        VAULT_INIT_CODE_HASH = keccak256(type(Vault).creationCode);
    }
    
    // --------------------------------------------------
    // Utility Functions
    // --------------------------------------------------
    /**
     * @notice Computes the deterministic vault address for a user.
     * @param _receiver The user address.
     * @return vault The computed vault address.
     */
    function getVault(address _receiver) public view returns (address vault) {
        bytes32 salt = bytes32(bytes20(_receiver));
        vault = Create2.computeAddress(salt, VAULT_INIT_CODE_HASH);
    }
    
    /**
     * @notice Updates the Pyth price feed for a token.
     * @param _priceUpdate The encoded price update data from Pyth.
     */
    function updatePrice(bytes[] calldata _priceUpdate) public payable {
        // Calculate fee for updating the price
        uint256 updateFee = IPyth(pythOracle).getUpdateFee(_priceUpdate);
        
        // Update the price paying the required fee
        IPyth(pythOracle).updatePriceFeeds{value: updateFee}(_priceUpdate);
        
        // Refund any excess ETH
        uint256 excess = msg.value - updateFee;
        if (excess > 0) {
            payable(msg.sender).transfer(excess);
        }
    }
    
    /**
     * @notice Calculates the fee in token units for a fixed USD fee.
     * @param _token The token address.
     * @param _priceUpdate Optional price update data to refresh the price.
     * @return feeAmount The fee amount in token units.
     */
    function calculateFeeAmount(address _token, bytes[] calldata _priceUpdate) public payable returns (uint256 feeAmount) {
        bytes32 priceId = tokenPriceFeeds[_token];
        require(priceId != 0, "Token not whitelisted");
        
        // Update the price if price update data is provided
        if (_priceUpdate.length > 0) {
            updatePrice(_priceUpdate);
        }
        
        // Get price from Pyth with freshness check
        PythStructs.Price memory priceData = IPyth(pythOracle).getPriceNoOlderThan(priceId, PRICE_STALENESS_THRESHOLD);
        require(priceData.price > 0, "Invalid price");
        
        // Convert Pyth price (which has a certain exponent) to a price with 18 decimals
        uint8 tokenDecimals = IERC20Metadata(_token).decimals();
        
        // Calculate fee amount: (FEE_USD_AMOUNT * 10^tokenDecimals) / (price * 10^(18 + priceData.expo))
        uint256 numerator = FEE_USD_AMOUNT * (10**tokenDecimals);
        uint256 exponent = uint256(18 + int256(priceData.expo));
        uint256 priceWith18Decimals = uint256(int256(priceData.price)) * 10**exponent;
        
        require(priceWith18Decimals > 0, "Invalid price conversion");
        feeAmount = numerator / priceWith18Decimals;
        require(feeAmount > 0, "Fee calculation error");
        
        emit PriceUpdated(priceId, priceData.price, priceData.publishTime);
    }
    
    /**
     * @notice View-only version of fee calculation without updating price.
     * @param _token The token address.
     * @return feeAmount The fee amount in token units.
     */
    function viewFeeAmount(address _token) public view returns (uint256 feeAmount) {
        bytes32 priceId = tokenPriceFeeds[_token];
        require(priceId != 0, "Token not whitelisted");
        
        // Get price from Pyth with freshness check
        PythStructs.Price memory priceData = IPyth(pythOracle).getPriceNoOlderThan(priceId, PRICE_STALENESS_THRESHOLD);
        require(priceData.price > 0, "Invalid price");
        
        // Convert Pyth price (which has a certain exponent) to a price with 18 decimals
        uint8 tokenDecimals = IERC20Metadata(_token).decimals();
        int32 adjustedExpo = priceData.expo + int32(int8(tokenDecimals)) - 18;
        
        // Calculate fee amount based on the price and decimals
        if (adjustedExpo >= 0) {
            feeAmount = (FEE_USD_AMOUNT * 10**uint256(int256(adjustedExpo))) / uint256(int256(priceData.price));
        } else {
            feeAmount = FEE_USD_AMOUNT / (uint256(int256(priceData.price)) * 10**uint256(int256(-adjustedExpo)));
        }
    }
    
    /**
     * @notice Converts a token amount into its USD value (18 decimals).
     * @param _token The token address.
     * @param _amount The token amount.
     * @param _priceUpdate Optional price update data to refresh the price.
     * @return usdValue The corresponding USD value.
     */
    function getUsdValue(address _token, uint256 _amount, bytes[] calldata _priceUpdate) public payable returns (uint256 usdValue) {
        bytes32 priceId = tokenPriceFeeds[_token];
        require(priceId != 0, "Token not whitelisted");
        
        // Update the price if price update data is provided
        if (_priceUpdate.length > 0) {
            updatePrice(_priceUpdate);
        }
        
        // Get price from Pyth with freshness check
        PythStructs.Price memory priceData = IPyth(pythOracle).getPriceNoOlderThan(priceId, PRICE_STALENESS_THRESHOLD);
        require(priceData.price > 0, "Invalid price");
        
        uint8 tokenDecimals = IERC20Metadata(_token).decimals();
        int32 adjustedExpo = priceData.expo + int32(18) - int32(uint32(tokenDecimals));
        
        if (adjustedExpo >= 0) {
            usdValue = (_amount * uint256(int256(priceData.price)) * 10**uint256(int256(adjustedExpo))) / 1e18;
        } else {
            usdValue = (_amount * uint256(int256(priceData.price))) / (1e18 * 10**uint256(int256(-adjustedExpo)));
        }
        
        emit PriceUpdated(priceId, priceData.price, priceData.publishTime);
    }
    
    /**
     * @notice View-only version of USD value calculation without updating price.
     * @param _token The token address.
     * @param _amount The token amount.
     * @return usdValue The corresponding USD value.
     */
    function viewUsdValue(address _token, uint256 _amount) public view returns (uint256 usdValue) {
        bytes32 priceId = tokenPriceFeeds[_token];
        require(priceId != 0, "Token not whitelisted");
        
        // Get price from Pyth with freshness check
        PythStructs.Price memory priceData = IPyth(pythOracle).getPriceNoOlderThan(priceId, PRICE_STALENESS_THRESHOLD);
        require(priceData.price > 0, "Invalid price");
        
        uint8 tokenDecimals = IERC20Metadata(_token).decimals();
        int32 adjustedExpo = priceData.expo + int32(18) - int32(uint32(tokenDecimals));
        
        if (adjustedExpo >= 0) {
            usdValue = (_amount * uint256(int256(priceData.price)) * 10**uint256(int256(adjustedExpo))) / 1e18;
        } else {
            usdValue = (_amount * uint256(int256(priceData.price))) / (1e18 * 10**uint256(int256(-adjustedExpo)));
        }
    }
    
    // --------------------------------------------------
    // User Functions
    // --------------------------------------------------
    /**
     * @notice Bridges tokens from a user's vault after deducting a fee.
     * @dev If the vault does not exist, it is deployed using Create2.
     * @param _receiver The user address receiving the bridged tokens.
     * @param _token The token to be bridged.
     * @param _priceUpdate The price update data for the token's price feed.
     */
    function bridgeVaultTokens(
        address _receiver,
        address _token,
        bytes[] calldata _priceUpdate
    ) external payable whenNotPaused {
        require(tokenPriceFeeds[_token] != 0, "Token not whitelisted");

        address vaultAddress = getVault(_receiver);
        // Deploy vault if not already deployed.
        if (vaultAddress.code.length == 0) {
            address deployedVaultAddress = Create2.deploy(0, bytes32(bytes20(_receiver)), type(Vault).creationCode);
            assert(deployedVaultAddress == vaultAddress);
        }
        
        uint256 totalBalance = Vault(vaultAddress).withdraw(_token);
        require(totalBalance > 0, "No balance");
        
        // Calculate fee and ensure sufficient balance.
        uint256 feeAmount = calculateFeeAmount(_token, _priceUpdate);
        require(totalBalance > feeAmount, "Balance too small for fee");
        uint256 bridgeAmount = totalBalance - feeAmount;
        
        // Transfer fee to fee recipient
        IERC20(_token).safeTransfer(feeRecipient, feeAmount);
        uint256 feeUsdValue = viewUsdValue(_token, feeAmount);
        emit FeeTaken(_receiver, _token, feeAmount, feeUsdValue);
        
        // Approve the bridge contract to spend the tokens
        IERC20(_token).approve(bridgeContract, bridgeAmount);
        
        // Execute the bridge transaction
        _executeBridge(_token, bridgeAmount, _receiver);
    }
    
    /**
     * @notice Internal function to execute the bridge transaction.
     * @param _token The token to bridge.
     * @param _amount The amount of tokens to bridge.
     * @param _receiver The receiving address on the destination chain.
     */
    function _executeBridge(address _token, uint256 _amount, address _receiver) internal {
        IOriginalTokenBridge bridge = IOriginalTokenBridge(bridgeContract);
        
        CallParams memory callParams = CallParams({
            refundAddress: payable(_receiver),
            zroPaymentAddress: address(0)
        });
        
        bytes memory adapterParams = new bytes(0);
        
        try bridge.bridge{value: msg.value}(
            _token,
            _amount,
            _receiver,
            callParams,
            adapterParams
        ) {
            emit BridgeExecuted(_token, _receiver, _amount);
        } catch {
            revert("Bridge failed");
        }
    }
    
    /**
     * @notice Allows a user to recover tokens from their vault.
     * @param _token The token address.
     * @return amount The withdrawn token amount.
     */
    function recoverToken(address _token) external returns (uint256 amount) {
        Vault vault = Vault(getVault(msg.sender));
        if (address(vault).code.length == 0) {
            // user has no vault
            return 0;
        }
        vault.withdraw(_token);
        // intentionally using unsafe transfer as we don't want this recovery function to ever lock the users funds
        // by getting the token balance of this contract, we also account for fee on transfer tokens.
        amount = IERC20(_token).balanceOf(address(this));
        IERC20(_token).transfer(msg.sender, amount);
    }
    
    /**
     * @notice Estimates the bridge fee for a transaction.
     * @param _useZro Whether to use ZRO token for payment.
     * @param _adapterParams Adapter parameters for the bridge.
     * @return nativeFee The fee in native token.
     * @return zroFee The fee in ZRO token.
     */
    function estimateBridgeFee(bool _useZro, bytes calldata _adapterParams) external view returns (uint256 nativeFee, uint256 zroFee) {
        return IOriginalTokenBridge(bridgeContract).estimateBridgeFee(_useZro, _adapterParams);
    }
    
    // --------------------------------------------------
    // Administrative Functions (onlyOwner)
    // --------------------------------------------------
    /**
     * @notice Pauses contract operations.
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Resumes contract operations.
     */
    function unPause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @notice Whitelists a token and assigns its Pyth price feed ID.
     * @param _token The token address.
     * @param _priceId The Pyth price feed identifier.
     */
    function whitelistToken(address _token, bytes32 _priceId) external onlyOwner {
        tokenPriceFeeds[_token] = _priceId;
        emit TokenWhitelisted(_token, _priceId);
    }
    
    /**
     * @notice Removes a token from the whitelist.
     * @param _token The token address.
     */
    function removeToken(address _token) external onlyOwner {
        tokenPriceFeeds[_token] = 0;
        emit TokenRemoved(_token);
    }

    /**
     * @notice Updates the feeRecipient address receiving bridging fees.
     * @param _newFeeRecipient The new feeRecipient address.
     */
    function updateFeeRecipient(address _newFeeRecipient) external onlyOwner {
        require(_newFeeRecipient != address(0), "Invalid feeRecipient");
        feeRecipient = _newFeeRecipient;
    }
    
    /**
     * @notice Updates the bridge contract address.
     * @param _newBridge The new bridge contract address.
     */
    function updateBridge(address _newBridge) external onlyOwner {
        require(_newBridge != address(0), "Invalid bridge");
        bridgeContract = _newBridge;
    }
    
    /**
     * @notice Updates the Pyth oracle address.
     * @param _newPythOracle The new oracle address.
     */
    function updatePythOracle(address _newPythOracle) external onlyOwner {
        require(_newPythOracle != address(0), "Invalid oracle");
        pythOracle = _newPythOracle;
    }
    
    /**
     * @notice Updates the remote chain ID for the bridge.
     * @param _newRemoteChainId The new remote chain ID.
     */
    function updateRemoteChainId(uint16 _newRemoteChainId) external onlyOwner {
        remoteChainId = _newRemoteChainId;
    }
    
    /**
     * @notice Allows contract to receive ETH needed for price updates and bridge fees.
     */
    receive() external payable {}
}
