pragma solidity ^0.4.8;
contract TicTacToe {
    
    //default state = Free
    enum TileState { Free, Player1, Player2 }

    //default Phase = joining
    enum Phase { Joining, Playing, Ended, PayedOut }
    
    enum ValidExplanations { NotOnesTurn, NotStarted, PositionOutOfRange, PositionTaken, Valid }
    
    struct Player{
        address id;
        string name;
    }
    
    struct GameState {
        Phase phase;
        TileState[9] board;
        Player player1;
        Player player2;
        Player onTurn;
    }
  
    GameState internal gamestate;
  
    function TicTacToe(string name) public {
        gamestate.player1.name = name;
        gamestate.player1.id = msg.sender;
        gamestate.onTurn = gamestate.player1;
    }
    
    function join(string name) public {
        if(bytes(name).length == 0) return;
        
        //only possible if player2 has no address.
        if(gamestate.player2.id != address(0x0) ) return;
        
        gamestate.player2.id = msg.sender;
        gamestate.player2.name = name;
        gamestate.phase = Phase.Playing;
        
        return;
    }
    
    function placeMarker(uint8 position) public {
        
        address currentPlayerId = msg.sender;
        var (valid, explanation) = validMove(position, currentPlayerId);
        if(!valid) throw;
        
        TileState tileState;
        Player memory nextPlayer;
        
        if(currentPlayerId == gamestate.player1.id){
            tileState = TileState.Player1;
            nextPlayer = gamestate.player2;
        }
        
        if(currentPlayerId == gamestate.player2.id){
            tileState = TileState.Player2;
            nextPlayer = gamestate.player1;
        }
        
        gamestate.board[position] = tileState;
            
        //check win conditions.
        if(hasWon(msg.sender)){
            gamestate.phase = Phase.Ended;
            //winner is the player who is onTurn when phase is Ended/payedOut.
        }else{
            gamestate.onTurn = nextPlayer;
        }

    }
    
    function hasWon(address player) public constant returns (bool){
        //find matching player/tileState.
        TileState p;
        
        if(player == gamestate.player1.id){
            p = TileState.Player1;    
        }else if(player == gamestate.player2.id){
            p = TileState.Player2;
        }else{
            return false;
        }
        
        //if player has 3 tiles on a row he is the winner.
        // we could use a fancy algorithm, or just check the possible lines :)
        //Copy the array from storage to memory (as we will call values multiple times.)
        TileState[9] memory b = gamestate.board;
        if(
            (p == b[0] && p == b[1] && p == b[2]) ||
            (p == b[3] && p == b[4] && p == b[5]) ||
            (p == b[6] && p == b[7] && p == b[8]) ||

            (p == b[0] && p == b[3] && p == b[6]) ||   
            (p == b[1] && p == b[4] && p == b[7]) ||
            (p == b[2] && p == b[5] && p == b[8]) ||
        
            (p == b[0] && p == b[4] && p == b[8]) ||
            (p == b[6] && p == b[4] && p == b[2])) return true;
        
        return false;
    }
    
    function validMove(uint8 position, address playerId) public constant returns (bool, ValidExplanations){
        // it must be the turn of player calling this method.
        if(msg.sender != gamestate.onTurn.id){
            return (false, ValidExplanations.NotOnesTurn);
        }
        //m`ust be in playing phase
        if(gamestate.phase != Phase.Playing){
            return (false, ValidExplanations.NotStarted);
        }
        //must be a position on the board
        if(position > 8){
            return (false, ValidExplanations.PositionOutOfRange);
        }
        // position must still be available.
        if(gamestate.board[position] != TileState.Free){
            return (false,ValidExplanations.PositionTaken);
        }
        
        return (true,ValidExplanations.Valid);
    }
    
    function getState() public constant returns (Phase phase, TileState[9] board, string onTurn, address player1, string name1, address player2, string name2) {
        //return the state of the game.
        return (gamestate.phase, gamestate.board, gamestate.onTurn.name, gamestate.player1.id, gamestate.player1.name, gamestate.player2.id, gamestate.player2.name);
    }
    
    // clean up method, should be changed to something that checks time of inactivity before destructing.
    function remove() public {
        selfdestruct(gamestate.player1.id); 
    }
}