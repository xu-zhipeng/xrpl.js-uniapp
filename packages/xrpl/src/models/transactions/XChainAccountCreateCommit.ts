import { ValidationError } from '../../errors'
import { Amount, XChainBridge } from '../common'

import {
  BaseTransaction,
  isAmount,
  isXChainBridge,
  validateBaseTransaction,
} from './common'

/**
 * The XChainAccountCreateCommit transaction creates a new account on one of the
 * chains a bridge connects, which serves as the bridge entrance for that chain.
 *
 * Warning: This transaction should only be executed if the witness attestations
 * will be reliably delivered to the destination chain. If the signatures aren't
 * delivered, then account creation will be blocked until attestations are received.
 * This can be used maliciously; to disable this transaction on XRP-XRP bridges,
 * the bridge's MinAccountCreateAmount shouldn't be present.
 *
 * @category Transaction Models
 */
export interface XChainAccountCreateCommit extends BaseTransaction {
  TransactionType: 'XChainAccountCreateCommit'

  /**
   * The bridge to create accounts for.
   */
  XChainBridge: XChainBridge

  /**
   * The amount, in XRP, to be used to reward the witness servers for providing
   * signatures. This must match the amount on the {@link Bridge} ledger object.
   */
  SignatureReward: Amount

  /**
   * The destination account on the destination chain.
   */
  Destination: string

  /**
   * The amount, in XRP, to use for account creation. This must be greater than or
   * equal to the MinAccountCreateAmount specified in the {@link Bridge} ledger object.
   */
  Amount: Amount
}

/**
 * Verify the form and type of a XChainAccountCreateCommit at runtime.
 *
 * @param tx - A XChainAccountCreateCommit Transaction.
 * @throws When the XChainAccountCreateCommit is malformed.
 */
// eslint-disable-next-line max-lines-per-function --  okay for this function, there's a lot of things to check
export function validateXChainAccountCreateCommit(
  tx: Record<string, unknown>,
): void {
  validateBaseTransaction(tx)

  if (tx.XChainBridge == null) {
    throw new ValidationError(
      'XChainAccountCreateCommit: missing field XChainBridge',
    )
  }

  if (!isXChainBridge(tx.XChainBridge)) {
    throw new ValidationError(
      'XChainAccountCreateCommit: invalid field XChainBridge',
    )
  }

  if (tx.SignatureReward == null) {
    throw new ValidationError(
      'XChainAccountCreateCommit: missing field SignatureReward',
    )
  }

  if (
    typeof tx.SignatureReward !== 'number' &&
    typeof tx.SignatureReward !== 'string'
  ) {
    throw new ValidationError(
      'XChainAccountCreateCommit: invalid field SignatureReward',
    )
  }

  if (tx.Destination == null) {
    throw new ValidationError(
      'XChainAccountCreateCommit: missing field Destination',
    )
  }

  if (typeof tx.Destination !== 'string') {
    throw new ValidationError(
      'XChainAccountCreateCommit: invalid field Destination',
    )
  }

  if (tx.Amount == null) {
    throw new ValidationError('XChainAccountCreateCommit: missing field Amount')
  }

  if (!isAmount(tx.Amount)) {
    throw new ValidationError('XChainAccountCreateCommit: invalid field Amount')
  }
}
