// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./Item.sol";

// Smart contract responsible for 
// 1. Item creation in the store
// 2. Buying an item from the store
// 3. Payment handling
// 4. Dispatching 
// 5. Tracking
// This uses openzepplin's Ownable contract to provide the access and ownership managemnt

contract ItemManager is Ownable {

    enum SupplyChainState {Created, Paid, Delivered}

    struct S_Item {
        Item _item;
        string _identifier;
        uint _itemPrice;
        ItemManager.SupplyChainState _state;
    }

    //mapping(uint => S_Item) public items;
    mapping(address => S_Item) public items;
    uint itemIndex;

    event SupplyChainStep(string _identifier, uint _step, address _itemAddress, uint _itemPrice);
    
    event MyLog(address _itemAddress, uint _itemPrice, uint _state, uint _payment);

    event ValidationMessage(string _message);

    event NotOwnerEvent(address _caller, string _message);

    function createItem(string memory _identifier, uint _itemPrice) public {
        if (_msgSender() != owner()) {
            emit NotOwnerEvent(_msgSender(), "Validation failure: Caller is not the contract owner");
            //require(_msgSender() == owner(), ">>> Not the owner");
        } else {
            Item item = new Item(this, _identifier, _itemPrice);

            //emit log(_identifier, _itemPrice, address(item), address(this));

            items[address(item)]._item = item;
            items[address(item)]._identifier = _identifier;
            items[address(item)]._itemPrice = _itemPrice;
            items[address(item)]._state = SupplyChainState.Created;

            emit SupplyChainStep(items[address(item)]._identifier, uint(items[address(item)]._state), address(item), _itemPrice);

            itemIndex++;
        }
    }

    function triggerPayment(address _itemAddress, uint _itemPrice) public payable {

        bool isValid = true;

        emit MyLog(_itemAddress, uint(items[_itemAddress]._itemPrice), uint(items[_itemAddress]._state), msg.value);

        if (_msgSender() == owner()) {

            emit NotOwnerEvent(_msgSender(), "Validation failure: You can't buy your own product!");
            isValid = false;
        } else {

            if(items[_itemAddress]._itemPrice != _itemPrice) {
                isValid = false;
                emit ValidationMessage("Onlyy full payments accepted");
            }
            
            if(items[_itemAddress]._state != SupplyChainState.Created) {
                isValid = false;
                emit ValidationMessage("Item is further in the chain");
            }

            //require(items[_itemAddress]._itemPrice == _itemPrice, "Onlyyyyy full payments accepted");
            //require(items[_itemAddress]._state == SupplyChainState.Created, "Item is further in the chain");
        
        }

        if(isValid) {
            items[_itemAddress]._state = SupplyChainState.Paid;
            emit SupplyChainStep(items[_itemAddress]._identifier, uint(items[_itemAddress]._state), address(items[_itemAddress]._item), items[_itemAddress]._itemPrice);
        } else {
            // Refund the transaction value (in wei) to the caller
            payable(_msgSender()).transfer(msg.value);
            return;
        }

    }

    // function triggerDelivery(uint _itemIndex) public onlyOwner {
    //     require(items[_itemIndex]._state == SupplyChainState.Paid, "Item need to be fully paid before delivery");
    //     items[_itemIndex]._state = SupplyChainState.Delivered;

    //     emit SupplyChainStep(_itemIndex, uint(items[_itemIndex]._state), address(items[_itemIndex]._item));

    // }


    function getTotalItemCount() public view returns (uint) {
        return itemIndex;
    }


    function getItem(address itemAddress) public view returns (string memory) {
        return items[itemAddress]._identifier;
    }

}