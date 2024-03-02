// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

contract MyOwnableContract is Ownable {

    constructor() Ownable() {
        // Additional constructor logic for MyOwnable, if needed
    }

    event NotOwnerEvent(address caller, string message);

    modifier onlyCustomOwner() {
        if (_msgSender() != owner()) {
            emit NotOwnerEvent(_msgSender(), "Caller is not the contract owner");
        }
        //require(_msgSender() == owner(), "Not the owner");
        _;
        
    }
   
}