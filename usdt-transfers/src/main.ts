import { EvmBatchProcessor } from '@subsquid/evm-processor'
import { TypeormDatabase } from '@subsquid/typeorm-store'
import { lookupArchive } from '@subsquid/archive-registry'
import * as usdtAbi from './abi/usdt'
import { Transfer } from './model'

const processor = new EvmBatchProcessor()
	.setGateway(lookupArchive('eth-mainnet'))
	.setRpcEndpoint({
		// set RPC endpoiing in .env
		url: process.env.RPC_ETH_HTTP,
		rateLimit: 10
	})
	.setFinalityConfirmation(75) // 15 minutes to finality
	.addLog({
		address: ['0xdAC17F958D2ee523a2206206994597C13D831ec7'],
		topic0: [usdtAbi.events.Transfer.topic]
	}) // USDT transfer events

const database = new TypeormDatabase()

processor.run(database, async ctx => {
	const transfers: Transfer[] = []
	// Iterate over all logs of all blocks that include our log specified above
	for (let block of ctx.blocks) {
		for (let log of block.logs) {
			// Decode the log data and add to transfers
			let { from, to, value } = usdtAbi.events.Transfer.decode(log)
			transfers.push(new Transfer({
				id: log.id,
				from,
				to,
				value,
			}))
		}
	}
	// Store in postgres
	await ctx.store.insert(transfers)
})