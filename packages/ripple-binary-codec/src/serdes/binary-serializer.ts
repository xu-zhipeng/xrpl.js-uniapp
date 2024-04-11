import { FieldInstance } from '../enums'
import { type SerializedType } from '../types/serialized-type'
import { bytesToHex, concat } from '@xrplf-uniapp/isomorphic/utils'

/**
 * Bytes list is a collection of Uint8Array objects
 */
class BytesList {
  private bytesArray: Array<Uint8Array> = []

  /**
   * Get the total number of bytes in the BytesList
   *
   * @return the number of bytes
   */
  public getLength(): number {
    return concat(this.bytesArray).byteLength
  }

  /**
   * Put bytes in the BytesList
   *
   * @param bytesArg A Uint8Array
   * @return this BytesList
   */
  public put(bytesArg: Uint8Array): BytesList {
    const bytes = Uint8Array.from(bytesArg) // Temporary, to catch instances of Uint8Array being passed in
    this.bytesArray.push(bytes)
    return this
  }

  /**
   * Write this BytesList to the back of another bytes list
   *
   *  @param list The BytesList to write to
   */
  public toBytesSink(list: BytesList): void {
    list.put(this.toBytes())
  }

  public toBytes(): Uint8Array {
    return concat(this.bytesArray)
  }

  toHex(): string {
    return bytesToHex(this.toBytes())
  }
}

/**
 * BinarySerializer is used to write fields and values to Uint8Arrays
 */
class BinarySerializer {
  private sink: BytesList = new BytesList()

  constructor(sink: BytesList) {
    this.sink = sink
  }

  /**
   * Write a value to this BinarySerializer
   *
   * @param value a SerializedType value
   */
  write(value: SerializedType): void {
    value.toBytesSink(this.sink)
  }

  /**
   * Write bytes to this BinarySerializer
   *
   * @param bytes the bytes to write
   */
  put(bytes: Uint8Array): void {
    this.sink.put(bytes)
  }

  /**
   * Write a value of a given type to this BinarySerializer
   *
   * @param type the type to write
   * @param value a value of that type
   */
  writeType(type: typeof SerializedType, value: SerializedType): void {
    this.write(type.from(value))
  }

  /**
   * Write BytesList to this BinarySerializer
   *
   * @param bl BytesList to write to BinarySerializer
   */
  writeBytesList(bl: BytesList): void {
    bl.toBytesSink(this.sink)
  }

  /**
   * Calculate the header of Variable Length encoded bytes
   *
   * @param length the length of the bytes
   */
  private encodeVariableLength(length: number): Uint8Array {
    const lenBytes = new Uint8Array(3)
    if (length <= 192) {
      lenBytes[0] = length
      return lenBytes.slice(0, 1)
    } else if (length <= 12480) {
      length -= 193
      lenBytes[0] = 193 + (length >>> 8)
      lenBytes[1] = length & 0xff
      return lenBytes.slice(0, 2)
    } else if (length <= 918744) {
      length -= 12481
      lenBytes[0] = 241 + (length >>> 16)
      lenBytes[1] = (length >> 8) & 0xff
      lenBytes[2] = length & 0xff
      return lenBytes.slice(0, 3)
    }
    throw new Error('Overflow error')
  }

  /**
   * Write field and value to BinarySerializer
   *
   * @param field field to write to BinarySerializer
   * @param value value to write to BinarySerializer
   */
  writeFieldAndValue(
    field: FieldInstance,
    value: SerializedType,
    isUnlModifyWorkaround = false,
  ): void {
    const associatedValue = field.associatedType.from(value)
    if (associatedValue.toBytesSink === undefined || field.name === undefined) {
      throw new Error()
    }

    this.sink.put(field.header)

    if (field.isVariableLengthEncoded) {
      this.writeLengthEncoded(associatedValue, isUnlModifyWorkaround)
    } else {
      associatedValue.toBytesSink(this.sink)
    }
  }

  /**
   * Write a variable length encoded value to the BinarySerializer
   *
   * @param value length encoded value to write to BytesList
   */
  public writeLengthEncoded(
    value: SerializedType,
    isUnlModifyWorkaround = false,
  ): void {
    const bytes = new BytesList()
    if (!isUnlModifyWorkaround) {
      // this part doesn't happen for the Account field in a UNLModify transaction
      value.toBytesSink(bytes)
    }
    this.put(this.encodeVariableLength(bytes.getLength()))
    this.writeBytesList(bytes)
  }
}

export { BytesList, BinarySerializer }
