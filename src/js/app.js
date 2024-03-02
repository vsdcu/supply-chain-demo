App = {
  web3Provider: null,
  contracts: {},
  processedEventsMap: {},

  init: async function () {

    //const web3utils = require('web3-utils');

    // Add script to toggle visibility of the create item section
    $(document).ready(function () {
      $(".btn-create-item-section").click(function () {
        $("#createItemSection").toggle();
      });
    });

    return await App.initWeb3();
  },

  initWeb3: async function () {

    /*
     * Instantiating web3
     */

    // Modern dapp browsers...
    if (window.ethereum) {
      App.web3Provider = window.ethereum;
      try {
        // Request account access
        await window.ethereum.eth_requestAccounts;
      } catch (error) {
        // User denied account access...
        console.error("User denied account access")
      }
    }
    // Legacy dapp browsers...
    else if (window.web3) {
      App.web3Provider = window.web3.currentProvider;
    }
    // If no injected web3 instance is detected, fall back to Ganache
    else {
      App.web3Provider = new Web3.providers.HttpProvider('http://localhost:7545');
    }
    web3 = new Web3(App.web3Provider);

    return await App.initContract();
  },

  initContract: async function () {
    /*
     * Instantiating the contracts
     */
    $.getJSON('ItemManager.json', function (data) {
      // Get the necessary contract artifact file and instantiate it with @truffle/contract
      var ItemManagerArtifact = data;
      App.contracts.ItemManager = TruffleContract(ItemManagerArtifact);

      // Set the provider for contract
      App.contracts.ItemManager.setProvider(App.web3Provider);

    });

    return await App.bindEvents();
  },

  bindEvents: async function () {
    $(document).on('click', '.btn-buy', App.handleBuy);
    $(document).on('click', '.btn-create-item', App.handleCreate);

    $(document).ready(async function () {
      await App.getTotalItemCount(); //fetch the total items present [read state from the blockchain]
      await App.loadItems(); //re-renders the UI with data (if manually refreshed)
    });
  },

  loadItems: async function () {
    // manual browser refresh handling
    console.log("loadItems");

    // To retrieve data from local browser storage
    const storedData = localStorage.getItem('myData');
    if (storedData) {
      const data = JSON.parse(storedData);
      console.log("Data from localstorage:", data);

      //static data loading
      //$.getJSON('../stockitems.json', function(data) {
      var itemsRow = $('#itemsRow');
      var itemTemplate = $('#itemTemplate');

      for (i = 0; i < data.length; i++) {
        itemTemplate.find('.panel-title').text(data[i].name);
        itemTemplate.find('img').attr('src', data[i].picture);
        itemTemplate.find('.item-condition').text(data[i].condition);
        itemTemplate.find('.item-category').text(data[i].category);
        itemTemplate.find('.item-cost').text(data[i].cost);
        itemTemplate.find('.btn-buy').attr('data-id', data[i].address).attr('data-cost', data[i].cost);
        itemTemplate.find('.btn-dispatch').attr('data-id', data[i].address);
        itemTemplate.find('.btn-track').attr('data-id', data[i].address);

        itemsRow.append(itemTemplate.html());
      }
      //});

    } else {
      console.log('No data found in localStorage.');
    }
  },

  // Function to check if eventId is processed
  isEventProcessed: function (eventId) {
    return App.processedEventsMap[eventId] === true;
  },

  // Function to mark eventId as processed
  markEventAsProcessed: function (eventId) {
    App.processedEventsMap[eventId] = true;
  },

  // function to handle the buy item ops
  handleBuy: function (event) {
    console.log("Complete Data Object:", $(event.target).data());
    event.preventDefault();

    var itemManagerInstance;
    var itemAddress = $(event.target).data('id');
    var itemPrice = $(event.target).data('cost');

    web3.eth.getAccounts(function (error, accounts) {
      if (error) {
        console.log(error);
      }

      var account = accounts[0];
      //console.log("buyer's account:", account);
      //console.log("itemAddress: " + itemAddress + " itemPrice: " + itemPrice);
      App.contracts.ItemManager.deployed().then(function (instance) {

        itemManagerInstance = instance;
        // Execute buy as a transaction by sending account
        return instance.triggerPayment(itemAddress, itemPrice, { from: account, value: web3.utils.toWei("" + itemPrice) });

      }).then(response => {
        // Handle successful transaction here
        console.log("Response:", response);
        if (response.receipt.status === '0x1') {
          document.getElementById("contract-notification").textContent = "";
          //console.log("Transaction successful! : ", response.receipt.transactionHash);

          // successful transaction not necessarly means successful buy, need to check on events if there was a server side failure/restriction
          itemManagerInstance.allEvents((error, event) => {
            if (error) {
              console.error("Error listening to create events:", error);
            } else {
              console.log("Received event:", event.event, "Data: ", event.args);

              // vaslidation and restrictions checks, only non-owner (creator) can buy items, you can't buy our own stuff!
              if (event.event == "NotOwnerEvent" || event.event == "ValidationMessage") {
                document.getElementById("contract-notification").textContent = event.args._message; // UI-notifications added
              } else {
                //commenting as we don't have anything to update in this case yet
                //App.updateUIComponents(response, {});
              }
            }
          });
        } else {
          console.error("Transaction failed. Status:", response.receipt.status);
        }
      }).catch(async function (err) {
        console.log("err while triggerPayment : ", err);
      });

    });

  },

  // function tp handle the creation of new item
  handleCreate: function (event) {
    event.preventDefault();

    // Fetch the values entered by the user in the textboxes on UI
    var identifier = $("#i_identifier").val();
    var itemPrice = $("#i_price").val();
    var itemCategory = $("#i_category").val();
    var itemCondition = $("#i_condition").val();

    // Check if the values are valid
    if (!identifier || !itemPrice || !itemCategory || !itemCondition) {
      alert("All fields are required! ");
      console.error("All fields are required! ", "Item Name: " + identifier, " Price: " + itemPrice + " Category: " + itemCategory, " Condition: " + itemCondition);
      return;
    }

    // Call the createItem function of your contract
    var itemManagerInstance;
    web3.eth.getAccounts(function (error, accounts) {
      if (error) {
        console.log(error);
      }

      var account = accounts[0];

      App.contracts.ItemManager.deployed().then(function (instance) {
        itemManagerInstance = instance;

        // Execute createItem as a transaction by sending account
        return itemManagerInstance.createItem(identifier, itemPrice, { from: account });

      }).then(response => {
        console.log("CreateItem response: ", response);

        if (response.receipt.status === '0x1') {
          //console.log("Transaction --receipt: ", response.receipt);
          //Event checking
          itemManagerInstance.allEvents((error, event) => {
            if (error) {
              console.error("Error listening to create events:", error);
            } else {
              console.log("Received event:", event.event, "Data: ", event.args);
              if (event.event === "NotOwnerEvent" || event.event === "ValidationMessage") {
                document.getElementById("contract-notification").textContent = event.args._message;
              } else if (event.event === "SupplyChainStep") {
                if (!App.isEventProcessed(event.args._itemAddress)) {
                  App.markEventAsProcessed(event.args._itemAddress);
                  App.updateUIComponents(event, { itemCondition, itemCategory });
                }
              }
            }
          });

        } else {
          console.error("Transaction failed. Status:", response.receipt.status);
        }

      }).catch(async function (err) {
        alert("err:", err);

      });

    });
  },

  // function to update the UI dynamically as soon as a new item is added to the blockchain; 
  // updation depends on the events emitted bu the smart contract. 
  // UI listen to these events and update itself dynamically, also pushes the data to the storage for persistance (currently browser's local storage) 
  updateUIComponents: async function (event, staticValues) {

    console.log("Updating UI components: ", event, staticValues);
    document.getElementById("contract-notification").textContent = "";
    // Initialize or retrieve existing data array from localStorage
    const existingData = JSON.parse(localStorage.getItem('myData')) || [];
    const dataToStore = {
      "id": 0,
      "name": event.args._identifier,
      "picture": "images/free/mobile-2.jpeg",
      "condition": staticValues.itemCondition,
      "category": staticValues.itemCategory,
      "cost": event.args._itemPrice,
      "address": event.args._itemAddress,
      "step": event.args._step
    };

    // Add new data to the array
    existingData.push(dataToStore);

    // Store the updated array back in localStorage of browser
    localStorage.setItem('myData', JSON.stringify(existingData));

    // Just to check the stored data
    // const storedData = localStorage.getItem('myData');
    // if (storedData) {
    //   const parsedData = JSON.parse(storedData);
    //   console.log("Check Data in localstorage:", parsedData);
    // } else {
    //   console.log('No data found in localStorage.');
    // }

    // fetch the newly created item from the event log of contract and update the UI.
    // console.log("Item created successfully:", result.logs[0].args._identifier);
    // console.log("Item created successfully:", result.logs[0].args._itemPrice.c[0]);
    // console.log("Item created successfully:", result.logs[0].args._itemAddress);

    // updating UI components
    var itemsRow = $('#itemsRow');
    var itemTemplate = $('#itemTemplate');

    itemTemplate.find('.panel-title').text(event.args._identifier);
    itemTemplate.find('img').attr('src', "images/free/mobile-2.jpeg");
    itemTemplate.find('.item-condition').text(staticValues.itemCondition);
    itemTemplate.find('.item-category').text(staticValues.itemCategory);
    itemTemplate.find('.item-cost').text(event.args._itemPrice);
    itemTemplate.find('.btn-buy').attr('data-id', event.args._itemAddress).attr('data-cost', event.args._itemPrice);
    itemTemplate.find('.btn-dispatch').attr('data-id', event.args._itemAddress);
    itemTemplate.find('.btn-track').attr('data-id', event.args._itemAddress);

    itemsRow.append(itemTemplate.html());

    await App.getTotalItemCount();

  },


  // function to retrieve the total items present on Blockchain at any time, (sync with blockchain state)
  getTotalItemCount: async function () {
    console.log("gettotalitems");
    // Get the accounts
    web3.eth.getAccounts(function (error, accounts) {
      if (error) {
        console.log(error);
        reject(error);
        return;
      }

      var account = accounts[0];

      // Get the deployed instance
      App.contracts.ItemManager.deployed().then(function (instance) {
        // Call getTotalItemCount
        instance.getTotalItemCount.call().then(response => {
          console.log("response: ", response);
          // also storing it in local storagee for quick recall
          localStorage.setItem('totalItemCount', JSON.stringify(response));              

          // Update UI for total number of items present on blockchain
          document.getElementById("itemCount").textContent = localStorage.getItem('totalItemCount');
         
        }).catch(function (err) {
          // Handle error during getTotalItemCount
          console.error("error resolving promise: " + err);
        });
      }).then(result => {
        console.log("Item count fetched successfully from Blockchain!");
      }).catch(err => {
        // Handle error during contract deployment
        alert("error : " + err);
        console.error("Error creating item--:", err);
      });
    });
  },

};

$(function () {
  $(window).load(function () {
    App.init();
  });
});
