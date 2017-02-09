
exports.deploy = function(bytecode, abi, web3){

    // Contract object
    const contract = web3.eth.contract(abi);

    // Deploy contract instance
    const contractInstance = contract.new("Thijs", {
        data: '0x' + bytecode,
        from: web3.eth.coinbase,
        gas: 900000*2
    }, (err, res) => {
        if (err) {
            console.log(err);
            return;
        }

        // Log the tx, you can explore status with eth.getTransaction()
        console.log('transaction hash: ' + res.transactionHash);

        // If we have an address property, the contract was deployed
        if (res.address) {
            console.log('Contract address: ' + res.address);
        }
    });

    return contractInstance;
};
