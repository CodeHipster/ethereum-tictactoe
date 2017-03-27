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
$(window).on("resize", scaleTable);
$(window).ready(setupWelcomeView);
$(window).ready(scaleTable);

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

function setupWelcomeView(){
    //wire buttons.
    $("#new-game-btn").click(newGame);
    $("#existing-game-btn").click(existingContract);
    
    //hide some elements.
    $("#game-information").addClass("hidden");
    $("#player-information").addClass("hidden");
    
    //show board as disabled.
    $("#board").addClass("disabled");
}

function setupGameView(instance){
    //hide create buttons
    $("#create-game-buttons").addClass("hidden");

    //show game state elements
    $("#game-information").removeClass("hidden");
    $("#player-information").removeClass("hidden");

    //enable board.
    $("#board").removeClass("disabled");
    //when clicking any table data on the board.
    $("#board td").click(placeMarker);

    //Set the game address.
    $("#game-address").text(instance.address);
    $("#join-btn").click(join);

    //load the state.
    loadState();

}

function existingContract(){
    var address = $("#game-address-input").val();
    console.log("loading existing game at: "+ address);
    if(validAddress(address)){
        TictactoeContract.at(address).then(
            onInstanceCreated
        ,function(error){
            alert("failed to instantiate existing game.");
            console.log(error);
        });
    }else{
        alert("please input valid address.");
    }
}

function validAddress(address){
    return (address && address !== "");
}

function scaleTable(){
    var boardElement = $("table");
    var size = boardElement.parent().width();
    boardElement.height(size);
    var cellsize = size/3;
    $("td").height(cellsize);
    $("td").width(cellsize);
    $("td span").css({ 'font-size': cellsize });
}

function placeMarker(args){    
    if(!ticTacToeInstance) {
        alert("No tictactoe game has been created yet.");
        return;
    }

    //Isn't it ugly to have a dependency on the calling context?
    var cell = this;

    getState().then(function(state){
        if(state.phaseName != "playing"){
            alert("The game is not in play state.");
            return;
        }         
        var position = $(cell).attr('id').substring(4,5);
        return ticTacToeInstance.placeMarker(position,{from: web3.eth.accounts[0]})
    }).then(function(){
        console.log("marker placed");}
    ,function(error){
        alert("placing marker failed.");
        console.log(error);
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

    var playerName = $("#new-game-input").val();
    if(validPlayerName(playerName)){
        TictactoeContract.new(playerName, {from: web3.eth.accounts[0], gas:3000000})
        .then(
            onInstanceCreated
            ,function(error){
                alert("could not deploy a new contract.")
                console.log(error)
            }
        );
    }else{
        alert("provide a valid nickname.");
    }
}

function validPlayerName(name){
    return (name && name !== "");
}

function onInstanceCreated(instance){
    ticTacToeInstance = instance;
    console.log("instance instantiated.");
    // Start watchers for state change events.
    instance.StateChange(onStateChange);
    // Setup the game view.
    setupGameView(instance);
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
        $("#state-message").html(parsedState.phaseMessage);
        $("#player1-name").html(parsedState.player1);
        $("#player2-name").html(parsedState.player2);
        if(parsedState.onTurn == 1){
            $("#player-1-box").addClass("highlight");
            $("#player-2-box").removeClass("highlight");

        }else if(parsedState.onTurn == 2){
            $("#player-2-box").addClass("highlight");
            $("#player-1-box").removeClass("highlight");
        }
        $("#on-turn").html(parsedState.onTurn);
        $("#cell0 span").addClass(getIconClass(parsedState.board[0]));
        $("#cell1 span").addClass(getIconClass(parsedState.board[1]));
        $("#cell2 span").addClass(getIconClass(parsedState.board[2]));
        $("#cell3 span").addClass(getIconClass(parsedState.board[3]));
        $("#cell4 span").addClass(getIconClass(parsedState.board[4]));
        $("#cell5 span").addClass(getIconClass(parsedState.board[5]));
        $("#cell6 span").addClass(getIconClass(parsedState.board[6]));
        $("#cell7 span").addClass(getIconClass(parsedState.board[7]));
        $("#cell8 span").addClass(getIconClass(parsedState.board[8]));

        if(parsedState.phaseName !== "joining"){    
            $("#join-elements").addClass("hidden");
        }
    });
}

function getIconClass(player){
    if(player == 1){
        return "fa fa-circle-o";
    }else if( player == 2){
        return "fa fa-times";
    }
}

function join(){
    var playerName = $("#join-input").val();
    if(validPlayerName(playerName)){
        ticTacToeInstance.join(playerName, {from: web3.eth.accounts[0], gas:3000000})
    }else{
        alert("provide a valid nickname.")
    }

}

function parseGameState(gamestate){
  var parsed = {};
  var phaseInt = gamestate[0].toFixed();
  parsed.phaseMessage = phaseMap[phaseInt].message;
  parsed.phaseName = phaseMap[phaseInt].name;
  parsed.board = parseBoard(gamestate[1]);
  parsed.onTurn = gamestate[2];
  parsed.player1 = gamestate[3];
  parsed.player2 = gamestate[4];
  return parsed;
} 

function parseBoard(board){
  return [
    board[0].toFixed(), board[1].toFixed(), board[2].toFixed(),
    board[3].toFixed(), board[4].toFixed(), board[5].toFixed(),
    board[6].toFixed(), board[7].toFixed(), board[8].toFixed()
  ];
}

var phaseMap = {
    "0":{name:"joining", message:"Waiting for player 2."},
    "1":{name:"playing", message:"Playing"},
    "2":{name:"ended", message:"The game has ended."},
    "3":{name:"payed",message:"Ether has been payed to the winner(s)."}
}

//end iife
})()