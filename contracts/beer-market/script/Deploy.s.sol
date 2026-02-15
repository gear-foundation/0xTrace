// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script} from "forge-std/Script.sol";
import {Vm} from "forge-std/Vm.sol";
import {console} from "forge-std/console.sol";
import {BeerMarket} from "../src/BeerMarket.sol";

contract DeployScript is Script {
    function run() public {
        uint256 privateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(privateKey);

        BeerMarket market = new BeerMarket();
        address marketAddress = address(market);

        console.log("Beer market deployed at:");
        console.log("   ", marketAddress);

        vm.stopBroadcast();
    }
}
