
exports.deploy = function(bytecode, abi, web3, playerName, payingAddress, callback){

    // Contract object
    const contract = web3.eth.contract(abi);

    // Deploy contract instance
    const contractInstance = contract.new("Thijs", {
        data: '0x' + bytecode,
        from: payingAddress,
        gas: 4000000
    }, (err, res) => {
        if (err) {
            console.log("deploy.js - error: ", err);
            return;
        }

        // Log the tx, you can explore status with eth.getTransaction()
        console.log('deploy.js - transaction hash: ' + res.transactionHash);

        // If we have an address property, the contract was deployed
        if (res.address) {
            console.log('deploy.js - Contract deployed, address: ' + res.address);
            callback(contractInstance);
        }
    });
};
