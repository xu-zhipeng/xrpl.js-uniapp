# @xrplf-uniapp/isomorphic

Note: The error caused by referencing node: Util's TextEncoder in the official library has been removed, and the fast text encoding library has been used instead. Everything else remains the same without any changes.

A collection of isomorphic implementations of crypto and utility functions.

Browser implementations of cryptographic functions use `@noble/hashes` and `crypto` for node .

### Hashes

All hash functions operate similarly to `@noble/hashes` and have the following properties:

- They can be called directly by providing a Uint8Array or string which will be converted into a UInt8Array via UTF-8 encoding (not hex).
- They all return a UInt8Array.

```
function hash(message: Uint8Array | string): Uint8Array;
hash(new Uint8Array([1, 3]));
hash('string') == hash(new TextEncoder().encode('string'));
```

All hash functions can be constructed via `hash.create()` method:

- The result is `Hash` subclass instance, which has `update()` and `digest()` methods.
- `digest()` finalizes the hash and makes it no longer usable

```typescript
hash
  .create()
  .update(new Uint8Array([1, 3]))
  .digest();
```

### `@xrplf-uniapp/isomorphic/ripemd160`
```typescript
import { ripemd160 } from '@xrplf-uniapp/isomorphic/ripemd160';
const hashA = ripemd160('abc');
const hashB = ripemd160
  .create()
  .update(Uint8Array.from([1, 2, 3]))
  .digest();
```

### `@xrplf-uniapp/isomorphic/sha256`

```typescript
import { sha256 } from '@xrplf-uniapp/isomorphic/sha256';
const hashA = sha256('abc');
const hashB = sha256
  .create()
  .update(Uint8Array.from([1, 2, 3]))
  .digest();
```

### `@xrplf-uniapp/isomorphic/sha512`

```typescript
import { sha512 } from '@xrplf-uniapp/isomorphic/sha512';
const hashA = sha512('abc');
const hashB = sha512
  .create()
  .update(Uint8Array.from([1, 2, 3]))
  .digest();
```

## Utilities

### `@xrplf-uniapp/isomorphic/utils`

#### randomBytes

Create an UInt8Array of the supplied size

```typescript
import { randomBytes } from @xrplf-uniapp/isomorphic/utils

console.log(randomBytes(12)) // Uint8Array(12) [95, 236, 188,  55, 208, 128, 161, 249, 171, 57, 141, 7]
```

#### bytesToHex

Convert an UInt8Array to hex.

```typescript
import { bytesToHex } from @xrplf-uniapp/isomorphic/utils

console.log(bytesToHex([222, 173, 190, 239])) // "DEADBEEF"
```

#### hexToBytes

Convert hex to an UInt8Array.

```typescript
import { hexToBytes } from @xrplf-uniapp/isomorphic/utils

console.log(hexToBytes('DEADBEEF')) // [222, 173, 190, 239]
```

#### hexToString

Converts hex to its string equivalent. Useful to read the Domain field and some Memos.

```typescript
import { hexToString } from @xrplf-uniapp/isomorphic/utils

console.log(hexToString('6465616462656566D68D')) // "deadbeef֍"
```

#### stringToHex

Converts a utf-8 to its hex equivalent. Useful for Memos.

```typescript
import { stringToHex } from @xrplf-uniapp/isomorphic/utils

console.log(stringToHex('deadbeef֍')) // "6465616462656566D68D"
```

### `@xrplf-uniapp/isomorphic/ws`

```typescript
import WebSocket from '@xrplf-uniapp/isomorphic/ws'

const socket = new WebSocket('wss://localhost:8080')
```
