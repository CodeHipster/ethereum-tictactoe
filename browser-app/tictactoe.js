$.getJSON("./contracts/TicTacToe.json",function(data){
    console.log(data);
    
    var tictactoe = TruffleContract(data);
    console.log(tictactoe);
});
