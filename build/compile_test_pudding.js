const binCompiler = require("./compile_bin.js");
const jsGenerator = require("./generate_pudding.js");
const web3TestRPC = require("./web3TestRPC.js");
const tester = require("./test.js");

exports.go = function(){
    //compile binaries.
    console.log("compiling bytecode and abi.");
    var compiledBin = binCompiler.compile();
    console.log("compiled bytecode and abi.");

    //compile binaries to js objects.
    console.log("generating ether pudding js.");
    jsGenerator.generate(compiledBin.abi, compiledBin.bytecode);
    console.log("generated ether pudding js.");

    //test js objects on testrpc network.
    console.log("Starting tests.");
    tester.test(web3TestRPC);
    console.log("Finished tests.");


}