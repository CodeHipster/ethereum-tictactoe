//iife
(function(){

var provider = new Web3.providers.HttpProvider("http://localhost:8545");
var TictactoeContract = null;
var ticTacToeInstance = null

$(window).on("load", initializeContract);
$(window).ready(wireHtml);

//Go do something when all content is loaded.
function initializeContract(){
    $.getJSON("./contracts/TicTacToe.json").done(function(data){
        console.log("tictactoe.json loaded.");
        TictactoeContract = TruffleContract(data);
        TictactoeContract.setProvider(provider);
        console.log("TicTacToe contract initialized.");
    }).fail(function(){
        console.log("Oops something went wrong with loading tictactoe.json.")
    });
}

//Wire all the html elements to javascript functions.
function wireHtml(){
    $("#new-game-btn").click(newGame);
}

function newGame(){
    if(!TictactoeContract) {
        alert("Contract not ready, something might have gone wrong.");
        return;
    }

    console.log("creating new tictactoe contract.")
//TODO allow to insert name.
    ticTacToeInstance = TictactoeContract.new("Player1", {from: "0x5390b0126cde708e9d56b508c0a59dd019228452",gas:3000000})
    .then(
        function(){
            console.log("new game is ready.");
        }
        ,function(error){
            console.log(error)
        }
    );
}

//end iife
})()