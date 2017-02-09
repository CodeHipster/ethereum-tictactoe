const compiler = require("./compile_bin.js");
const deployer = require("./deploy.js");
const web3 = require("./web3TestRPC.js");

const compiledContract = compiler.compile();



exports.deploy = deployer.deploy(compiledContract.bytecode, compiledContract.abi, web3, "Thijs", web3.eth.accounts[0]
    ,function(contractInstance){
        console.log("compile-deploy.js - contractInstance: ", contractInstance);
        console.log("compile-deploy.js - gamestate: ", contractInstance.getState.call());

        //console.log("compile-deploy.js - join gascost: ", contractInstance.join.estimateGas());
        contractInstance.join.sendTransaction("cheese",{from:web3.eth.accounts[1]});
        console.log("compile-deploy.js - gamestate: ", contractInstance.getState.call());

        console.log("compile-deploy.js - placeMarker gascost: ", contractInstance.placeMarker.estimateGas());
        contractInstance.placeMarker.sendTransaction(0,{from:web3.eth.accounts[0]});
        console.log("compile-deploy.js - gamestate: ", contractInstance.getState.call());

        contractInstance.placeMarker.sendTransaction(3,{from:web3.eth.accounts[1]});
        console.log("compile-deploy.js - gamestate: ", contractInstance.getState.call());

        contractInstance.placeMarker.sendTransaction(1,{from:web3.eth.accounts[0]});
        console.log("compile-deploy.js - gamestate: ", contractInstance.getState.call());

        contractInstance.placeMarker.sendTransaction(4,{from:web3.eth.accounts[1]});
        console.log("compile-deploy.js - gamestate: ", contractInstance.getState.call());

        contractInstance.placeMarker.sendTransaction(2,{from:web3.eth.accounts[0]});
        console.log("compile-deploy.js - gamestate: ", contractInstance.getState.call());


    }); 
exports.web3 = web3;