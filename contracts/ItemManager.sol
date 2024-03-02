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
//emit DispatchEvent(items[_itemAddress]._identifier, items[_itemAddress]._state, items[_itemAddress]._itemAddress, "Dispatch success: "+items[_itemAddress]._identifier+" is out for delivery!");
    event DispatchEvent(string _identifier, uint _state, address _itemAddress, string _message);

//emit NotRightOwnerEvent(_itemAddress, _msgSender(), "Dispatch failure: Only contract owner can initiate the delivery!");
    event InvalidDispatcher(address _itemAddress, address _msgSender, string _message);

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
                emit ValidationMessage("Only full payments accepted");
            }
            
            if(items[_itemAddress]._state != SupplyChainState.Created) {
                isValid = false;
                emit ValidationMessage("Item is already sold, further in the chain for dispatch!");
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

    function triggerDelivery(address _itemAddress) public {
        //require(items[_itemIndex]._state == SupplyChainState.Paid, "Item need to be fully paid before delivery");
        
        if (_msgSender() != owner()) {
            emit InvalidDispatcher(_itemAddress, _msgSender(), "Dispatch failure: Only contract owner can initiate the delivery!");
        } else {
            if(items[_itemAddress]._state == SupplyChainState.Created) {
                emit InvalidDispatcher(_itemAddress, _msgSender(), "Dispatch failure: Item not fully paid yet!");
            } else if(items[_itemAddress]._state == SupplyChainState.Delivered) {
                emit InvalidDispatcher(_itemAddress, _msgSender(), "Dispatch failure: Item is already out for delivery!");
            } else {
                items[_itemAddress]._state = SupplyChainState.Delivered;
                string memory customMsg = concatenateStrings("Dispatch success: ", items[_itemAddress]._identifier);
                customMsg = concatenateStrings(customMsg, " is out for delivery!");
                emit DispatchEvent(items[_itemAddress]._identifier, uint(items[_itemAddress]._state), _itemAddress, customMsg);
            }
        }
    }

    function concatenateStrings (string memory str1, string memory str2) public pure returns (string memory) {
        return string(abi.encodePacked(str1, str2));
    }

    function getTotalItemCount() public view returns (uint) {
        return itemIndex;
    }


    function getItem(address itemAddress) public view returns (string memory) {
        return items[itemAddress]._identifier;
    }

}