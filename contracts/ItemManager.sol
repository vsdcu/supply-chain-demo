// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;

import "./MyOwnableContract.sol";
import "./Item.sol";

contract ItemManager is MyOwnableContract {

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

    function createItem(string memory _identifier, uint _itemPrice) public onlyOwner {

        Item item = new Item(this, _identifier, _itemPrice);

        //emit log(_identifier, _itemPrice, address(item), address(this));

         items[address(item)]._item = item;
         items[address(item)]._identifier = _identifier;
         items[address(item)]._itemPrice = _itemPrice;
         items[address(item)]._state = SupplyChainState.Created;

        emit SupplyChainStep(items[address(item)]._identifier, uint(items[address(item)]._state), address(item), _itemPrice);

        itemIndex++;
    }

    function triggerPayment(address _itemAddress, uint _itemPrice) public payable {

        emit MyLog(_itemAddress, uint(items[_itemAddress]._itemPrice), uint(items[_itemAddress]._state), msg.value);

        require(items[_itemAddress]._itemPrice == _itemPrice, "Onlyyyyy full payments accepted");
        require(items[_itemAddress]._state == SupplyChainState.Created, "Item is further in the chain");

        items[_itemAddress]._state = SupplyChainState.Paid;

        emit SupplyChainStep(items[_itemAddress]._identifier, uint(items[_itemAddress]._state), address(items[_itemAddress]._item), items[_itemAddress]._itemPrice);

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