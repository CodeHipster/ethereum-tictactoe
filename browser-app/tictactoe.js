//iife
(function(){

//Use provided web3
if(typeof web3 === 'undefined'){
    web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
}

var TictactoeContract = null;
var ticTacToeInstance = null;
var playerAddress = null;

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
    $("#join-btn").click(join);
    //when clicking any table data on the board.
    $("#board td").click(placeMarker);
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

        ticTacToeInstance.placeMarker(position,{from: playerAddress})
        .then(function(){console.log("marker placed");}
        ,function(error){
            alert("placing marker failed.");
            console.log(error);
        });
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

    playerAddress = web3.eth.accounts[0];
    console.log(playerAddress);
    TictactoeContract.new("Thijs 1", {from: playerAddress, gas:3000000})
    .then(
        onInstanceCreated
        ,function(error){
            alert("could not deploy a new contract.")
            console.log(error)
        }
    );
}

function onInstanceCreated(instance){
    ticTacToeInstance = instance;
    console.log("new game is ready.");
    // Start watchers for state change events.
    instance.StateChange(onStateChange);
    // get the state.
    loadState();
    //Set the address of this game.
    console.log(instance);
    $("#game-address").text(instance.address);
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
    var address = $("#join-input").val();
    console.log("joining game: "+ address);
    if(address && address !== ""){
        TictactoeContract.at(address).then(function(instance){
            onInstanceCreated(instance);
            
            playerAddress = web3.eth.accounts[1];
            instance.join("Thijs 2", {from: playerAddress})
        }
        ,function(error){
            alert("failed to join game.");
            console.log(error);
        });
    }else{
        alert("please input valid address.");
    }

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