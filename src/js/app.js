App = {
  web3Provider: null,
  contracts: {},

  init: async function() {
    // Load items.
    $.getJSON('../stockitems.json', function(data) {
      var itemsRow = $('#itemsRow');
      var itemTemplate = $('#itemTemplate');

      for (i = 0; i < data.length; i ++) {
        itemTemplate.find('.panel-title').text(data[i].name);
        itemTemplate.find('img').attr('src', data[i].picture);
        itemTemplate.find('.item-condition').text(data[i].condition);
        itemTemplate.find('.item-category').text(data[i].category);
        itemTemplate.find('.item-cost').text(data[i].cost);
        itemTemplate.find('.btn-buy').attr('data-id', data[i].address);
        itemTemplate.find('.btn-dispatch').attr('data-id', data[i].address);
        itemTemplate.find('.btn-track').attr('data-id', data[i].address);

        itemsRow.append(itemTemplate.html());
      }
    });

    // Add script to toggle visibility of the create item section
    $(document).ready(function(){
      $(".btn-create-item-section").click(function(){
        $("#createItemSection").toggle();
      });
    });

    return await App.initWeb3();
  },

  initWeb3: async function() {

    /*
     * Instantiating web3
     */

      // Modern dapp browsers...
      if (window.ethereum) {
        App.web3Provider = window.ethereum;
        try {
          // Request account access
          await window.ethereum.enable();
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

    return App.initContract();
  },

  initContract: function() {
    /*
     * Instantiating the contract
     */

    $.getJSON('Adoption.json', function(data) {
      // Get the necessary contract artifact file and instantiate it with @truffle/contract
      var AdoptionArtifact = data;
      App.contracts.Adoption = TruffleContract(AdoptionArtifact);
    
      // Set the provider for our contract
      App.contracts.Adoption.setProvider(App.web3Provider);
    
      // Use our contract to retrieve and mark the adopted pets
      return App.markAdopted();
    });


    $.getJSON('ItemManager.json', function(data) {
      // Get the necessary contract artifact file and instantiate it with @truffle/contract
      var ItemManagerArtifact = data;
      App.contracts.ItemManager = TruffleContract(ItemManagerArtifact);
    
      // Set the provider for our contract
      App.contracts.ItemManager.setProvider(App.web3Provider);
    
      // Use our contract to retrieve and mark the adopted pets
      //return App.markAdopted(); TODO:// later
    });

    //alert("contracts deployed");

    return App.bindEvents();
  },

  bindEvents: function() {
    $(document).on('click', '.btn-buy', App.handleBuy);
    $(document).on('click', '.btn-create-item', App.handleCreate);
    
    $(document).ready(function() {
      App.getTotalItemsCount();
    });

    //wrapping in promise
    // (async function() {
    //   await new Promise(resolve => $(document).ready(resolve));
    //   await App.getTotalItemsCount();
    // })();

  },

  
  markAdopted: function() {
    /*
     * Mark already sold items...
     */

    var adoptionInstance;

    App.contracts.Adoption.deployed().then(function(instance) {
      adoptionInstance = instance;

      return adoptionInstance.getAdopters.call();
    }).then(function(adopters) {
      for (i = 0; i < adopters.length; i++) {
        if (adopters[i] !== '0x0000000000000000000000000000000000000000') {
          $('.panel-items').eq(i).find('button').text('Success').attr('disabled', true);
        }
      }
    }).catch(function(err) {
      console.log(err.message);
    });

  },

  handleBuy: function(event) {
    alert('handle buy'+$(event.target).data('id'));
    event.preventDefault();

    var petId = parseInt($(event.target).data('id')); // need to handle address of the item contract here later

    /*
     * Handling the adopt()...
     */
    var adoptionInstance;

    web3.eth.getAccounts(function(error, accounts) {
      if (error) {
        console.log(error);
      }

      var account = accounts[0];

      App.contracts.Adoption.deployed().then(function(instance) {
        adoptionInstance = instance;

        // Execute adopt as a transaction by sending account
        return adoptionInstance.adopt(petId, {from: account});
      }).then(function(result) {
        return App.markAdopted();
      }).catch(function(err) {
        console.log(err.message);
      });
    });

  },

  handleCreate: function(event) {
    event.preventDefault();

    // Fetch the values entered by the user in the textboxes
    var identifier = $("#i_identifier").val();
    var itemPrice = $("#i_price").val();
    var itemCategory = $("#i_category").val();
    var itemCondition = $("#i_condition").val();

    // Check if the values are valid
    if (!identifier || !itemPrice || !itemCategory || !itemCondition) {
      alert("All fields are required! "+identifier +" "+itemPrice+ " "+itemCategory+" "+itemCondition);
      return;
    }

    // Call the createItem function of your contract
    var itemManagerInstance;
    web3.eth.getAccounts(function(error, accounts) {
      if (error) {
        console.log(error);
      }

      var account = accounts[0];

      App.contracts.ItemManager.deployed().then(function(instance) {
        itemManagerInstance = instance;

        //alert("itemManagerInstance : " + itemManagerInstance + 
        //" name : "+identifier + " cost: " + itemPrice + " account: " + account);

        // Execute createItem as a transaction by sending account
        return itemManagerInstance.createItem(identifier, itemPrice, itemCategory, itemCondition, {from: account});

      }).then(function(result) {
        // Handle success, e.g., show a message or update the UI
        console.log("Item created successfully:", result);

        // Optionally, you can update the UI to display the newly created item
        // and refresh the item list by calling App.markAdopted();
      }).catch(function(err) {
        alert("error : " + err)
        // Handle error, e.g., show an error message
        console.error("Error creating item:", err.message);
      });
    });

  },

  
  getTotalItemsCount: function() {    
    // Call the createItem function of your contract
    var itemManagerInstance;
    web3.eth.getAccounts(function(error, accounts) {
      if (error) {
        console.log(error);
      }

      var account = accounts[0];

      App.contracts.ItemManager.deployed().then(function(instance) {
        itemManagerInstance = instance;

        const read = () => {
          return itemManagerInstance.getTotalItemCount.call({ from: account });
        };

        const resultPromise = read();
        resultPromise.then(resultVal => {
          alert("Total Item Count: " + resultVal);
          document.getElementById("itemCount").textContent = resultVal;
        }).catch(err => {
          alert("error resolving promise: "+err);
          console.error("error resolving promise: "+err);
        })  

        // Handle success, e.g., show a message or update the UI
        console.log("Item count retrieved successfully: ");

      }).then(function(result) {
        // Handle success, e.g., show a message or update the UI
        console.log("Item count fetched successfully: ");

        // Optionally, you can update the UI to display the newly created item
        // and refresh the item list by calling App.markAdopted();
      }).catch(function(err) {
        alert("error : " + err)
        // Handle error, e.g., show an error message
        console.error("Error creating item--:", err);
      });
    });   
  }

};

$(function() {
  $(window).load(function() {
    App.init();
    App.getTotalItemsCount();
  });
});
