// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

contract MyOwnableContract is Ownable {

    constructor() Ownable() {
        // Additional constructor logic for MyOwnable, if needed
    }

}