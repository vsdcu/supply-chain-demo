// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;

import "./ItemManager.sol";

contract Item {

    string identifier;
    uint public priceInWei;
    uint public index;
    uint public pricePaid;
    ItemManager parentContract;
    
    constructor (ItemManager _parentContract, string memory _identifier, uint _priceInWei, uint _index) {
        identifier = _identifier;
        priceInWei = _priceInWei;
        index = _index;
        parentContract = _parentContract;
    }

    receive() external payable {
        require(pricePaid == 0, "Price of item is already paid");
        require(priceInWei == msg.value, "Only full payments allowed, no partial payment");
        pricePaid += msg.value;
        (bool success, ) = address(parentContract).call{value:msg.value}(abi.encodeWithSignature("triggerPayment(uint256)", index));
        require(success, "The transaction wsn't successful, canceling");
    }

    fallback() external {}
}