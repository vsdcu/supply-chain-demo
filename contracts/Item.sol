// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;

import "./ItemManager.sol";

contract Item {

    string identifier;
    uint public priceInWei;
    ItemManager parentContract;
    
    constructor (ItemManager _parentContract, string memory _identifier, uint _priceInWei) {
        identifier = _identifier;
        priceInWei = _priceInWei;
        parentContract = _parentContract;
    }

    // receive() external payable {
    //     require(pricePaid == 0, "Price of item is already paid");
    //     require(priceInWei == msg.value, "Only full payments allowed, no partial payment");
    //     pricePaid += msg.value;
    //     (bool success, ) = address(parentContract).call{value:msg.value}(abi.encodeWithSignature("triggerPayment(address)", this.address));
    //     require(success, "The transaction wsn't successful, canceling");
    // }

    // fallback() external {}
}