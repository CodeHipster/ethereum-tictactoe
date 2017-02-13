var TicTacToe = artifacts.require("./TicTacToe.sol");

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
  switch(phase.s) {
    case 0:
      return "Joining";
    case 1:
      return "Playing"
    case 2:
      return "Ended"
    case 3:
      return "PayedOut"
    default:
      throw "unknown game phase."
  }
}

contract('TicTacToe', function(accounts) {

  var inst;
  it("should play a game with another player", function() {
    console.log("Thijs1 starts a game.");
    return TicTacToe.deployed("Thijs1")
    .then(function(instance) {
      inst = instance;
      console.log("Thijs2 joins the game.")
      return inst.join("Thijs2",{from:accounts[1]});
    }).then(function() {
      return inst.getState();
    }).then(function(gamestate) {
      console.log(parseGameState(gamestate));
      console.log("Thijs1 places marker on 0");
      return inst.placeMarker(0,{from:accounts[0]});
    }).then(function() {
      return inst.getState();
    }).then(function(gamestate) {
      console.log(parseGameState(gamestate));
      console.log("Thijs2 places marker on 3");
      return inst.placeMarker(3,{from:accounts[1]});
    }).then(function() {
      return inst.getState();
    }).then(function(gamestate) {
      console.log(parseGameState(gamestate));
      console.log("Thijs1 places marker on 1");
      return inst.placeMarker(1,{from:accounts[0]});
    }).then(function() {
      return inst.getState();
    }).then(function(gamestate) {
      console.log(parseGameState(gamestate));
      console.log("Thijs2 places marker on 4");
      return inst.placeMarker(4,{from:accounts[1]});
    }).then(function() {
      return inst.getState();
    }).then(function(gamestate) {
      console.log(parseGameState(gamestate));
      console.log("Thijs1 places marker on 2");
      return inst.placeMarker(2,{from:accounts[0]});
    }).then(function() {
      return inst.getState();
    }).then(function(gamestate) {
      console.log(parseGameState(gamestate));
      return inst.hasWon(accounts[0]);
    }).then(function(hasWon){
      console.log("Thijs1 has won: ", hasWon);
    });
  });
});
