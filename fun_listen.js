const ethers = require('ethers');
require('dotenv').config();
const {
    FlashbotsBundleProvider,
    FlashbotsBundleResolution
} = require("@flashbots/ethers-provider-bundle");


const PK1 = process.env.PK1
PK2 = process.env.PK2;
const http_provider = new ethers.providers.JsonRpcProvider(process.env.HTTPRPC)
wss_provider = new ethers.providers.WebSocketProvider(process.env.WSSRPC);

let main_wallet = new ethers.Wallet(PK1, http_provider);
small_wallet = new ethers.Wallet(PK2, http_provider);

const authSigner = ethers.Wallet.createRandom();



//拿到txhash之后, 还原raw tx
function getRawTransaction(tx) {
    function addKey(accum, key) {
        if (tx[key]) { accum[key] = tx[key]; }
        return accum;
    }
    // Extract the relevant parts of the transaction and signature
    const txFields = "accessList chainId data gasPrice gasLimit maxFeePerGas maxPriorityFeePerGas nonce to type value".split(" ");
    const sigFields = "v r s".split(" ");
    // Seriailze the signed transaction
    const raw = ethers.utils.serializeTransaction(txFields.reduce(addKey, {}), sigFields.reduce(addKey, {}));
    // Double check things went well
    if (ethers.utils.keccak256(raw) !== tx.hash) { throw new Error("serializing failed!"); }
    return raw;
}


async function send_bundle(first_tx){
    const flashbotsProvider = await FlashbotsBundleProvider.create(
        http_provider,
        authSigner,
        "https://relay-goerli.flashbots.net",
        "goerli"
    );
    let first_tx_raw = getRawTransaction(first_tx)
    let targetBlockNumber = (await http_provider.getBlockNumber()) + 1
    let first_tx_gas_price = first_tx.gasPrice
    // let second_tx = {
    //     signer: small_wallet,
    //     transaction: {
    //         to: main_wallet.address,
    //         gasPrice: first_tx_gas_price.mul(2),
    //         gasLimit: 21000,
    //         chainId: http_provider.network.chainId,
    //     }
    // }
    let second_tx = {
        to: main_wallet.address,
        gasPrice: first_tx_gas_price.mul(3).div(2),
        gasLimit: 21000,
    }
    let signed_second_tx = await small_wallet.signTransaction(second_tx)

    let bundle = [
        {
            signedTransaction: first_tx_raw,
        },
        {
            signedTransaction: signed_second_tx,
        }
    ]
    console.log("Bundle",bundle)

    let signed_bundle = await flashbotsProvider.signBundle(bundle);
    console.log("Signed Bunudle",signed_bundle)
    // const simulation = await flashbotsProvider.simulate(signed_bundle, targetBlockNumber)
    // if ("error" in simulation) {
    //     console.log(`Simulation Error: ${simulation.error.message}`);
    // }
    // console.log(`Target is ${targetBlockNumber} Send it`)
    // console.log("Simulate Success")
    const flashbotsTransactionResponse = await flashbotsProvider.sendBundle(
        bundle,
        targetBlockNumber
    )
    if ('error' in flashbotsTransactionResponse) {
        throw new Error(flashbotsTransactionResponse.error)
    }
    

    const waitResponse = await flashbotsTransactionResponse.wait()
    if (waitResponse === FlashbotsBundleResolution.BundleIncluded) {
        console.log("Nice, include in ", targetBlockNumber)
        process.exit(0)
    } else if (waitResponse === FlashbotsBundleResolution.BlockPassedWithoutInclusion) {
        console.log(`Not include in ${targetBlockNumber}`)
        console.log("==========================")
    } else if (waitResponse === FlashbotsBundleResolution.AccountNonceTooHigh) {
        console.log(`AccountNonceTooHigh`)
        process.exit(1)
    }

}


async function check_pending() {
    wss_provider.on('pending', async (tx_hash) => {
        let tx = await http_provider.getTransaction(tx_hash);
        if (tx) {
            if (tx.from.toLocaleLowerCase() == main_wallet.address.toLocaleLowerCase()) {
                console.log(tx)
                // console.log(getRawTransaction(tx))
                wss_provider.removeAllListeners('pending');
                await send_bundle(tx)
                //break pending loop

            } else {
                console.log('not my tx', tx.from, tx.hash)
                // wss_provider.removeAllListeners('pending');
                // return
            }
        }
    })
    // return
}

check_pending()
// console.log(ethers.utils.)
