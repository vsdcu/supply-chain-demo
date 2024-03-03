Global Environment
------------------
➜  project npm ll
eth@
│ /Users/vinit/Dcu-workspace/eth
│ 
├── @openzeppelin/contracts@5.0.1
│   
├── node@18.0.0
│   
└── web3@4.5.0
    

➜  project npm ll -g
/Users/vinit/.nvm/versions/node/v20.11.1/lib
│ 
├── @openzeppelin/contracts@5.0.1
│   Secure Smart Contract library for Solidity
├── corepack@0.23.0
│   
├── npm@10.2.4
│   a package manager for JavaScript
└── truffle@5.11.5
    Truffle - Simple development framework for Ethereum


Project env
-----------
supply-chain-demo@1.0.0 /Users/vinit/Dcu-workspace/eth/codebase/project/supply-chain-demo
├── @openzeppelin/contracts@4.0.0
├── lite-server@2.6.1
└── web3-utils@4.2.0

Commands
--------
Launch Ganache Blockchain
Connect your metamask to the local chain

Install node
> brew install node@18

Install Truffle
> npm install -g truffle

Install openzepplin dependency
> npm install @openzeppelin/contracts@4.0.0


Cleanup and deplyment of contracts
> rm -rf build
> truffle migrate

To run contracts UTs
> truffle test

Start server
> npm run dev
