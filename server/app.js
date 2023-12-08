var express = require('express');
var app = express();
var bodyParser = require('body-parser');
const cors = require('cors');
const http = require ('http');
const ethers = require("ethers");
const { ERC20_ABI } = require("./erc20.js");

require('dotenv').config();


var events = require('events');

var eventEmitter = new events.EventEmitter();

const sleep = (milliseconds) => {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
};

var port = process.env.PORT || 8080;

console.log(process.env.DURATION);

app.use(bodyParser.json()); 
app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(cors());

async function buyAction(data){
    
    console.log(data.address, data.slippage, data.gasprice, data.gaslimit, data.buybnbamount, data.buyTokenAddress);
    
    // var customWsProvider = new ethers.providers.WebSocketProvider(process.env.NODEURL);
    const provider = new ethers.providers.JsonRpcProvider(process.env.mainnetURL);

    var ethWallet = new ethers.Wallet(process.env.privKey);
    const account = ethWallet.connect(provider);
    const router = new ethers.Contract(
      process.env.PCS_ROUTER_ADDR,
      [
        "function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)",
        "function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)",
        "function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)",
        "function swapExactETHForTokensSupportingFeeOnTransferTokens(uint amountOutMin,address[] calldata path,address to, uint deadline) external payable",
        "function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)",
        "function swapExactTokensForETHSupportingFeeOnTransferTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external",
        "function swapExactTokensForTokensSupportingFeeOnTransferTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external",
    ],
      account
    );

    const amountIn = ethers.utils.parseUnits(`${data.buybnbamount}`, "ether");

    let txBuy = await router
    .swapExactETHForTokens(
    0,
    [process.env.WBNB_ADDR, data.buyTokenAddress],
    data.address,
    Date.now(),
    {
        gasLimit: data.gaslimit.toString(),
        gasPrice: ethers.utils.parseUnits(`${data.gasprice}`, "gwei"),
        value: amountIn.toString()
    }
    )
    .catch((err) => {
    console.log(err);
    console.log("transaction failed...");
    });

    
}

async function sellAction(data){
    console.log(data.selltokenAmount);
    console.log(data.selltokenaddress);
    console.log("------------------------------------------------");

    // var customWsProvider = new ethers.providers.WebSocketProvider(process.env.NODEURL);
    const provider = new ethers.providers.JsonRpcProvider(process.env.mainnetURL);
    console.log("debug6");
    var ethWallet = new ethers.Wallet(process.env.privKey);
    const account = ethWallet.connect(provider);
    const router = new ethers.Contract(
      process.env.PCS_ROUTER_ADDR,
      [
        "function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)",
        "function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)",
        "function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)",
        "function swapExactETHForTokensSupportingFeeOnTransferTokens(uint amountOutMin,address[] calldata path,address to, uint deadline) external payable",
        "function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)",
        "function swapExactTokensForETHSupportingFeeOnTransferTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external",
        "function swapExactTokensForTokensSupportingFeeOnTransferTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external",
    ],
      account
    );

    console.log("debug1");

    let tokenContract = new ethers.Contract(data.selltokenaddress, ERC20_ABI, account);
    
    let amount = await tokenContract.allowance(data.address, process.env.PCS_ROUTER_ADDR);
    console.log("debug5");
    if (
        amount <
        115792089237316195423570985008687907853269984665640564039457584007913129639935
      ) {
        try {
            const approve = await tokenContract.approve(
                process.env.PCS_ROUTER_ADDR,
                ethers.BigNumber.from("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"),
                {   gasLimit: 100000,
                    gasPrice: ethers.utils.parseUnits(`10`, "gwei") }
            ).catch((err) => {
                console.log(err);
                console.log("Token approve failed");
            });
            await approve.wait();
        }catch(err){
            console.log(err)
        }
      }
    console.log("debug2", typeof data.selltokenAmount, data.selltokenAmount);
    const sellAmountIn = ethers.utils.parseUnits(`${data.selltokenAmount}`, "ether");
    console.log("sellAmountIn", sellAmountIn.toString());

    console.log("type1", typeof(data.selltokenAmount));
    console.log("type2", typeof(data.selltokenaddress));
    
    console.log("type3", typeof(data.gasPrice), data.gasPrice);
    console.log("type4", typeof(data.gaslimit), data.gaslimit);
    console.log("debug10");
    let txSell = await router.swapExactTokensForTokensSupportingFeeOnTransferTokens(
        sellAmountIn,
        0,
        [ data.selltokenaddress, process.env.WBNB_ADDR ],
        data.address,
        Date.now(),
        {
            gasLimit: data.gaslimit,
            gasPrice: ethers.utils.parseUnits(`${data.gasPrice}`, "gwei"),
        }
      )
      .catch((err) => {
          console.log(`${err}`);
          return;
      }); 
      
      console.log("debug4");
}

app.post('/buystart', async(req, res) => {
    
    // var start = Date.now();
    let flag = true;
    eventEmitter.on('buy', (token) => {
        flag = false;
        res.status(200).json({
            "func": "/buystart",
            "value": token,
            "time": Date.now()
        });
    });

    while(flag){
        // Buy Transaction
        console.log("Buy action doing");
        buyAction(req.body);
        console.log("Waiting for duration");
        await sleep(process.env.DURATION);
    }

    console.log("Buy action stopped..");
});
app.post('/buystop', (req, res) => {
    
    var token = 1;

    eventEmitter.emit('buy', token);

    res.status(200).json({
        "func": "/buystop",
        "value": token,
        "time": Date.now()
    });

});
app.post('/sellstart', async(req, res) => {
    
    // var start = Date.now();
    let flag = true;
    eventEmitter.on('sell', (token) => {
        flag = false;
        res.status(200).json({
            "func": "/sellstart",
            "value": token,
            "time": Date.now()
        });
    });

    while(flag){
        // Sell Transaction
        console.log("Sell action doing");
        sellAction(req.body);
        console.log("Waiting for duration");
        await sleep(process.env.DURATION);
    }
    console.log("Sell action stopped..");
});
app.post('/sellstop', (req, res) => {
    
    var token = 2;

    eventEmitter.emit('sell', token);

    res.status(200).json({
        "func": "/sellstop",
        "value": token,
        "time": Date.now()
    });

});

// index path
app.post('/', function(req, res){
    console.log('app listening on port: '+ port);
    res.send('tes express nodejs sqlite')
});

const server = http.createServer(app);

server.listen(port, function(){
    console.log('app listening on port: '+ port);
});

global.snipSubscription = null;
global.frontSubscription = null;

module.exports = app;