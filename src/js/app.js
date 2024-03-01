App = {
  web3Provider: null,
  contracts: {},

  init: async function() {

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
      App.loadItems();
    });

    //wrapping in promise
    // (async function() {
    //   await new Promise(resolve => $(document).ready(resolve));
    //   await App.getTotalItemsCount();
    // })();

  },

loadItems: function() {
  console.log("loadItems");
    // Load items

    // To retrieve data
    const storedData = localStorage.getItem('myData');
    if (storedData) {
      const data = JSON.parse(storedData);
      console.log("Data from localstorage:", data);

      //$.getJSON('../stockitems.json', function(data) {
        var itemsRow = $('#itemsRow');
        var itemTemplate = $('#itemTemplate');
  
        for (i = 0; i < data.length; i ++) {
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



//   loadItems: function() {
//     console.log("loadItems");
//         // Get the accounts
//         web3.eth.getAccounts(function(error, accounts) {
//           if (error) {
//             console.log(error);
//             reject(error);
//             return;
//           }
    
//           var account = accounts[0];
//     App.getTotalItemsCount().then(result => {
//       console.log("totalItems :: " + result);
//       console.log("----> Total Item Count: " + result);
//       document.getElementById("itemCount").textContent = result;
  
//       let promises = [];
  
//       for (let i = 0; i < result; i++) {
//         // calling contract
//         let promise = App.contracts.ItemManager.deployed().then(function(instance) {
//           console.log("calling...");
//           const itemPromise =  instance.getItem.call(i, {from:account});
//           console.log("itemProimse fetched: " + itemPromise);
//         }).then(result => {
//           console.log("vinit [" + i + "] ==>> ", result);
//         }).catch(error => {
//           // Handle errors here
//           console.error("Error getting item:", error);
//         });
  
//         promises.push(promise);
//       }
  
//       // Ensure all promises are settled before proceeding
//       return Promise.all(promises);
//     }).then(() => {
//       console.log("All promises settled successfully");
//     }).catch(error => {
//       // Handle errors here
//       console.error("loading error: Error getting total item count:", error);
//     });
//   });
// },
  
  // loadItems: function() {
  //   alert("loadItems");
  //   App.getTotalItemsCount().then(result => {
  //     alert("totalItems :: " + result);
  //     console.log("----> Total Item Count: " + result);
  //     document.getElementById("itemCount").textContent = result;

  //     for(i=0; i< result; i++){
  //       //calling contract
  //       App.contracts.ItemManager.deployed().then(function(instance) {
  //         alert("calling...");
  //         instance.getItem.call();
  //       }).then(result => {
  //           console.log("vinit [" + i + "] ==>> ", result);
  //       })
  //     }


  //   }).catch(error => {
  //     // Handle errors here
  //     console.error("loading error : Error getting total item count:", error);
  //   });


  //   // App.contracts.ItemManager.deployed().then(function(instance) {
    
  //   //   alert(instance);
  //   //   //return itemManagerInstance.getItem.call();
  //   // }).then(function(adopters) {
  //   //   alert("ttttt");
  //   //   // for (i = 0; i < adopters.length; i++) {
  //   //   //   if (adopters[i] !== '0x0000000000000000000000000000000000000000') {
  //   //   //     $('.panel-items').eq(i).find('button').text('Success').attr('disabled', true);
  //   //   //   }
  //   //   // }
  //   // }).catch(function(err) {
  //   //   console.log(err.message);
  //   // });

  // },

  handleBuy: function(event) {
    //alert('handle buy ' + $(event.target).data('id'));
    console.log("Complete Data Object:", $(event.target).data());
    event.preventDefault();

    var itemAddress = $(event.target).data('id');
    var itemPrice = $(event.target).data('cost');

    web3.eth.getAccounts(function(error, accounts) {
       if (error) {
         console.log(error);
       }

       var account = accounts[0];
       console.log("buyer's account:", account);
       console.log("itemAddress: " + itemAddress + " itemPrice: " + itemPrice);
       App.contracts.ItemManager.deployed().then(function(instance) {
    
        // Execute buy as a transaction by sending account
        return instance.triggerPayment(itemAddress, itemPrice, { from: account, value: itemPrice });
       }).then(response => {
        // Handle successful transaction here
        console.log("Response:", response);
        if (response.receipt.status === '0x1') {
           console.log("Transaction successful! TransactionHash: ", response.receipt.transactionHash);
        } else {
           console.error("Transaction failed. Status:", response.receipt.status);
        }
      })
      .catch(error => {
        // Handle transaction error here
        console.error("Transaction error:", error);
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

        // Execute createItem as a transaction by sending account
        return itemManagerInstance.createItem(identifier, itemPrice, {from: account});

      }).then(result => {
        console.log("CreateItem Response: ", result);
        if (result.receipt.status === '0x1') {
          console.log("Transaction successful! TransactionHash: ", result.receipt.transactionHash);

          // Initialize or retrieve existing data array from localStorage
          const existingData = JSON.parse(localStorage.getItem('myData')) || [];
          const dataToStore = {
            "id": 0,
            "name": result.logs[0].args._identifier,
            "picture": "images/free/mobile-2.jpeg",
            "condition": itemCondition,
            "category": itemCategory,
            "cost": result.logs[0].args._itemPrice.c[0],
            "address": result.logs[0].args._itemAddress
          };
          
          // Add new data to the array
          existingData.push(dataToStore);

          // Store the updated array back in localStorage of browser
          localStorage.setItem('myData', JSON.stringify(existingData));
          
          // Just to check the stored data
          const storedData = localStorage.getItem('myData');
          if (storedData) {
            const parsedData = JSON.parse(storedData);
            console.log("Check Data in localstorage:", parsedData);
          } else {
            console.log('No data found in localStorage.');
          }

          // fetch the newly created item from the event log of contract and update the UI.
          // console.log("Item created successfully:", result.logs[0].args._identifier);
          // console.log("Item created successfully:", result.logs[0].args._itemPrice.c[0]);
          // console.log("Item created successfully:", result.logs[0].args._itemAddress);

          // updating UI components
          var itemsRow = $('#itemsRow');
          var itemTemplate = $('#itemTemplate');

          itemTemplate.find('.panel-title').text(result.logs[0].args._identifier);
          itemTemplate.find('img').attr('src', "images/free/mobile-2.jpeg");
          itemTemplate.find('.item-condition').text(itemCondition);
          itemTemplate.find('.item-category').text(itemCategory);
          itemTemplate.find('.item-cost').text(result.logs[0].args._itemPrice.c[0]);
          itemTemplate.find('.btn-buy').attr('data-id', result.logs[0].args._itemAddress).attr('data-cost', result.logs[0].args._itemPrice.c[0]);
          itemTemplate.find('.btn-dispatch').attr('data-id', result.logs[0].args._itemAddress);
          itemTemplate.find('.btn-track').attr('data-id', result.logs[0].args._itemAddress);

          itemsRow.append(itemTemplate.html());

        } else {
          console.error("Transaction failed. Status:", result.receipt.status);
        }
        
      }).catch(function(err) {
        alert("error : " + err)
        // Handle error, e.g., show an error message
        console.error("Error creating item:", err.message);
      });
    });

  },


  getTotalItemsCount: function() {
    return new Promise(function(resolve, reject) {
      // Get the accounts
      web3.eth.getAccounts(function(error, accounts) {
        if (error) {
          console.log(error);
          reject(error);
          return;
        }
  
        var account = accounts[0];
  
        // Get the deployed instance
        App.contracts.ItemManager.deployed().then(function(instance) {
          // Call getTotalItemCount
          instance.getTotalItemCount.call().then(function(resultVal) {
            // Update UI or perform any other actions here
            document.getElementById("itemCount").textContent = resultVal;
  
            // Resolve the promise with the result
            resolve(resultVal);
          }).catch(function(err) {
            // Handle error during getTotalItemCount
            alert("error resolving promise: " + err);
            console.error("error resolving promise: " + err);
  
            // Reject the promise with the error
            reject(err);
          });
  
          // Handle success, e.g., show a message or update the UI
          console.log("Item count retrieved successfully: ");
  
        }).then(function(result) {
          // Handle success, e.g., show a message or update the UI
          console.log("Item count fetched successfully: ");
  
          // Optionally, you can update the UI to display the newly created item
          // and refresh the item list by calling App.markAdopted();
        }).catch(function(err) {
          // Handle error during contract deployment
          alert("error : " + err);
          console.error("Error creating item--:", err);
  
          // Reject the promise with the error
          reject(err);
        });
      });
    });
  },
  

  // getTotalItemsCount: function() {
  //   return new Promise(function(resolve, reject) {
  //     // Call the createItem function of your contract
  //     web3.eth.getAccounts(function(error, accounts) {
  //       if (error) {
  //         console.log(error);
  //         reject(error);
  //       }
  
  //       var account = accounts[0];
  
  //       App.contracts.ItemManager.deployed().then(function(instance) {
 
  //         const read = () => {
  //           return instance.getTotalItemCount.call({ from: account });
  //         };
  
  //         const resultPromise =  read();
  //         resultPromise.then(resultVal => {
  //           //alert("Total Item Count: " + resultVal);
  //           document.getElementById("itemCount").textContent = resultVal;
  //           //resolve(resultVal);
  //         }).catch(err => {
  //           alert("error resolving promise: " + err);
  //           console.error("error resolving promise: " + err);
  //           //reject(err);
  //         });
  
  //         // Handle success, e.g., show a message or update the UI
  //         console.log("Item count retrieved successfully: ");
  
  //       }).then(function(result) {
  //         // Handle success, e.g., show a message or update the UI
  //         console.log("Item count fetched successfully: ");
  
  //         // Optionally, you can update the UI to display the newly created item
  //         // and refresh the item list by calling App.markAdopted();
  //       }).catch(function(err) {
  //         alert("error : " + err);
  //         // Handle error, e.g., show an error message
  //         console.error("Error creating item--:", err);
  //         reject(err);
  //       });
  //     });
  //   });
  // }
  
  // getTotalItemsCount: function() {    
  //   // Call the createItem function of your contract
  //   var itemManagerInstance;
  //   web3.eth.getAccounts(function(error, accounts) {
  //     if (error) {
  //       console.log(error);
  //     }

  //     var account = accounts[0];

  //     App.contracts.ItemManager.deployed().then(function(instance) {
  //       itemManagerInstance = instance;

  //       const read = () => {
  //         return itemManagerInstance.getTotalItemCount.call({ from: account });
  //       };

  //       const resultPromise = read();
  //       resultPromise.then(resultVal => {
  //         alert("Total Item Count: " + resultVal);
  //         document.getElementById("itemCount").textContent = resultVal;
  //         return resultVal;
  //       }).catch(err => {
  //         alert("error resolving promise: "+err);
  //         console.error("error resolving promise: "+err);
  //       })  

  //       // Handle success, e.g., show a message or update the UI
  //       console.log("Item count retrieved successfully: ");

  //     }).then(function(result) {
  //       // Handle success, e.g., show a message or update the UI
  //       console.log("Item count fetched successfully: ");

  //       // Optionally, you can update the UI to display the newly created item
  //       // and refresh the item list by calling App.markAdopted();
  //     }).catch(function(err) {
  //       alert("error : " + err)
  //       // Handle error, e.g., show an error message
  //       console.error("Error creating item--:", err);
  //     });
  //   });   
  // }

};

$(function() {
  $(window).load(function() {
    App.init();
  });
});
