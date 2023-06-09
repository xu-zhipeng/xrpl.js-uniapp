/* eslint-disable @typescript-eslint/consistent-type-assertions -- needed here */
/* eslint-disable no-await-in-loop -- needed here */
import {
  AccountObjectsRequest,
  LedgerEntry,
  Client,
  XChainAccountCreateCommit,
  XChainBridge,
  XChainCommit,
  XChainCreateClaimID,
  xrpToDrops,
  Wallet,
  TransactionMetadata,
} from '../../src'
import { CreatedNode } from '../../src/models/transactions/metadata'

async function sleep(sec: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, sec * 1000)
  })
}

const lockingClient = new Client(
  'wss://sidechain-net1.devnet.rippletest.net:51233',
)
const issuingClient = new Client(
  'wss://sidechain-net2.devnet.rippletest.net:51233',
)
const MAX_LEDGERS_WAITED = 5
const LEDGER_CLOSE_TIME = 4

void bridgeTransfer()

async function bridgeTransfer(): Promise<void> {
  await lockingClient.connect()
  await issuingClient.connect()
  const lockingChainDoor = 'rMAXACCrp3Y8PpswXcg3bKggHX76V3F8M4'

  const accountObjectsRequest: AccountObjectsRequest = {
    command: 'account_objects',
    account: lockingChainDoor,
  }
  const bridgeData = (await lockingClient.request(accountObjectsRequest)).result
    .account_objects[0] as LedgerEntry.Bridge
  const bridge: XChainBridge = bridgeData.XChainBridge
  console.log(bridge)

  const { wallet: wallet1 } = await lockingClient.fundWallet()
  const wallet2 = Wallet.generate()

  console.log(
    `Creating ${wallet2.classicAddress} on the issuing chain via the bridge...`,
  )

  const fundTx: XChainAccountCreateCommit = {
    TransactionType: 'XChainAccountCreateCommit',
    Account: wallet1.classicAddress,
    XChainBridge: bridge,
    SignatureReward: bridgeData.SignatureReward,
    Destination: wallet2.classicAddress,
    Amount: (
      parseInt(bridgeData.MinAccountCreateAmount as string, 10) * 2
    ).toString(),
  }
  const fundResponse = await lockingClient.submitAndWait(fundTx, {
    wallet: wallet1,
  })
  console.log(fundResponse)

  // wait for the attestation to go through
  let ledgersWaited = 0
  let initialBalance = '0'
  while (ledgersWaited < MAX_LEDGERS_WAITED) {
    await sleep(LEDGER_CLOSE_TIME)
    try {
      initialBalance = await issuingClient.getXrpBalance(wallet2.classicAddress)
      console.log(
        `Wallet ${wallet2.classicAddress} has been funded with a balance of ${initialBalance} XRP`,
      )
      break
    } catch (_error) {
      ledgersWaited += 1
      // eslint-disable-next-line max-depth -- needed here
      if (ledgersWaited === MAX_LEDGERS_WAITED) {
        throw Error('Destination account creation via the bridge failed.')
      }
    }
  }

  console.log(
    `Transferring funds from ${wallet1.classicAddress} on the locking chain to ` +
      `${wallet2.classicAddress} on the issuing_chain...`,
  )

  // Fetch the claim ID for the transfer
  console.log('Step 1: Fetching the claim ID for the transfer...')
  const claimIdTx: XChainCreateClaimID = {
    TransactionType: 'XChainCreateClaimID',
    Account: wallet2.classicAddress,
    XChainBridge: bridge,
    SignatureReward: bridgeData.SignatureReward,
    OtherChainSource: wallet1.classicAddress,
  }
  const claimIdResult = await issuingClient.submitAndWait(claimIdTx, {
    wallet: wallet2,
  })

  // extract new claim ID from metadata
  const nodes = (claimIdResult.result.meta as TransactionMetadata).AffectedNodes
  const createdNodes = nodes.filter((node) =>
    Object.keys(node).includes('CreatedNode'),
  )
  const claimIdsLedgerEntries = (createdNodes as CreatedNode[]).filter(
    (node) => node.CreatedNode.LedgerEntryType === 'XChainOwnedClaimID',
  )
  if (claimIdsLedgerEntries.length !== 1) {
    // This error should never hit and is just a sanity check
    throw Error('Wallet has more than one claim ID')
  }
  const xchainClaimId = claimIdsLedgerEntries[0].CreatedNode.NewFields
    .XChainClaimID as string

  console.log(`Claim ID for the transfer: ${xchainClaimId}`)

  // XChainCommit
  console.log('Step 2: Locking the funds on the locking chain...')

  const commitTx: XChainCommit = {
    TransactionType: 'XChainCommit',
    Account: wallet1.classicAddress,
    Amount: xrpToDrops(1),
    XChainBridge: bridge,
    XChainClaimID: xchainClaimId,
    OtherChainDestination: wallet2.classicAddress,
  }
  const commitResult = await lockingClient.submitAndWait(commitTx, {
    wallet: wallet1,
  })
  console.log(commitResult)

  // wait for the attestations to go through
  ledgersWaited = 0
  while (ledgersWaited < MAX_LEDGERS_WAITED) {
    await sleep(LEDGER_CLOSE_TIME)
    const currentBalance = await issuingClient.getXrpBalance(
      wallet2.classicAddress,
    )
    console.log(initialBalance, currentBalance)
    if (parseFloat(currentBalance) > parseFloat(initialBalance)) {
      console.log('Transfer is complete')
      console.log(
        `New balance of ${wallet2.classicAddress} is ${currentBalance} XRP`,
      )
      break
    }

    ledgersWaited += 1
    if (ledgersWaited === MAX_LEDGERS_WAITED) {
      throw Error('Bridge transfer failed.')
    }
  }

  await lockingClient.disconnect()
  await issuingClient.disconnect()
}