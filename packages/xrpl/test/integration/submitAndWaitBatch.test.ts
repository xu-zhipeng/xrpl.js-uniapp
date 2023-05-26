/* eslint-disable @typescript-eslint/no-misused-promises -- supposed to return a promise here */
/* eslint-disable no-restricted-syntax -- not sure why this rule is here, definitely not needed here */
import { assert } from 'chai'
import _ from 'lodash'

import { Payment } from '../../src'

import serverUrl from './serverUrl'
import {
  XrplIntegrationTestContext,
  setupClient,
  teardownClient,
} from './setup'
import { generateFundedWallet, ledgerAccept } from './utils'

// how long before each test case times out
const TIMEOUT = 60000

describe('client.submitAndWaitBatch', function () {
  let testContext: XrplIntegrationTestContext

  beforeEach(async () => {
    testContext = await setupClient(serverUrl)
  })
  afterEach(async () => teardownClient(testContext))

  it(
    'submitAndWaitBatch a single account submits one payment transaction',
    async function () {
      const receiverWallet = await generateFundedWallet(testContext.client)

      const paymentTx: Payment = {
        TransactionType: 'Payment',
        Account: testContext.wallet.classicAddress,
        Destination: receiverWallet.classicAddress,
        Amount: '1000',
      }
      const txList = [
        {
          transaction: paymentTx,
          opts: { wallet: testContext.wallet },
        },
      ]

      const responsePromise = testContext.client.submitAndWaitBatch(txList)

      const ledgerPromise = setTimeout(ledgerAccept, 1000, testContext.client)
      return Promise.all([responsePromise, ledgerPromise]).then(
        ([result, _ledger]) => {
          assert.equal(result.success.length, 1)
          assert.equal(result.error.length, 0)
          assert.equal(result.success[0].type, 'response')
          assert.equal(result.success[0].result.validated, true)
        },
      )
    },
    TIMEOUT,
  )

  it(
    'submitAndWaitBatch a single account submits one failed transaction',
    async function () {
      const invalidAccountDeleteTx = {
        TransactionType: 'AccountDelete',
        Account: testContext.wallet.classicAddress,
        Destination: testContext.wallet.classicAddress,
        Amount: '1000',
      }
      const txList = [
        {
          transaction: invalidAccountDeleteTx,
          opts: { wallet: testContext.wallet },
        },
      ]

      // @ts-expect-error -- valid for this test
      const responsePromise = testContext.client.submitAndWaitBatch(txList)

      const ledgerPromise = setTimeout(ledgerAccept, 1000, testContext.client)
      return Promise.all([responsePromise, ledgerPromise]).then(
        ([result, _ledger]) => {
          assert.equal(result.success.length, 0)
          assert.equal(result.error.length, 1)
          assert.equal(result.error[0].data.error, 'invalidTransaction')
          assert.equal(result.error[0].data.status, 'error')
        },
      )
    },
    TIMEOUT,
  )

  it(
    'submitAndWaitBatch a single account submits multiple payment transactions',
    async function () {
      const receiverWallet = await generateFundedWallet(testContext.client)
      const receiverWallet2 = await generateFundedWallet(testContext.client)

      const paymentTx: Payment = {
        TransactionType: 'Payment',
        Account: testContext.wallet.classicAddress,
        Destination: receiverWallet.classicAddress,
        Amount: '1000',
      }
      const paymentTx2: Payment = {
        TransactionType: 'Payment',
        Account: testContext.wallet.classicAddress,
        Destination: receiverWallet2.classicAddress,
        Amount: '1000',
      }
      const txList = [
        {
          transaction: paymentTx,
          opts: { wallet: testContext.wallet },
        },
        {
          transaction: paymentTx2,
          opts: { wallet: testContext.wallet },
        },
      ]

      const responsePromise = testContext.client.submitAndWaitBatch(txList)

      const ledgerPromise = setTimeout(ledgerAccept, 1000, testContext.client)
      const ledgerPromise2 = setTimeout(ledgerAccept, 3000, testContext.client)
      return Promise.all([responsePromise, ledgerPromise, ledgerPromise2]).then(
        ([result, _ledger, _ledger2]) => {
          assert.equal(result.success.length, 2)
          assert.equal(result.error.length, 0)
          for (const response of result.success) {
            assert.equal(response.type, 'response')
            assert.equal(response.result.validated, true)
          }
        },
      )
    },
    TIMEOUT,
  )

  it(
    'submitAndWaitBatch a single account submits multiple payment transactions with one failed transaction',
    async function () {
      const receiverWallet = await generateFundedWallet(testContext.client)

      const paymentTx: Payment = {
        TransactionType: 'Payment',
        Account: testContext.wallet.classicAddress,
        Destination: receiverWallet.classicAddress,
        Amount: '1000',
      }
      const invalidAccountDeleteTx = {
        TransactionType: 'AccountDelete',
        Account: testContext.wallet.classicAddress,
        Destination: testContext.wallet.classicAddress,
        Amount: '1000',
      }
      const txList = [
        {
          transaction: paymentTx,
          opts: { wallet: testContext.wallet },
        },
        {
          transaction: invalidAccountDeleteTx,
          opts: { wallet: testContext.wallet },
        },
      ]

      // @ts-expect-error -- valid for this test
      const responsePromise = testContext.client.submitAndWaitBatch(txList)

      const ledgerPromise = setTimeout(ledgerAccept, 1000, testContext.client)
      const ledgerPromise2 = setTimeout(ledgerAccept, 3000, testContext.client)
      return Promise.all([responsePromise, ledgerPromise, ledgerPromise2]).then(
        ([result, _ledger, _ledger2]) => {
          assert.equal(result.success.length, 1)
          assert.equal(result.error.length, 1)
          assert.equal(result.success[0].type, 'response')
          assert.equal(result.success[0].result.validated, true)
          assert.equal(result.error[0].data.error, 'invalidTransaction')
          assert.equal(result.error[0].data.status, 'error')
        },
      )
    },
    TIMEOUT,
  )

  it(
    'submitAndWaitBatch multiple accounts submit one payment transaction',
    async function () {
      const receiverWallet = await generateFundedWallet(testContext.client)
      const senderWallet2 = await generateFundedWallet(testContext.client)
      const receiverWallet2 = await generateFundedWallet(testContext.client)

      const paymentTx: Payment = {
        TransactionType: 'Payment',
        Account: testContext.wallet.classicAddress,
        Destination: receiverWallet.classicAddress,
        Amount: '1000',
      }
      const paymentTx2: Payment = {
        TransactionType: 'Payment',
        Account: senderWallet2.classicAddress,
        Destination: receiverWallet2.classicAddress,
        Amount: '1000',
      }
      const txList = [
        {
          transaction: paymentTx,
          opts: { wallet: testContext.wallet },
        },
        {
          transaction: paymentTx2,
          opts: { wallet: senderWallet2 },
        },
      ]

      const responsePromise = testContext.client.submitAndWaitBatch(txList)

      const ledgerPromise = setTimeout(ledgerAccept, 1000, testContext.client)
      const ledgerPromise2 = setTimeout(ledgerAccept, 3000, testContext.client)
      return Promise.all([responsePromise, ledgerPromise, ledgerPromise2]).then(
        ([result, _ledger, _ledger2]) => {
          assert.equal(result.success.length, 2)
          assert.equal(result.error.length, 0)
          for (const response of result.success) {
            assert.equal(response.type, 'response')
            assert.equal(response.result.validated, true)
          }
        },
      )
    },
    TIMEOUT,
  )

  it(
    'submitAndWaitBatch multiple accounts submit one failed transaction',
    async function () {
      const senderWallet2 = await generateFundedWallet(testContext.client)

      const invalidAccountDeleteTx = {
        TransactionType: 'AccountDelete',
        Account: testContext.wallet.classicAddress,
        Destination: testContext.wallet.classicAddress,
        Amount: '1000',
      }
      const invalidAccountDeleteTx2 = {
        TransactionType: 'AccountDelete',
        Account: senderWallet2.classicAddress,
        Destination: senderWallet2.classicAddress,
        Amount: '1000',
      }
      const txList = [
        {
          transaction: invalidAccountDeleteTx,
          opts: { wallet: testContext.wallet },
        },
        {
          transaction: invalidAccountDeleteTx2,
          opts: { wallet: senderWallet2 },
        },
      ]

      // @ts-expect-error -- valid for this test
      const responsePromise = testContext.client.submitAndWaitBatch(txList)

      const ledgerPromise = setTimeout(ledgerAccept, 1000, testContext.client)
      const ledgerPromise2 = setTimeout(ledgerAccept, 3000, testContext.client)
      return Promise.all([responsePromise, ledgerPromise, ledgerPromise2]).then(
        ([result, _ledger, _ledger2]) => {
          assert.equal(result.success.length, 0)
          assert.equal(result.error.length, 2)
          for (const response of result.error) {
            assert.equal(response.data.error, 'invalidTransaction')
            assert.equal(response.data.status, 'error')
          }
        },
      )
    },
    TIMEOUT,
  )

  it(
    'submitAndWaitBatch multiple accounts submit multiple payment transactions',
    async function () {
      const receiverWallet = await generateFundedWallet(testContext.client)
      const receiverWallet2 = await generateFundedWallet(testContext.client)
      const senderWallet2 = await generateFundedWallet(testContext.client)
      const receiverWallet3 = await generateFundedWallet(testContext.client)
      const receiverWallet4 = await generateFundedWallet(testContext.client)

      const paymentTx: Payment = {
        TransactionType: 'Payment',
        Account: testContext.wallet.classicAddress,
        Destination: receiverWallet.classicAddress,
        Amount: '1000',
      }
      const paymentTx2: Payment = {
        TransactionType: 'Payment',
        Account: testContext.wallet.classicAddress,
        Destination: receiverWallet2.classicAddress,
        Amount: '1000',
      }
      const paymentTx3: Payment = {
        TransactionType: 'Payment',
        Account: senderWallet2.classicAddress,
        Destination: receiverWallet3.classicAddress,
        Amount: '1000',
      }
      const paymentTx4: Payment = {
        TransactionType: 'Payment',
        Account: senderWallet2.classicAddress,
        Destination: receiverWallet4.classicAddress,
        Amount: '1000',
      }
      const txList = [
        {
          transaction: paymentTx,
          opts: { wallet: testContext.wallet },
        },
        {
          transaction: paymentTx2,
          opts: { wallet: testContext.wallet },
        },
        {
          transaction: paymentTx3,
          opts: { wallet: senderWallet2 },
        },
        {
          transaction: paymentTx4,
          opts: { wallet: senderWallet2 },
        },
      ]

      const responsePromise = testContext.client.submitAndWaitBatch(txList)

      const ledgerPromise = setTimeout(ledgerAccept, 1000, testContext.client)
      const ledgerPromise2 = setTimeout(ledgerAccept, 3000, testContext.client)
      return Promise.all([responsePromise, ledgerPromise, ledgerPromise2]).then(
        ([result, _ledger, _ledger2]) => {
          assert.equal(result.success.length, 4)
          assert.equal(result.error.length, 0)
          for (const response of result.success) {
            assert.equal(response.type, 'response')
            assert.equal(response.result.validated, true)
          }
        },
      )
    },
    TIMEOUT,
  )

  it(
    'submitAndWaitBatch multiple accounts submit multiple payment transactions with one failed transaction',
    async function () {
      const receiverWallet = await generateFundedWallet(testContext.client)
      const senderWallet2 = await generateFundedWallet(testContext.client)
      const receiverWallet2 = await generateFundedWallet(testContext.client)

      const paymentTx: Payment = {
        TransactionType: 'Payment',
        Account: testContext.wallet.classicAddress,
        Destination: receiverWallet.classicAddress,
        Amount: '1000',
      }
      const invalidAccountDeleteTx = {
        TransactionType: 'AccountDelete',
        Account: testContext.wallet.classicAddress,
        Destination: testContext.wallet.classicAddress,
        Amount: '1000',
      }
      const paymentTx2: Payment = {
        TransactionType: 'Payment',
        Account: senderWallet2.classicAddress,
        Destination: receiverWallet2.classicAddress,
        Amount: '1000',
      }
      const invalidAccountDeleteTx2 = {
        TransactionType: 'AccountDelete',
        Account: senderWallet2.classicAddress,
        Destination: senderWallet2.classicAddress,
        Amount: '1000',
      }
      const txList = [
        {
          transaction: paymentTx,
          opts: { wallet: testContext.wallet },
        },
        {
          transaction: invalidAccountDeleteTx,
          opts: { wallet: testContext.wallet },
        },
        {
          transaction: paymentTx2,
          opts: { wallet: senderWallet2 },
        },
        {
          transaction: invalidAccountDeleteTx2,
          opts: { wallet: senderWallet2 },
        },
      ]

      // @ts-expect-error -- valid for this test
      const responsePromise = testContext.client.submitAndWaitBatch(txList)

      const ledgerPromise = setTimeout(ledgerAccept, 1000, testContext.client)
      const ledgerPromise2 = setTimeout(ledgerAccept, 3000, testContext.client)
      return Promise.all([responsePromise, ledgerPromise, ledgerPromise2]).then(
        ([result, _ledger, _ledger2]) => {
          assert.equal(result.success.length, 2)
          assert.equal(result.error.length, 2)
          for (const response of result.success) {
            assert.equal(response.type, 'response')
            assert.equal(response.result.validated, true)
          }
          for (const response of result.error) {
            assert.equal(response.data.error, 'invalidTransaction')
            assert.equal(response.data.status, 'error')
          }
        },
      )
    },
    TIMEOUT,
  )

  /*
   * TODO: blocked on this test case failing by timing out.
   *
   * Investigatin this, it looks like the promise doesn't resolve transactions that fail with XrplError.
   * I logged the error to see what outputs after it times out and it's an XrplError:
   *      XrplError: The latest ledger sequence 35060782 is greater than the transaction's LastLedgerSequence (35060781).
   *      Preliminary result: terPRE_SEQ never resolves
   *
   * I tried setting opts.failHard to true but it didn't make a difference.
   *
   * Is there an example where we handle XrplError similar error in integ tests?
   */

  it(
    'submitAndWaitBatch multiple accounts submit multiple payment transactions with one failed transaction that causes subsequent transactions to fail too',
    async function () {
      const receiverWallet = await generateFundedWallet(testContext.client)
      const receiverWallet2 = await generateFundedWallet(testContext.client)
      const senderWallet2 = await generateFundedWallet(testContext.client)
      const receiverWallet3 = await generateFundedWallet(testContext.client)
      const receiverWallet4 = await generateFundedWallet(testContext.client)

      const paymentTx: Payment = {
        TransactionType: 'Payment',
        Account: testContext.wallet.classicAddress,
        Destination: receiverWallet.classicAddress,
        Amount: '1000',
      }
      const invalidAccountDeleteTx = {
        TransactionType: 'AccountDelete',
        Account: testContext.wallet.classicAddress,
        Destination: testContext.wallet.classicAddress,
        Amount: '1000',
      }
      const paymentTx2: Payment = {
        TransactionType: 'Payment',
        Account: testContext.wallet.classicAddress,
        Destination: receiverWallet2.classicAddress,
        Amount: '1000',
      }
      const paymentTx3: Payment = {
        TransactionType: 'Payment',
        Account: senderWallet2.classicAddress,
        Destination: receiverWallet3.classicAddress,
        Amount: '1000',
      }
      const invalidAccountDeleteTx2 = {
        TransactionType: 'AccountDelete',
        Account: senderWallet2.classicAddress,
        Destination: senderWallet2.classicAddress,
        Amount: '1000',
      }
      const paymentTx4: Payment = {
        TransactionType: 'Payment',
        Account: senderWallet2.classicAddress,
        Destination: receiverWallet4.classicAddress,
        Amount: '1000',
      }
      const txList = [
        {
          transaction: paymentTx,
          opts: { wallet: testContext.wallet },
        },
        {
          transaction: invalidAccountDeleteTx,
          opts: { wallet: testContext.wallet },
        },
        {
          transaction: paymentTx2,
          opts: { wallet: testContext.wallet },
        },
        {
          transaction: paymentTx3,
          opts: { wallet: senderWallet2 },
        },
        {
          transaction: invalidAccountDeleteTx2,
          opts: { wallet: senderWallet2 },
        },
        {
          transaction: paymentTx4,
          opts: { wallet: senderWallet2 },
        },
      ]

      // @ts-expect-error -- valid for this test
      const responsePromise = testContext.client.submitAndWaitBatch(txList)

      const ledgerPromise = setTimeout(ledgerAccept, 1000, testContext.client)
      const ledgerPromise2 = setTimeout(ledgerAccept, 3000, testContext.client)
      return Promise.all([responsePromise, ledgerPromise, ledgerPromise2]).then(
        ([result, _ledger, _ledger2]) => {
          assert.equal(result.success.length, 2)
          assert.equal(result.error.length, 4)
          for (const response of result.success) {
            assert.equal(response.type, 'response')
            assert.equal(response.result.validated, true)
          }
          assert.equal(result.error[0].data.error, 'invalidTransaction')
          assert.equal(result.error[0].data.status, 'error')
          assert.equal(result.error[1].data.error, 'terPRE_SEQ')
          assert.equal(result.error[1].data.status, 'error')
          assert.equal(result.error[2].data.error, 'invalidTransaction')
          assert.equal(result.error[2].data.status, 'error')
          assert.equal(result.error[3].data.error, 'terPRE_SEQ')
          assert.equal(result.error[3].data.status, 'error')
        },
      )
    },
    TIMEOUT,
  )
})