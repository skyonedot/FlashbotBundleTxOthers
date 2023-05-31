const ethers = require('ethers');
require('dotenv').config();
const PK1 = process.env.PK1
      PK2 = process.env.PK2;
const http_provider = new ethers.providers.JsonRpcProvider(process.env.HTTPRPC)
    //   wss_provider = new ethers.providers.WebSocketProvider(process.env.WSSRPC);

let main_wallet = new ethers.Wallet(PK1, http_provider);
    small_wallet = new ethers.Wallet(PK2, http_provider);

async function main_wallet_send_tx(){
        let gasPrice = await http_provider.getGasPrice();
        let nonce = await http_provider.getTransactionCount(main_wallet.address);
        let tx = {
            to: small_wallet.address,
            gasPrice: gasPrice.mul(8).div(7),
            gasLimit: 21000,
            nonce: nonce
        }
        let signed_tx = await main_wallet.signTransaction(tx);
        console.log("Raw transaction signature",signed_tx,'\n---------------------------')


        let send_tx = await http_provider.sendTransaction(signed_tx);
        console.log(send_tx);
        // let send_tx = await main_wallet.sendTransaction(tx);
        // console.log(send_tx.hash);
}

main_wallet_send_tx()

