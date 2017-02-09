const exec = require('child_process').execSync;
const fs = require('fs');

exports.compile = function(){
    //apparentally there is a bug in the solc compiler, so that when you provide a relative path to the contract 
    //  it only places the .bin in the output folder and the rest at the same level as where it was executed.
    //  so we use the current working directory option from node.
    exec("solc -o ./compiled --bin --abi ./TicTacToe.sol",{cwd:"./../contracts/", timeout:10000});
    console.log("compile_bin.js - contract compiled.");

    // Load compiled bytecode and abi.
    const bytecode = fs.readFileSync('./../contracts/compiled/TicTacToe.bin');
    const abi = JSON.parse(fs.readFileSync('./../contracts/compiled/TicTacToe.sol:TicTacToe.abi', 'utf8'));

    return {abi: abi, bytecode: bytecode};
}
