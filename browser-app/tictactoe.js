//iife
(function(){

//Use provided web3
if(typeof web3 === 'undefined'){
    web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
}

var TictactoeContract = null;
var ticTacToeInstance = null

//load means when content is loaded. Happens before ready.
$(window).on("load", initializeContract);
$(window).ready(wireButtons);

function initializeContract(){
    $.getJSON("./contracts/TicTacToe.json")
    .done(function(data){
        console.log("tictactoe.json loaded.");
        TictactoeContract = TruffleContract(data);
        TictactoeContract.setProvider(web3.currentProvider);
        console.log("TicTacToe contract initialized.");})
    .fail(function(){
        console.log("Oops something went wrong with loading tictactoe.json.");});
}

//Wire all the html elements to javascript functions.
function wireButtons(){
    $("#new-game-btn").click(newGame);
    $("#refresh-btn").click(refresh);
    $("#join-btn").click(join);
}

function newGame(){
    if(!TictactoeContract) {
        alert("Contract not ready, something might have gone wrong.");
        return;
    }

    TictactoeContract.new("Player1", {from: web3.eth.accounts[0],gas:3000000})
    .then(
        function(instance){
            ticTacToeInstance = instance;
            console.log("new game is ready.");
        }
        ,function(error){
            console.log(error)
        }
    );
}

function refresh(){    
    if(!ticTacToeInstance) {
        alert("No tictactoe game has been created yet.");
        return;
    }

    ticTacToeInstance.getState().then(function(state){
        var parsedState = parseGameState(state);
        console.log(parsedState);
        $("#state").html(parsedState.phase);
    });
}

function join(){ 
    if(!ticTacToeInstance) {
        alert("No tictactoe game has been created yet.");
        return;
    }

    ticTacToeInstance.join("Player2", {from: web3.eth.accounts[1]})
}

function parseGameState(gamestate){
  var parsed = {};
  parsed.phase = parsePhase(gamestate[0]);
  parsed.board = parseBoard(gamestate[1]);
  parsed.onTurn = gamestate[2];
  parsed.player1 = {};
  parsed.player1.address = gamestate[3];
  parsed.player1.name = gamestate[4];
  parsed.player2 = {};
  parsed.player2.address = gamestate[5];
  parsed.player2.name = gamestate[6];
  return parsed;
} 

function parseBoard(board){
  return [
    [board[0].toFixed(), board[1].toFixed(), board[2].toFixed()],
    [board[3].toFixed(), board[4].toFixed(), board[5].toFixed()],
    [board[6].toFixed(), board[7].toFixed(), board[8].toFixed()]
  ];
}

function parsePhase(phase){
  switch(phase.toFixed()) {
    case "0":
      return "Waiting for player 2.";
    case "1":
      return "Playing"
    case "2":
      return "The game has ended."
    case "3":
      return "Ether has been payed to the winner(s)."
    default:
      throw "unknown game phase."
  }
}

//end iife
})()