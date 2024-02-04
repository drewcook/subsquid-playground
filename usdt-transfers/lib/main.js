"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const evm_processor_1 = require("@subsquid/evm-processor");
const typeorm_store_1 = require("@subsquid/typeorm-store");
const archive_registry_1 = require("@subsquid/archive-registry");
const usdtAbi = __importStar(require("./abi/usdt"));
const model_1 = require("./model");
const processor = new evm_processor_1.EvmBatchProcessor()
    .setGateway((0, archive_registry_1.lookupArchive)('eth-mainnet'))
    .setRpcEndpoint({
    // set RPC endpoiing in .env
    url: process.env.RPC_ETH_HTTP,
    rateLimit: 10
})
    .setFinalityConfirmation(75) // 15 minutes to finality
    .addLog({
    address: ['0xdAC17F958D2ee523a2206206994597C13D831ec7'],
    topic0: [usdtAbi.events.Transfer.topic]
}); // USDT transfer events
const database = new typeorm_store_1.TypeormDatabase();
processor.run(database, async (ctx) => {
    const transfers = [];
    // Iterate over all logs of all blocks
    for (let block of ctx.blocks) {
        for (let log of block.logs) {
            // Decode the log data and add to transfers
            let { from, to, value } = usdtAbi.events.Transfer.decode(log);
            transfers.push(new model_1.Transfer({
                id: log.id,
                from,
                to,
                value,
            }));
        }
    }
    // Store in postgres
    await ctx.store.insert(transfers);
});
