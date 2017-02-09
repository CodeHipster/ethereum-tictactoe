var Web3 = require("web3");
var SolidityEvent = require("web3/lib/web3/event.js");

(function() {
  // Planned for future features, logging, etc.
  function Provider(provider) {
    this.provider = provider;
  }

  Provider.prototype.send = function() {
    this.provider.send.apply(this.provider, arguments);
  };

  Provider.prototype.sendAsync = function() {
    this.provider.sendAsync.apply(this.provider, arguments);
  };

  var BigNumber = (new Web3()).toBigNumber(0).constructor;

  var Utils = {
    is_object: function(val) {
      return typeof val == "object" && !Array.isArray(val);
    },
    is_big_number: function(val) {
      if (typeof val != "object") return false;

      // Instanceof won't work because we have multiple versions of Web3.
      try {
        new BigNumber(val);
        return true;
      } catch (e) {
        return false;
      }
    },
    merge: function() {
      var merged = {};
      var args = Array.prototype.slice.call(arguments);

      for (var i = 0; i < args.length; i++) {
        var object = args[i];
        var keys = Object.keys(object);
        for (var j = 0; j < keys.length; j++) {
          var key = keys[j];
          var value = object[key];
          merged[key] = value;
        }
      }

      return merged;
    },
    promisifyFunction: function(fn, C) {
      var self = this;
      return function() {
        var instance = this;

        var args = Array.prototype.slice.call(arguments);
        var tx_params = {};
        var last_arg = args[args.length - 1];

        // It's only tx_params if it's an object and not a BigNumber.
        if (Utils.is_object(last_arg) && !Utils.is_big_number(last_arg)) {
          tx_params = args.pop();
        }

        tx_params = Utils.merge(C.class_defaults, tx_params);

        return new Promise(function(accept, reject) {
          var callback = function(error, result) {
            if (error != null) {
              reject(error);
            } else {
              accept(result);
            }
          };
          args.push(tx_params, callback);
          fn.apply(instance.contract, args);
        });
      };
    },
    synchronizeFunction: function(fn, instance, C) {
      var self = this;
      return function() {
        var args = Array.prototype.slice.call(arguments);
        var tx_params = {};
        var last_arg = args[args.length - 1];

        // It's only tx_params if it's an object and not a BigNumber.
        if (Utils.is_object(last_arg) && !Utils.is_big_number(last_arg)) {
          tx_params = args.pop();
        }

        tx_params = Utils.merge(C.class_defaults, tx_params);

        return new Promise(function(accept, reject) {

          var decodeLogs = function(logs) {
            return logs.map(function(log) {
              var logABI = C.events[log.topics[0]];

              if (logABI == null) {
                return null;
              }

              var decoder = new SolidityEvent(null, logABI, instance.address);
              return decoder.decode(log);
            }).filter(function(log) {
              return log != null;
            });
          };

          var callback = function(error, tx) {
            if (error != null) {
              reject(error);
              return;
            }

            var timeout = C.synchronization_timeout || 240000;
            var start = new Date().getTime();

            var make_attempt = function() {
              C.web3.eth.getTransactionReceipt(tx, function(err, receipt) {
                if (err) return reject(err);

                if (receipt != null) {
                  // If they've opted into next gen, return more information.
                  if (C.next_gen == true) {
                    return accept({
                      tx: tx,
                      receipt: receipt,
                      logs: decodeLogs(receipt.logs)
                    });
                  } else {
                    return accept(tx);
                  }
                }

                if (timeout > 0 && new Date().getTime() - start > timeout) {
                  return reject(new Error("Transaction " + tx + " wasn't processed in " + (timeout / 1000) + " seconds!"));
                }

                setTimeout(make_attempt, 1000);
              });
            };

            make_attempt();
          };

          args.push(tx_params, callback);
          fn.apply(self, args);
        });
      };
    }
  };

  function instantiate(instance, contract) {
    instance.contract = contract;
    var constructor = instance.constructor;

    // Provision our functions.
    for (var i = 0; i < instance.abi.length; i++) {
      var item = instance.abi[i];
      if (item.type == "function") {
        if (item.constant == true) {
          instance[item.name] = Utils.promisifyFunction(contract[item.name], constructor);
        } else {
          instance[item.name] = Utils.synchronizeFunction(contract[item.name], instance, constructor);
        }

        instance[item.name].call = Utils.promisifyFunction(contract[item.name].call, constructor);
        instance[item.name].sendTransaction = Utils.promisifyFunction(contract[item.name].sendTransaction, constructor);
        instance[item.name].request = contract[item.name].request;
        instance[item.name].estimateGas = Utils.promisifyFunction(contract[item.name].estimateGas, constructor);
      }

      if (item.type == "event") {
        instance[item.name] = contract[item.name];
      }
    }

    instance.allEvents = contract.allEvents;
    instance.address = contract.address;
    instance.transactionHash = contract.transactionHash;
  };

  // Use inheritance to create a clone of this contract,
  // and copy over contract's static functions.
  function mutate(fn) {
    var temp = function Clone() { return fn.apply(this, arguments); };

    Object.keys(fn).forEach(function(key) {
      temp[key] = fn[key];
    });

    temp.prototype = Object.create(fn.prototype);
    bootstrap(temp);
    return temp;
  };

  function bootstrap(fn) {
    fn.web3 = new Web3();
    fn.class_defaults  = fn.prototype.defaults || {};

    // Set the network iniitally to make default data available and re-use code.
    // Then remove the saved network id so the network will be auto-detected on first use.
    fn.setNetwork("default");
    fn.network_id = null;
    return fn;
  };

  // Accepts a contract object created with web3.eth.contract.
  // Optionally, if called without `new`, accepts a network_id and will
  // create a new version of the contract abstraction with that network_id set.
  function Contract() {
    if (this instanceof Contract) {
      instantiate(this, arguments[0]);
    } else {
      var C = mutate(Contract);
      var network_id = arguments.length > 0 ? arguments[0] : "default";
      C.setNetwork(network_id);
      return C;
    }
  };

  Contract.currentProvider = null;

  Contract.setProvider = function(provider) {
    var wrapped = new Provider(provider);
    this.web3.setProvider(wrapped);
    this.currentProvider = provider;
  };

  Contract.new = function() {
    if (this.currentProvider == null) {
      throw new Error("Contract error: Please call setProvider() first before calling new().");
    }

    var args = Array.prototype.slice.call(arguments);

    if (!this.unlinked_binary) {
      throw new Error("Contract error: contract binary not set. Can't deploy new instance.");
    }

    var regex = /__[^_]+_+/g;
    var unlinked_libraries = this.binary.match(regex);

    if (unlinked_libraries != null) {
      unlinked_libraries = unlinked_libraries.map(function(name) {
        // Remove underscores
        return name.replace(/_/g, "");
      }).sort().filter(function(name, index, arr) {
        // Remove duplicates
        if (index + 1 >= arr.length) {
          return true;
        }

        return name != arr[index + 1];
      }).join(", ");

      throw new Error("Contract contains unresolved libraries. You must deploy and link the following libraries before you can deploy a new version of Contract: " + unlinked_libraries);
    }

    var self = this;

    return new Promise(function(accept, reject) {
      var contract_class = self.web3.eth.contract(self.abi);
      var tx_params = {};
      var last_arg = args[args.length - 1];

      // It's only tx_params if it's an object and not a BigNumber.
      if (Utils.is_object(last_arg) && !Utils.is_big_number(last_arg)) {
        tx_params = args.pop();
      }

      tx_params = Utils.merge(self.class_defaults, tx_params);

      if (tx_params.data == null) {
        tx_params.data = self.binary;
      }

      // web3 0.9.0 and above calls new twice this callback twice.
      // Why, I have no idea...
      var intermediary = function(err, web3_instance) {
        if (err != null) {
          reject(err);
          return;
        }

        if (err == null && web3_instance != null && web3_instance.address != null) {
          accept(new self(web3_instance));
        }
      };

      args.push(tx_params, intermediary);
      contract_class.new.apply(contract_class, args);
    });
  };

  Contract.at = function(address) {
    if (address == null || typeof address != "string" || address.length != 42) {
      throw new Error("Invalid address passed to Contract.at(): " + address);
    }

    var contract_class = this.web3.eth.contract(this.abi);
    var contract = contract_class.at(address);

    return new this(contract);
  };

  Contract.deployed = function() {
    if (!this.address) {
      throw new Error("Cannot find deployed address: Contract not deployed or address not set.");
    }

    return this.at(this.address);
  };

  Contract.defaults = function(class_defaults) {
    if (this.class_defaults == null) {
      this.class_defaults = {};
    }

    if (class_defaults == null) {
      class_defaults = {};
    }

    var self = this;
    Object.keys(class_defaults).forEach(function(key) {
      var value = class_defaults[key];
      self.class_defaults[key] = value;
    });

    return this.class_defaults;
  };

  Contract.extend = function() {
    var args = Array.prototype.slice.call(arguments);

    for (var i = 0; i < arguments.length; i++) {
      var object = arguments[i];
      var keys = Object.keys(object);
      for (var j = 0; j < keys.length; j++) {
        var key = keys[j];
        var value = object[key];
        this.prototype[key] = value;
      }
    }
  };

  Contract.all_networks = {
  "default": {
    "abi": [
      {
        "constant": true,
        "inputs": [],
        "name": "getState",
        "outputs": [
          {
            "name": "phase",
            "type": "uint8"
          },
          {
            "name": "board",
            "type": "uint8[9]"
          },
          {
            "name": "onTurn",
            "type": "string"
          },
          {
            "name": "player1",
            "type": "address"
          },
          {
            "name": "name1",
            "type": "string"
          },
          {
            "name": "player2",
            "type": "address"
          },
          {
            "name": "name2",
            "type": "string"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "name",
            "type": "string"
          }
        ],
        "name": "join",
        "outputs": [],
        "payable": false,
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [
          {
            "name": "position",
            "type": "uint8"
          },
          {
            "name": "playerId",
            "type": "address"
          }
        ],
        "name": "validMove",
        "outputs": [
          {
            "name": "",
            "type": "bool"
          },
          {
            "name": "",
            "type": "uint8"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [
          {
            "name": "player",
            "type": "address"
          }
        ],
        "name": "hasWon",
        "outputs": [
          {
            "name": "",
            "type": "bool"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [],
        "name": "remove",
        "outputs": [],
        "payable": false,
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "position",
            "type": "uint8"
          }
        ],
        "name": "placeMarker",
        "outputs": [],
        "payable": false,
        "type": "function"
      },
      {
        "inputs": [
          {
            "name": "name",
            "type": "string"
          }
        ],
        "payable": false,
        "type": "constructor"
      }
    ],
    "unlinked_binary": "0x606060405234156200000d57fe5b6040516200195638038062001956833981016040528080518201919050505b80600060020160010190805190602001906200004a92919062000138565b5033600060020160000160006101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff160217905550600060020160006006016000820160009054906101000a900473ffffffffffffffffffffffffffffffffffffffff168160000160006101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff160217905550600182018160010190805460018160011615610100020316600290046200012c929190620001bf565b509050505b5062000275565b828054600181600116156101000203166002900490600052602060002090601f016020900481019282601f106200017b57805160ff1916838001178555620001ac565b82800160010185558215620001ac579182015b82811115620001ab5782518255916020019190600101906200018e565b5b509050620001bb91906200024d565b5090565b828054600181600116156101000203166002900490600052602060002090601f016020900481019282601f10620001fa57805485556200023a565b828001600101855582156200023a57600052602060002091601f016020900482015b82811115620002395782548255916001019190600101906200021c565b5b5090506200024991906200024d565b5090565b6200027291905b808211156200026e57600081600090555060010162000254565b5090565b90565b6116d180620002856000396000f30060606040523615610076576000357c0100000000000000000000000000000000000000000000000000000000900463ffffffff1680631865c57d146100785780636a786b07146102bd5780639d04377814610317578063a52b2b8814610386578063a7f43779146103d4578063e3b79ca2146103e6575bfe5b341561008057fe5b610088610409565b6040518088600381111561009857fe5b60ff168152602001876009602002808383600083146100d6575b8051825260208311156100d6576020820191506020810190506020830392506100b2565b505050905001806020018673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001806020018573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200180602001848103845289818151815260200191508051906020019080838360008314610193575b8051825260208311156101935760208201915060208101905060208303925061016f565b505050905090810190601f1680156101bf5780820380516001836020036101000a031916815260200191505b50848103835287818151815260200191508051906020019080838360008314610207575b805182526020831115610207576020820191506020810190506020830392506101e3565b505050905090810190601f1680156102335780820380516001836020036101000a031916815260200191505b5084810382528581815181526020019150805190602001908083836000831461027b575b80518252602083111561027b57602082019150602081019050602083039250610257565b505050905090810190601f1680156102a75780820380516001836020036101000a031916815260200191505b509a505050505050505050505060405180910390f35b34156102c557fe5b610315600480803590602001908201803590602001908080601f0160208091040260200160405190810160405280939291908181526020018383808284378201915050505050509190505061070a565b005b341561031f57fe5b610357600480803560ff1690602001909190803573ffffffffffffffffffffffffffffffffffffffff1690602001909190505061080b565b604051808315151515815260200182600481111561037157fe5b60ff1681526020019250505060405180910390f35b341561038e57fe5b6103ba600480803573ffffffffffffffffffffffffffffffffffffffff16906020019091905050610939565b604051808215151515815260200191505060405180910390f35b34156103dc57fe5b6103e46110b5565b005b34156103ee57fe5b610407600480803560ff169060200190919050506110f8565b005b60006104136114ed565b61041b611521565b6000610425611521565b600061042f611521565b600060000160009054906101000a900460ff1660006001016000600601600101600060020160000160009054906101000a900473ffffffffffffffffffffffffffffffffffffffff166000600201600101600060040160000160009054906101000a900473ffffffffffffffffffffffffffffffffffffffff16600060040160010185600980602002604051908101604052809291908260098015610517576020028201916000905b82829054906101000a900460ff1660028111156104f157fe5b815260200190600101906020826000010492830192600103820291508084116104d85790505b50505050509550848054600181600116156101000203166002900480601f0160208091040260200160405190810160405280929190818152602001828054600181600116156101000203166002900480156105b35780601f10610588576101008083540402835291602001916105b3565b820191906000526020600020905b81548152906001019060200180831161059657829003601f168201915b50505050509450828054600181600116156101000203166002900480601f01602080910402602001604051908101604052809291908181526020018280546001816001161561010002031660029004801561064f5780601f106106245761010080835404028352916020019161064f565b820191906000526020600020905b81548152906001019060200180831161063257829003601f168201915b50505050509250808054600181600116156101000203166002900480601f0160208091040260200160405190810160405280929190818152602001828054600181600116156101000203166002900480156106eb5780601f106106c0576101008083540402835291602001916106eb565b820191906000526020600020905b8154815290600101906020018083116106ce57829003601f168201915b5050505050905096509650965096509650965096505b90919293949596565b60008151141561071957610808565b600073ffffffffffffffffffffffffffffffffffffffff16600060040160000160009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1614151561077c57610808565b33600060040160000160006101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff16021790555080600060040160010190805190602001906107df929190611535565b506001600060000160006101000a81548160ff0219169083600381111561080257fe5b02179055505b50565b60006000600060060160000160009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff16141515610879576000600091509150610932565b6001600381111561088657fe5b600060000160009054906101000a900460ff1660038111156108a457fe5b1415156108b8576000600191509150610932565b60088460ff1611156108d1576000600291509150610932565b600060028111156108de57fe5b60006001018560ff166009811015156108f357fe5b602091828204019190065b9054906101000a900460ff16600281111561091557fe5b141515610929576000600391509150610932565b60016004915091505b9250929050565b600060006000600060020160000160009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168473ffffffffffffffffffffffffffffffffffffffff1614156109a45760019150610a13565b600060040160000160009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168473ffffffffffffffffffffffffffffffffffffffff161415610a095760029150610a12565b600092506110ae565b5b60006001019050806000600981101515610a2957fe5b602091828204019190065b9054906101000a900460ff166002811115610a4b57fe5b826002811115610a5757fe5b148015610a9e5750806001600981101515610a6e57fe5b602091828204019190065b9054906101000a900460ff166002811115610a9057fe5b826002811115610a9c57fe5b145b8015610ae45750806002600981101515610ab457fe5b602091828204019190065b9054906101000a900460ff166002811115610ad657fe5b826002811115610ae257fe5b145b80610bb55750806003600981101515610af957fe5b602091828204019190065b9054906101000a900460ff166002811115610b1b57fe5b826002811115610b2757fe5b148015610b6e5750806004600981101515610b3e57fe5b602091828204019190065b9054906101000a900460ff166002811115610b6057fe5b826002811115610b6c57fe5b145b8015610bb45750806005600981101515610b8457fe5b602091828204019190065b9054906101000a900460ff166002811115610ba657fe5b826002811115610bb257fe5b145b5b80610c865750806006600981101515610bca57fe5b602091828204019190065b9054906101000a900460ff166002811115610bec57fe5b826002811115610bf857fe5b148015610c3f5750806007600981101515610c0f57fe5b602091828204019190065b9054906101000a900460ff166002811115610c3157fe5b826002811115610c3d57fe5b145b8015610c855750806008600981101515610c5557fe5b602091828204019190065b9054906101000a900460ff166002811115610c7757fe5b826002811115610c8357fe5b145b5b80610d575750806000600981101515610c9b57fe5b602091828204019190065b9054906101000a900460ff166002811115610cbd57fe5b826002811115610cc957fe5b148015610d105750806003600981101515610ce057fe5b602091828204019190065b9054906101000a900460ff166002811115610d0257fe5b826002811115610d0e57fe5b145b8015610d565750806006600981101515610d2657fe5b602091828204019190065b9054906101000a900460ff166002811115610d4857fe5b826002811115610d5457fe5b145b5b80610e285750806001600981101515610d6c57fe5b602091828204019190065b9054906101000a900460ff166002811115610d8e57fe5b826002811115610d9a57fe5b148015610de15750806004600981101515610db157fe5b602091828204019190065b9054906101000a900460ff166002811115610dd357fe5b826002811115610ddf57fe5b145b8015610e275750806007600981101515610df757fe5b602091828204019190065b9054906101000a900460ff166002811115610e1957fe5b826002811115610e2557fe5b145b5b80610ef95750806002600981101515610e3d57fe5b602091828204019190065b9054906101000a900460ff166002811115610e5f57fe5b826002811115610e6b57fe5b148015610eb25750806005600981101515610e8257fe5b602091828204019190065b9054906101000a900460ff166002811115610ea457fe5b826002811115610eb057fe5b145b8015610ef85750806008600981101515610ec857fe5b602091828204019190065b9054906101000a900460ff166002811115610eea57fe5b826002811115610ef657fe5b145b5b80610fca5750806000600981101515610f0e57fe5b602091828204019190065b9054906101000a900460ff166002811115610f3057fe5b826002811115610f3c57fe5b148015610f835750806004600981101515610f5357fe5b602091828204019190065b9054906101000a900460ff166002811115610f7557fe5b826002811115610f8157fe5b145b8015610fc95750806008600981101515610f9957fe5b602091828204019190065b9054906101000a900460ff166002811115610fbb57fe5b826002811115610fc757fe5b145b5b8061109b5750806006600981101515610fdf57fe5b602091828204019190065b9054906101000a900460ff16600281111561100157fe5b82600281111561100d57fe5b148015611054575080600460098110151561102457fe5b602091828204019190065b9054906101000a900460ff16600281111561104657fe5b82600281111561105257fe5b145b801561109a575080600260098110151561106a57fe5b602091828204019190065b9054906101000a900460ff16600281111561108c57fe5b82600281111561109857fe5b145b5b156110a957600192506110ae565b600092505b5050919050565b600060020160000160009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16ff5b565b60006000600060006111086115b5565b339450611115868661080b565b93509350831515611125576114e5565b600060020160000160009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168573ffffffffffffffffffffffffffffffffffffffff16141561129157600191506000600401604060405190810160405290816000820160009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001600182018054600181600116156101000203166002900480601f0160208091040260200160405190810160405280929190818152602001828054600181600116156101000203166002900480156112855780601f1061125a57610100808354040283529160200191611285565b820191906000526020600020905b81548152906001019060200180831161126857829003601f168201915b50505050508152505090505b600060040160000160009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168573ffffffffffffffffffffffffffffffffffffffff1614156113fd57600291506000600201604060405190810160405290816000820160009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001600182018054600181600116156101000203166002900480601f0160208091040260200160405190810160405280929190818152602001828054600181600116156101000203166002900480156113f15780601f106113c6576101008083540402835291602001916113f1565b820191906000526020600020905b8154815290600101906020018083116113d457829003601f168201915b50505050508152505090505b8160006001018760ff1660098110151561141357fe5b602091828204019190065b6101000a81548160ff0219169083600281111561143757fe5b021790555061144533610939565b15611476576002600060000160006101000a81548160ff0219169083600381111561146c57fe5b02179055506114e4565b80600060060160008201518160000160006101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff16021790555060208201518160010190805190602001906114df9291906115ec565b509050505b5b505050505050565b610120604051908101604052806009905b6000600281111561150b57fe5b8152602001906001900390816114fe5790505090565b602060405190810160405280600081525090565b828054600181600116156101000203166002900490600052602060002090601f016020900481019282601f1061157657805160ff19168380011785556115a4565b828001600101855582156115a4579182015b828111156115a3578251825591602001919060010190611588565b5b5090506115b1919061166c565b5090565b604060405190810160405280600073ffffffffffffffffffffffffffffffffffffffff1681526020016115e6611691565b81525090565b828054600181600116156101000203166002900490600052602060002090601f016020900481019282601f1061162d57805160ff191683800117855561165b565b8280016001018555821561165b579182015b8281111561165a57825182559160200191906001019061163f565b5b509050611668919061166c565b5090565b61168e91905b8082111561168a576000816000905550600101611672565b5090565b90565b6020604051908101604052806000815250905600a165627a7a72305820a0d84aa6a018c6e3656493c315e249777f9c4cc03f953a08287972890efe5c030029",
    "events": {},
    "updated_at": 1486645673796
  }
};

  Contract.checkNetwork = function(callback) {
    var self = this;

    if (this.network_id != null) {
      return callback();
    }

    this.web3.version.network(function(err, result) {
      if (err) return callback(err);

      var network_id = result.toString();

      // If we have the main network,
      if (network_id == "1") {
        var possible_ids = ["1", "live", "default"];

        for (var i = 0; i < possible_ids.length; i++) {
          var id = possible_ids[i];
          if (Contract.all_networks[id] != null) {
            network_id = id;
            break;
          }
        }
      }

      if (self.all_networks[network_id] == null) {
        return callback(new Error(self.name + " error: Can't find artifacts for network id '" + network_id + "'"));
      }

      self.setNetwork(network_id);
      callback();
    })
  };

  Contract.setNetwork = function(network_id) {
    var network = this.all_networks[network_id] || {};

    this.abi             = this.prototype.abi             = network.abi;
    this.unlinked_binary = this.prototype.unlinked_binary = network.unlinked_binary;
    this.address         = this.prototype.address         = network.address;
    this.updated_at      = this.prototype.updated_at      = network.updated_at;
    this.links           = this.prototype.links           = network.links || {};
    this.events          = this.prototype.events          = network.events || {};

    this.network_id = network_id;
  };

  Contract.networks = function() {
    return Object.keys(this.all_networks);
  };

  Contract.link = function(name, address) {
    if (typeof name == "function") {
      var contract = name;

      if (contract.address == null) {
        throw new Error("Cannot link contract without an address.");
      }

      Contract.link(contract.contract_name, contract.address);

      // Merge events so this contract knows about library's events
      Object.keys(contract.events).forEach(function(topic) {
        Contract.events[topic] = contract.events[topic];
      });

      return;
    }

    if (typeof name == "object") {
      var obj = name;
      Object.keys(obj).forEach(function(name) {
        var a = obj[name];
        Contract.link(name, a);
      });
      return;
    }

    Contract.links[name] = address;
  };

  Contract.contract_name   = Contract.prototype.contract_name   = "Contract";
  Contract.generated_with  = Contract.prototype.generated_with  = "3.2.0";

  // Allow people to opt-in to breaking changes now.
  Contract.next_gen = false;

  var properties = {
    binary: function() {
      var binary = Contract.unlinked_binary;

      Object.keys(Contract.links).forEach(function(library_name) {
        var library_address = Contract.links[library_name];
        var regex = new RegExp("__" + library_name + "_*", "g");

        binary = binary.replace(regex, library_address.replace("0x", ""));
      });

      return binary;
    }
  };

  Object.keys(properties).forEach(function(key) {
    var getter = properties[key];

    var definition = {};
    definition.enumerable = true;
    definition.configurable = false;
    definition.get = getter;

    Object.defineProperty(Contract, key, definition);
    Object.defineProperty(Contract.prototype, key, definition);
  });

  bootstrap(Contract);

  if (typeof module != "undefined" && typeof module.exports != "undefined") {
    module.exports = Contract;
  } else {
    // There will only be one version of this contract in the browser,
    // and we can use that.
    window.Contract = Contract;
  }
})();
