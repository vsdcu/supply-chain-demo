// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./Item.sol";

// Smart contract responsible for 
// 1. Item creation in the store
// 2. Buying an item from the store
// 3. Payment handling
// 4. Payment refunds
// 4. Dispatching 
// 5. Tracking
// This uses openzepplin's Ownable contract to provide the access and ownership managemnt

contract ItemManager is Ownable {

    enum SupplyChainState {Created, Paid, Delivered}

    // Struct to keep track of different steps in supply-chian
    struct S_Item {
        Item _item;
        string _identifier;
        uint _itemPrice;
        ItemManager.SupplyChainState _state;
    }

    // map to keep items {itemAddres => Item}
    mapping(address => S_Item) public items;

    uint itemIndex;

    // different events definitions used across application
    
    event MyLog(address _itemAddress, uint _itemPrice, uint _state, uint _payment);

    event SupplyChainStep(string _identifier, uint _step, address _itemAddress, uint _itemPrice);

    event ValidationMessage(string _message);

    event NotOwnerEvent(address _caller, string _message);

    event DispatchEvent(string _identifier, uint _state, address _itemAddress, string _message);

    event InvalidDispatcher(address _itemAddress, address _msgSender, string _message);

    event TrackingEvent(string _identifier, uint _state, address _itemAddress, string _message);

    /** function to create a new Item in system.
    
    only owner of the contract is allowed to add new stock currently, however this can functionality can be extended further in future
    to allow other clients to add their own stuff for lets say selling/exchanging own products. Specific, Admin like users can also be allowed
    to handle the creation of items in future here. 
    
    _note Currently, deployer accountn of the contract will become the owner and hence thta account only will be allowed to add new items.
    
    this function uses openzepplin ownable contract to validate the ownership.
    
    It uses another Item.sol contract which represent an Item object in the system. 

    state of the newly created items would be set as "Created" initially on blockchain 
    and down the supply chain it will be modified as item moves to reflet the current stage.

    */
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


    /** function is used to trigger the payment for an item.
    
    when user clicks on the buy button on UI this method gets invoked on smart contract which is a payable function and accepts
    the payment. 

    it validted and allow transations only if the sender is not the owner of the item, You cannot buy your own stuff. Account used to create the items
    cannot be used to buy the items. Again, ownership is checked.

    it also validated the sent amount is equal to the total item value. This functionality can also be extended in future to allow to buy the items 
    on installments or maybe friction of item. currently only full price needs to be paid to buy an item.

    this function also make sure to refund the amount to the caller account in case there was any validation failure while making the buy request.
    
    _note: transaction will be treated as a successful transaction and gas fee will be paid, even if there was any validation failure for example user tried to
    buy an item which was already sold. Because for metamask percpective it was a legitimate attempt to invoke the blockchain function. However, our application 
    make sure to refund the _msg.value (price) back to the user wallet.
    
    In future, we can extend this functionality via UI interface to not allow such transactions by reading the 
    current state of item on blockchain. 
    
    */
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

    /** function to handle the delivery of the item.
    
    function gets invoked when user (owner) clicks on the dispatch button on UI. This validates the current state of the item which 
    must be fully "Paid" before it can be marked as dispatch. 

    Creater of the item is only allowed to dispatch the item, this is validated through the ownership checks. Buyer account cannot initittae the dispatch of item.
    In future, we can extend it to allow other users too, let's say "Admin" users of delivery departments which have rights to check and dispatch the items.
    currently it is restricted to the creator account of item only.
    
    This function moves the item further on supply chain by changing its state to "Delivered" post successful validations.

     */
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

    /** function to track the status of an Item.

        it is a view function which just reads the blockchain state, just read-only. No transaction involved
        checks the item state and revert the messgae to caller accordingly.
        
        tracking is not restricted as anyone can look inot the status of an item.
        In future we maywant to restrict it to the buyer and seller of the item only. 
     */
    function trackItem(address _itemAddress) public view returns (string memory) {

        //emit MyLog(_itemAddress, items[_itemAddress]._itemPrice, uint(items[_itemAddress]._state), 1000);

        string memory customMsg = concatenateStrings("Tracking status: ", items[_itemAddress]._identifier);
        if(items[_itemAddress]._state == SupplyChainState.Created) {
            customMsg = concatenateStrings(customMsg, " is still unsold!");
        } else if(items[_itemAddress]._state == SupplyChainState.Paid) {
            customMsg = concatenateStrings(customMsg, " is sold but not yet dispatched!");
        } else if(items[_itemAddress]._state == SupplyChainState.Delivered) {
            customMsg = concatenateStrings(customMsg, " is dispatched and out for delivery!");
        } else {
            customMsg = concatenateStrings(customMsg, " has unknown status, Apologies!");
        }
        
        return customMsg;
   
    }

    /** Utility method to concatanate strings, used to prepare custom user friendly msgs.
        Pure method nothing to do with blockchain
     */
    function concatenateStrings (string memory str1, string memory str2) public pure returns (string memory) {
        return string(abi.encodePacked(str1, str2));
    }

    /** function to retrieve total number of items present on blockchain.
        It is a view function which reads the current state of blockchain, that can be used on UI to determone total items.

        In future, we will extend this method functionality to read more item specific information for example Item.state, to provide richer
        information on tje UI to user. 
     */
    function getTotalItemCount() public view returns (uint) {
        return itemIndex;
    }


    /** function to read individual item from the blockchain. Currently just returning name of the item.
        Later, will be used to return the complete item object with its all attributes.
     */
    function getItem(address itemAddress) public view returns (string memory) {
        return items[itemAddress]._identifier;
    }

}