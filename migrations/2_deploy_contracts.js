var Adoption = artifacts.require("Adoption");
var MyOwnableContract = artifacts.require("MyOwnableContract");
//var Item = artifacts.require("Item");
var ItemManager = artifacts.require("ItemManager");

module.exports = async function(deployer) {

    const adoptionContractInstance = await deployer.deploy(Adoption);
    const myOwnableContractInstance = await deployer.deploy(MyOwnableContract);
    const itemManagerContractInstance = await deployer.deploy(ItemManager);
    //const itemContractInstance = await deployer.deploy(Item, itemManagerContractInstance.address, 0, 0);
    
  
};
