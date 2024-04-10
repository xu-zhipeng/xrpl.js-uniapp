# ripple-address-codec

## Unreleased

## 5.0.0 (2024-02-01)

### BREAKING CHANGES
* Bump typescript to 5.x
* Remove Node 14 support
* Remove `assert` dependency. If you were catching `AssertionError` you need to change to `Error`.
* Remove `create-hash` in favor of `@noble/hashes`
* `Buffer` has been replaced with `UInt8Array` for both params and return values. `Buffer` may continue to work with params since they extend `UInt8Arrays`.

### Non-Breaking Changes
* Eliminates 4 runtime dependencies: `base-x`, `base64-js`, `buffer`, and `ieee754`.
* Execute test in a browser in addition to node

## 5.0.0 Beta 1 (2023-11-30)

### Breaking Changes
* `Buffer` has been replaced with `UInt8Array` for both params and return values. `Buffer` may continue to work with params since they extend `UInt8Arrays`.

### Changes
* Eliminates 4 runtime dependencies: `base-x`, `base64-js`, `buffer`, and `ieee754`.

## 5.0.0 Beta 0 (2023-10-19)

### Breaking Changes
* Bump typescript to 5.x
* Remove Node 14 support
* Remove `assert` dependency. If you were catching `AssertionError` you need to change to `Error`.
* Remove `create-hash` in favor of `@noble/hashes`

### Changes
* Execute test in a browser in addition to node

## 4.3.1 (2023-09-27)
### Fixed
* Fix source-maps not finding their designated source

## 4.3.0 (2023-06-13)
### Added
* Adds support for npm v9

## 4.2.5 (2023-03-08)
### Changed
- All tests now use the Jest test runner and have been refactored for consistency across all packages

## 4.2.4 (2022-04-21)
### Fixed
- Fixed `encodeXAddress` to handle `null` equivalently to `false`.

## 4.2.1 (2021-12-1)
- Fix issue where npm < 7 could not install the library
- Initial pass at linting this codebase with new rules

## 4.2.0 (2021-11-15)
- Converts ripple-address-codec into a monorepo with ripple-binary-codec,
  ripple-keypairs, and xrpl. Changes to build tooling but no new features or
  bug fixes

## 4.1.3 (2021-05-10)

* Update dependencies
* Add `build` script as an alias for `compile`
* Update README

## 4.1.2 (2021-01-11)

* Internal dependencies
  * Update jest, ts-jest, typescript, lodash
    * Fix potential moderate severity vulnerabilities
  * Update @types/node, @types/jest, base-x
* Docs
  * Update example for encoding test address
  * Document functions (#73)
  * xAddressToClassicAddress when there is no tag (#114)
  * Add README badges (#120)
  * Add LICENSE (#138)
* Cleanup and polish
  * Add GitHub CI (#115)
  * Fix linting

## 4.1.1 (2020-04-03)

* Require node v10+
* CI: Drop node 6 & 8 and add node 13
* Update dependencies
  * Bump @types/node to 13.7.7 (#60)
  * Bump jest and ts-jest (#40)
  * Bump @types/jest to 25.1.2 (#51)
  * Bump ts-jest from 25.0.0 to 25.2.0 (#50)
  * Bump typescript from 3.7.5 to 3.8.3 (#61)
  * Update all dependencies in yarn.lock

## 4.1.0 (2020-01-22)

* Throwable 'unexpected_payload_length' error: The message has been expanded with ' Ensure that the bytes are a Buffer.'
* Docs (readme): Correct X-address to classic address example (#15) (thanks @RareData)

### New Features

* `encodeAccountPublic` - Encode a public key, as for payment channels
* `decodeAccountPublic` - Decode a public key, as for payment channels

* Internal
  * Update dependencies: ts-jest, @types/jest, @types/node, typescript, tslint,
    base-x

## 4.0.0 (2019-10-08)

### Breaking Changes

* `decodeAddress` has been renamed to `decodeAccountID`
* `isValidAddress` has been renamed to `isValidClassicAddress`

### New Features

* `classicAddressToXAddress` - Derive X-address from classic address, tag, and network ID
* `encodeXAddress` - Encode account ID, tag, and network ID as an X-address
* `xAddressToClassicAddress` - Decode an X-address to account ID, tag, and network ID
* `decodeXAddress` - Convert X-address to classic address, tag, and network ID
* `isValidXAddress` - Check whether an X-address (X...) is valid
