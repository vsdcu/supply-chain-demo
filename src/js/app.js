App = {
  web3Provider: null,
  contracts: {},
  processedEventsMap: {},

  /**
   * 
   * Application init
   */
  init: async () => {
    //console.log("---------init---------");

    // Add script to toggle visibility of the create item section
    $(document).ready(function () {
      $(".btn-create-item-section").click(function () {
        $("#createItemSection").toggle();
      });
    });

    return await App.initWeb3();
    
  },


   /*
    * Instantiating web3
    */
  initWeb3: async () => {
    //console.log("---------initWeb3---------");
  
    // Modern dapp browsers...
    if (window.ethereum) {
      App.web3Provider = window.ethereum;
      try {
        // Request account access
        App.web3Provider.request({ method: 'eth_requestAccounts' })
        .then((accounts) => {
          // Handle the returned accounts
          console.log('Connected accounts:', accounts);
        })
        .catch((error) => {
          // Handle errors or user rejection
          console.error('Error requesting accounts:', error);
        });
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

  /**
   * 
   * Initialization of all contracts used in the application.
   */
  initContract: async () => {
    //console.log("---------init contract---------");

    // Main smart contract
    $.getJSON('ItemManager.json', function (data) {
      // Get the necessary contract artifact file and instantiate it with @truffle/contract
      var ItemManagerArtifact = data;
      App.contracts.ItemManager = TruffleContract(ItemManagerArtifact);

      // Set the provider for contract
      App.contracts.ItemManager.setProvider(App.web3Provider);

    });

    return await App.bindEvents();
  },

  /**
   * Initializing different action buttons and their onclick operations.
   */
  bindEvents: async () => {
    //console.log("---------bind---------");
    $(document).on('click', '.btn-buy', App.handleBuy);
    $(document).on('click', '.btn-create-item', App.handleCreate);
    $(document).on('click', '.btn-dispatch', App.handleDispatch);
    $(document).on('click', '.btn-track', App.trackingItem);

    $(document).ready(function () {
      //await App.getTotalItemCount(); //fetch the total items present [read state from the blockchain]
      App.loadItems(); //re-renders the UI with data (if manually refreshed)
    });
  },

  /**
   * function used for loading the items on the landing webpage. It fetches existing data from the local storage and display on the page.
   * currently, it doesn't fetch the data from the blockchain initially but this can be done in future to load the initial view from the 
   * Blockchain itself. 
   */
  loadItems: async () => {
    //console.log("---------load---------");
    // manual browser refresh handling

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
      await App.getTotalItemCount(); //fetch the total items present [read state from the blockchain]
    } else {
      console.log('No data found in localStorage.');
    }
    
  },

  // Function to check if eventId is processed
  isEventProcessed: (eventId) => {
    return App.processedEventsMap[eventId] === true;
  },

  // Function to mark eventId as processed
  markEventAsProcessed: (eventId) => {
    App.processedEventsMap[eventId] = true;
  },


  /**
   * 
   * function to handle the dispatch operation. Invokes the contract's function 'triggerDelivery'
   * this operation commits a transaction on blockchain and confirms that the item state is changed to Delivered after payment is done.
   */
  handleDispatch: (event) => {
    console.log("Dispatch call....", $(event.target).data());
    event.preventDefault();

    var itemManagerInstance;
    var itemAddress = $(event.target).data('id');

    web3.eth.getAccounts(function (error, accounts) {
      if (error) {
        console.log(error);
      }

      var account = accounts[0];
      App.contracts.ItemManager.deployed().then(function (instance) {

        itemManagerInstance = instance;
        // Execute dispatch as a transaction, it will modify the state of item on blockchain;
        return instance.triggerDelivery(itemAddress, { from: account });

      }).then(response => {
        // Handle successful transaction here
        console.log("Response:", response);
        if (response.receipt.status === '0x1') {
          document.getElementById("contract-notification").textContent = "";
          //document.getElementById("notification-container").display = none;
          //$("#notification-container").hide();
          // successful transaction not necessarly means successful dispatch, we will need to verify through generated events.
          itemManagerInstance.allEvents((error, event) => {
            if (error) {
              console.error("Error listening to create events:", error);
            } else {
              console.log("Received event:", event.event, "Data: ", event.args);

              // validation and success checks, we are only interested in dispatch related events now.
              if (event.event == "DispatchEvent" || event.event == "InvalidDispatcher") {
                document.getElementById("contract-notification").textContent = event.args._message; // UI-notifications added
              } else {
                //commenting as we don't have anything to update in this case yet
                //App.updateUIComponents(response, {});
              }
            }
          });
        } else {
          console.error("Transaction was not successful. Status:", response.receipt.status);
        }  

      }).catch(error => {
          console.error("===> error:: ", error);
      });


    });  


  },

  /**
   * 
   * function to handle the buy operation. Invokes the contract's function 'triggerPayment' which is a payable function to accept the funds.
   * this operation commits a transaction on blockchain and confirms that the item state is changed to Paid after successful payment is done.
   */
  handleBuy: (event) => {
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
              if (event.event == "NotOwnerEvent" || event.event == "ValidationMessage" || event.event == "InvalidDispatcher") {
                document.getElementById("contract-notification").textContent = event.args._message; // UI-notifications added
              } else if(event.event == "BuyEvent") {
                document.getElementById("contract-notification").textContent = event.args._message; // UI-notifications added
                // itetate over stored items for itemAddress and change the flag to sold, to show up on UI.
              } else {
                console.error("Unknown event found!");
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

  /**
   * 
   * function to handle the create-item operation. Invokes the contract's function 'createItem' which is responsible for initiating another contract name `Item`.
   * Item contract generates a new item instance which represent a unique item having its own unique address. All of the operations rel;ated to item are done using this item address later.
   * this operation commits a transaction on blockchain and confirms that a new item it generated with user given values and its state is set to create after successful transaction is done.
   */
  handleCreate: (event) => {
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

      console.log("web3 accounts array:: ", accounts);

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
                // this was done to stop re-adding items to UI, this could happen as we are listening for allEvents.
                // would have been better if we could get selective events in this case. todo later
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
  updateUIComponents: async (event, staticValues) => {

    console.log("Updating UI components: ", event, staticValues);
    document.getElementById("contract-notification").textContent = "";
    // Initialize or retrieve existing data array from localStorage
    const existingData = JSON.parse(localStorage.getItem('myData')) || [];
    const randomItemPicturePath = App.getRandomItemPicture();
    const dataToStore = {
      "id": 0,
      "name": event.args._identifier,
      "picture": randomItemPicturePath,
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
    itemTemplate.find('img').attr('src', randomItemPicturePath);
    itemTemplate.find('.item-condition').text(staticValues.itemCondition);
    itemTemplate.find('.item-category').text(staticValues.itemCategory);
    itemTemplate.find('.item-cost').text(event.args._itemPrice);
    itemTemplate.find('.btn-buy').attr('data-id', event.args._itemAddress).attr('data-cost', event.args._itemPrice);
    itemTemplate.find('.btn-dispatch').attr('data-id', event.args._itemAddress);
    itemTemplate.find('.btn-track').attr('data-id', event.args._itemAddress);

    itemsRow.append(itemTemplate.html());

    await App.getTotalItemCount();

  },


  /**
   * 
   * function to handle the tracking operation. Invokes the contract's function 'trackItem' which is a view function and do not modify the state of the blockchain.
   * this fucntion is called through the low-level APIs i.e. 'call()' funtion. 
   * this operation do not commit any transaction on blockchain and fetche the current state of the item from blockchain.
   */
  trackingItem: async (event) => {
    console.log("Tracking call....", $(event.target).data());
    event.preventDefault();

    var itemAddress = $(event.target).data('id');

      // Get the deployed instance
      App.contracts.ItemManager.deployed().then(function (instance) {
        // Call trackItem
        instance.trackItem.call(itemAddress).then(response => {
          console.log("response: ", response);
          
          // Update UI for total number of items present on blockchain
          document.getElementById("contract-notification").textContent = response;
        }).catch(function (err) {
          // Handle error
          console.error("error resolving promise: " + err);
        });
      }).catch(err => {
        // Handle error during contract deployment
        alert("error : " + err);
        console.error("Error tracking item--:", err);
      });
  },

  // function to retrieve the total items present on Blockchain at any time, (sync with blockchain state)
  /**
   * 
   * function to retrieve the total items present on Blockchain at any time, (sync with blockchain state). 
   * It invokes the contract's function 'getTotalItemCount' which is a view function and do not modify the state of the blockchain.
   * this fucntion is called through the low-level APIs i.e. 'call()' function. Hence, do not commit any transaction on blockchain.
   */
  getTotalItemCount: () => {
    //console.log("gettotalitems");
    // Get the accounts
    web3.eth.getAccounts(function (error, accounts) {
      if (error) {
        console.log(error);
        reject(error);
        return;
      }

      // Get the deployed instance
      App.contracts.ItemManager.deployed().then(instance => {
        // Call getTotalItemCount
        instance.getTotalItemCount.call().then(response => {
          console.log("get_total_item response: ", response);
          // also storing it in local storagee for quick recall
          localStorage.setItem('totalItemCount', JSON.stringify(response));              

          // Update UI for total number of items present on blockchain
          document.getElementById("itemCount").textContent = localStorage.getItem('totalItemCount');
         
        }).catch(function (err) {
          // Handle error during getTotalItemCount
          console.error("error resolving promise: " + err);
        });
      }).then(result => {
        console.log("Item count fetched successfully from Blockchain! ", result);
      }).catch(err => {
        // Handle error during contract deployment
        alert("error : " + err);
        console.error("Error get count item--:", err);
      });
    });
  },

  getRandomItemPicture: () => {
     const picturesArray = ['images/free/deco-5.jpeg','images/free/deco-6.jpeg','images/free/deco-7.jpeg','images/free/deco-8.jpeg',
    'images/free/deco-9.jpeg','images/free/deco-10.jpeg','images/free/deco-11.jpeg','images/free/deco-12.jpeg','images/free/deco-13.jpeg',
    'images/free/deco-14.jpeg','images/free/deco-15.jpeg','images/free/deco-16.jpeg','images/free/deco-17.jpeg','images/free/deco-18.jpeg',
    'images/free/deco-19.jpeg','images/free/deco-20.jpeg'];
  
    // Get a random index from the array
    const randomIndex = Math.floor(Math.random() * picturesArray.length);
  
    // Return the string at the randomly picked index
    return picturesArray[randomIndex];
  }

};

/**
 * window load function to call application init. Start of application.
 */
$(function () {
  $(window).load(() => {
    App.init();
  });
});
