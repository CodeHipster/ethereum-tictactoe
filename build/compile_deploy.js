const compiler = require("./compile_bin.js");
const deployer = require("./deploy.js");
const web3 = require("./web3handler.js").web3;

const compiledContract = compiler.compile();
console.log(compiledContract);
console.log(web3);
exports.deploy = deployer.deploy(compiledContract.bytecode, compiledContract.abi, web3); 
exports.web3 = web3;