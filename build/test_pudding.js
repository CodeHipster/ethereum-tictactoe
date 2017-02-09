const fs = require("fs");
const pudding = require("ether-pudding");

const jsContractPath = "./../contracts/compiled/TicTacToe.sol.js";

module.exports.test = function(web3){

    var account_one = web3.eth.accounts[0];
    var account_two = web3.eth.accounts[1];

    web3.eth.defaultAccount = account_one;

    var TicTacToe = require(jsContractPath);
    TicTacToe.setProvider(web3.currentProvider);
    console.log("TicTacToe ether pudding contract: \n", TicTacToe);

    console.log("Testcase 1");

    //ttti = tictactoe deployed instance
    TicTacToe.new().then(function(ttti){
        console.log("ttti: ", ttti);
        ttti.getState.call().then(function(state){
            console.log("state of the game: ");
            console.log(state);
        });
    }).catch(function(error){
        console.log("encountered error: ", error);
    });

}