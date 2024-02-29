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
        string _itemCategory;
        string _itemCondition;
        ItemManager.SupplyChainState _state;
    }

    mapping(uint => S_Item) public items;
    uint itemIndex;

    event SupplyChainStep(uint _itemIndex, uint _step, address _itemAddress, string _identifier, uint _itemPrice);
    //event log(string _identifier, uint _itemPrice, address _itemAddress, address _parentAddress);

    function createItem(string memory _identifier, uint _itemPrice, string memory _itemCategory, string memory _itemCondition) public onlyOwner {

        Item item = new Item(this, _identifier, _itemPrice, itemIndex);

        //emit log(_identifier, _itemPrice, address(item), address(this));

         items[itemIndex]._item = item;
         items[itemIndex]._identifier = _identifier;
         items[itemIndex]._itemPrice = _itemPrice;
         items[itemIndex]._itemCategory = _itemCategory;
         items[itemIndex]._itemCondition = _itemCondition;
         items[itemIndex]._state = SupplyChainState.Created;

        emit SupplyChainStep(itemIndex, uint(items[itemIndex]._state), address(item), _identifier, _itemPrice);

        itemIndex++;
    }

    // function triggerPayment(uint _itemIndex) public payable {
    //     require(items[_itemIndex]._itemPrice == msg.value, "Only full payments accepted");
    //     require(items[_itemIndex]._state == SupplyChainState.Created, "Item is further in the chain");

    //     items[_itemIndex]._state = SupplyChainState.Paid;

    //     emit SupplyChainStep(_itemIndex, uint(items[_itemIndex]._state), address(items[_itemIndex]._item));

    // }

    // function triggerDelivery(uint _itemIndex) public onlyOwner {
    //     require(items[_itemIndex]._state == SupplyChainState.Paid, "Item need to be fully paid before delivery");
    //     items[_itemIndex]._state = SupplyChainState.Delivered;

    //     emit SupplyChainStep(_itemIndex, uint(items[_itemIndex]._state), address(items[_itemIndex]._item));

    // }


    function getTotalItemCount() public view returns (uint) {
        return itemIndex;
    }

}