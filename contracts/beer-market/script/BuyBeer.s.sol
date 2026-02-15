// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script} from "forge-std/Script.sol";
import {Vm} from "forge-std/Vm.sol";
import {console} from "forge-std/console.sol";
import {BeerMarket} from "../src/BeerMarket.sol";

contract BuyBeerScript is Script {
    BeerMarket public market;

    function run() public {
        uint256 privateKey = vm.envUint("PRIVATE_KEY");
        address marketAddress = vm.envAddress("MARKET_ADDRESS");

        market = BeerMarket(marketAddress);

        // We want to buy 11 beers.
        uint256 beersPrice = market.BEER_PRICE() * uint256(11);
        uint256 beersPriceWithTips = beersPrice + market.BEER_PRICE() / 2;

        vm.startBroadcast(privateKey);

        market.buy{value: beersPriceWithTips}();

        vm.stopBroadcast();
    }
}
