const pudding = require("ether-pudding");

const jsContractPath = "./../contracts/generated/TicTacToe.sol.js";

module.exports.generate = function(abi, bytecode){
    var contract_data = {
        abi: abi,                   // Array; required. 
        unlinked_binary: bytecode   // String
    };

    Promise.resolve(pudding.save(contract_data, jsContractPath)
    .then(function(){
        console.log("succesfully generated sol.js files.");
    }));
}