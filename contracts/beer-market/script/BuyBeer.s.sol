// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.33;

import {Script} from "forge-std/Script.sol";
import {BeerMarket} from "src/BeerMarket.sol";

contract BuyBeerScript is Script {
    BeerMarket public beerMarket;

    function setUp() public {}

    function run() public {
        uint256 privateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(privateKey);

        beerMarket = BeerMarket(vm.envAddress("BEER_MARKET_ADDRESS"));
        beerMarket.buy{value: beerMarket.BEER_PRICE() * 11}();

        vm.stopBroadcast();
    }
}
