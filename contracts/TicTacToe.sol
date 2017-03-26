pragma solidity ^0.4.8;
contract TicTacToe {
    
    event StateChange();

    enum Player {None, Player1, Player2 }
    //Can't map enum types, using workaround.
    mapping (uint => address) players;

    //default Phase = joining
    enum Phase { Joining, Playing, Ended, PayedOut }
    
    enum ValidExplanations { NotOnesTurn, NotStarted, PositionOutOfRange, PositionTaken, Valid }
        
    struct GameState {
        Phase phase;
        Player[9] board;
        string player1;
        string player2;
        Player onTurn;
    }
  
    GameState internal gamestate;
  
    function TicTacToe(string name) public {
        gamestate.player1 = name;
        setPlayerAddress(Player.Player1 ,msg.sender);
    }

    function setPlayerAddress(Player player, address addr){
        players[uint(player)] = addr;
    }

    function getPlayerAddress(Player player) constant returns(address) {
        return players[uint(player)];
    }

    function join(string name) public {
        if(bytes(name).length == 0) return;
        
        //only possible if player2 has no address.
        if(gamestate.phase != Phase.Joining ) return;
        
        setPlayerAddress(Player.Player2, msg.sender);
        gamestate.player2 = name;
        gamestate.phase = Phase.Playing;
        gamestate.onTurn = Player.Player1;

        StateChange();
        
        return;
    }
    
    function placeMarker(uint8 position) public {
        
        address currentPlayerId = msg.sender;
        var (valid, explanation) = validMove(position, currentPlayerId);
        if(!valid) throw;
            
        gamestate.board[position] = gamestate.onTurn;        
            
        //check win conditions.
        if(hasWon(gamestate.onTurn)){
            gamestate.phase = Phase.Ended;
            gamestate.onTurn = Player.None;
        }else{        
            if(gamestate.onTurn == Player.Player1){
                gamestate.onTurn = Player.Player2;
            }else{
                gamestate.onTurn = Player.Player1;
            }
        }

        StateChange();
    }

    function hasWon(Player p) constant returns (bool){
        if(p == Player.None){
            return false;
        }
        
        //if player has 3 tiles on a row he is the winner.
        // we could use a fancy algorithm, or just check the possible lines :)
        //Copy the array from storage to memory (as we will call values multiple times.)
        Player[9] memory b = gamestate.board;
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
    
    function validMove(uint8 position, address player) public constant returns (bool, ValidExplanations){
        // it must be the turn of player calling this method.
        if(player != getPlayerAddress(gamestate.onTurn)){
            return (false, ValidExplanations.NotOnesTurn);
        }
        //must be in playing phase
        if(gamestate.phase != Phase.Playing){
            return (false, ValidExplanations.NotStarted);
        }
        //must be a position on the board
        if(position > 8){
            return (false, ValidExplanations.PositionOutOfRange);
        }
        // position must still be available.
        if(gamestate.board[position] != Player.None){
            return (false,ValidExplanations.PositionTaken);
        }
        
        return (true,ValidExplanations.Valid);
    }
    
    function getState() public constant returns (Phase phase, Player[9] board, string onTurn, string player1, string player2) {
        //return the state of the game.
        if(gamestate.onTurn == Player.Player1){
            onTurn = gamestate.player1;

        }
        if(gamestate.onTurn == Player.Player2){
            onTurn = gamestate.player2;

        }        
        phase = gamestate.phase;
        board = gamestate.board;
        player1 = gamestate.player1;
        player2 = gamestate.player2;

        return;
    }
    
    // clean up method, should be changed to something that checks time of inactivity before destructing.
    function remove() public {
        selfdestruct(msg.sender); 
    }
}