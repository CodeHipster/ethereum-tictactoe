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
    $("#refresh-btn").click(loadState);
    $("#join-btn").click(join);
    $("#board td").click(placeMarker)
}

function placeMarker(args){    
    if(!ticTacToeInstance) {
        alert("No tictactoe game has been created yet.");
        return;
    }

    //Isn't it ugly to have a dependency on the calling context?
    var cell = this;

    getState().then(function(state){
        if(state.phase != "Playing"){
            alert("The game is not in play state.");
            return;
        }
        var position = $(cell).attr('id').substring(4,5);
        //TODO: temporary ugly hack :D
        var fromAccount = web3.eth.accounts[0];
        if(state.onTurn == "Thijs 2") fromAccount = web3.eth.accounts[1];

        ticTacToeInstance.placeMarker(position,{from: fromAccount})
        .then(function(){console.log("marker placed")}
        ,function(){console.log("placing marker failed")});
    });
}

function getState(){
    return ticTacToeInstance.getState.call().then(function(state){return parseGameState(state)});
}

function newGame(){
    if(!TictactoeContract) {
        alert("Contract not ready, something might have gone wrong.");
        return;
    }

    TictactoeContract.new("Thijs 1", {from: web3.eth.accounts[0],gas:3000000})
    .then(
        function(instance){
            ticTacToeInstance = instance;
            console.log("new game is ready.");
            // Start watchers for state change events.
            instance.StateChange(onStateChange);
            // get the state.
            loadState();
        }
        ,function(error){
            console.log(error)
        }
    );
}

function onStateChange(error, result){
    if (!error){
        console.log("event triggered: " + result);
        loadState();
    }else{
        console.log(error);
    }
}

function loadState(){    
    if(!ticTacToeInstance) {
        alert("No tictactoe game has been created yet.");
        return;
    }

    ticTacToeInstance.getState().then(function(state){
        var parsedState = parseGameState(state);
        console.log(parsedState);
        $("#state").html(parsedState.phase);
        $("#player1-name").html(parsedState.player1.name);
        $("#player2-name").html(parsedState.player2.name);
        $("#on-turn").html(parsedState.onTurn);
        $("#cell0").html(parsedState.board[0]);
        $("#cell1").html(parsedState.board[1]);
        $("#cell2").html(parsedState.board[2]);
        $("#cell3").html(parsedState.board[3]);
        $("#cell4").html(parsedState.board[4]);
        $("#cell5").html(parsedState.board[5]);
        $("#cell6").html(parsedState.board[6]);
        $("#cell7").html(parsedState.board[7]);
        $("#cell8").html(parsedState.board[8]);
    });
}

function join(){ 
    if(!ticTacToeInstance) {
        alert("No tictactoe game has been created yet.");
        return;
    }

    ticTacToeInstance.join("Thijs 2", {from: web3.eth.accounts[1]})
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
    board[0].toFixed(), board[1].toFixed(), board[2].toFixed(),
    board[3].toFixed(), board[4].toFixed(), board[5].toFixed(),
    board[6].toFixed(), board[7].toFixed(), board[8].toFixed()
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