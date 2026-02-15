// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.33;

contract BeerMarket {
    uint256 public constant BEER_PRICE = 0.00048 ether;

    event Purchase(uint256 beersAmount, address buyerAddress, uint256 tips);

    function buy() external payable {
        uint256 beersAmount = msg.value / BEER_PRICE;
        uint256 tips = msg.value % BEER_PRICE;

        emit Purchase(beersAmount, msg.sender, tips);
    }
}
