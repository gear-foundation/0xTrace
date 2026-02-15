// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

contract BeerMarket {
    /// @notice The beer price is `0.00048 ETH`.
    uint256 public constant BEER_PRICE = 48 * 10 ** 13;

    event Purchase(uint256 beersAmount, address buyerAddress, uint256 tips);

    function buy() external payable {
        uint256 beersAmount = msg.value / BEER_PRICE;
        uint256 tips = msg.value % BEER_PRICE;

        emit Purchase(beersAmount, msg.sender, tips);
    }
}
