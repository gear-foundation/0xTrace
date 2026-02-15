// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.33;

import {Test} from "forge-std/Test.sol";
import {BeerMarket} from "src/BeerMarket.sol";

contract BeerMarketTest is Test {
    BeerMarket public beerMarket;

    function setUp() public {
        beerMarket = new BeerMarket();
    }

    function test_Buy() public {
        beerMarket.buy{value: beerMarket.BEER_PRICE() * 11}();
    }
}
