import CryptoJS from 'crypto-js';
import { PDFArray, PDFContext, PDFDict, PDFHexString, PDFName, PDFNumber, PDFObject, PDFRawStream, PDFRef, PDFStream, PDFString } from 'pdf-lib/cjs/core';

export interface EncryptionPermissions {
  printing?: 'lowResolution' | 'highResolution';
  modifying?: boolean;
  copying?: boolean;
  annotating?: boolean;
  fillingForms?: boolean;
  contentAccessibility?: boolean;
  documentAssembly?: boolean;
}

export interface EncryptionOptions {
  userPassword: string;
  ownerPassword?: string;
  permissions?: EncryptionPermissions;
}

type WordArray = any;

type EncryptFn = (input: Uint8Array) => Uint8Array;

const PASSWORD_PADDING = new Uint8Array([
  0x28, 0xbf, 0x4e, 0x5e, 0x4e, 0x75, 0x8a, 0x41, 0x64, 0x00, 0x4e, 0x56, 0xff,
  0xfa, 0x01, 0x08, 0x2e, 0x2e, 0x00, 0xb6, 0xd0, 0x68, 0x3e, 0x80, 0x2f, 0x0c,
  0xa9, 0xfe, 0x64, 0x53, 0x69, 0x7a,
]);

const KEY_BYTES = 5; // 40-bit encryption

function wordArrayToUint8(wordArray: WordArray): Uint8Array {
  const byteArray: number[] = [];
  for (let i = 0; i < wordArray.sigBytes; i += 1) {
    const word = wordArray.words[Math.floor(i / 4)];
    byteArray.push((word >> (24 - (i % 4) * 8)) & 0xff);
  }
  return Uint8Array.from(byteArray);
}

function uint8ArrayToWordArray(bytes: Uint8Array): WordArray {
  return CryptoJS.lib.WordArray.create(bytes, bytes.length);
}

function md5Bytes(data: Uint8Array): Uint8Array {
  const hash = CryptoJS.MD5(uint8ArrayToWordArray(data));
  return wordArrayToUint8(hash);
}

function padPassword(password: string): Uint8Array {
  const output = new Uint8Array(32);
  const length = Math.min(password.length, 32);
  for (let i = 0; i < length; i += 1) {
    const code = password.charCodeAt(i);
    if (code > 0xff) {
      throw new Error('Password contains one or more invalid characters.');
    }
    output[i] = code;
  }
  output.set(PASSWORD_PADDING.subarray(0, 32 - length), length);
  return output;
}

function rc4(key: Uint8Array, data: Uint8Array): Uint8Array {
  const s = new Uint8Array(256);
  for (let i = 0; i < 256; i += 1) {
    s[i] = i;
  }
  let j = 0;
  for (let i = 0; i < 256; i += 1) {
    const si = s[i]!;
    const keyByte = key[i % key.length]!;
    j = (j + si + keyByte) & 0xff;
    const sj = s[j]!;
    s[i] = sj;
    s[j] = si;
  }
  const result = new Uint8Array(data.length);
  let i = 0;
  j = 0;
  for (let idx = 0; idx < data.length; idx += 1) {
    i = (i + 1) & 0xff;
    const si = s[i]!;
    j = (j + si) & 0xff;
    const sj = s[j]!;
    s[i] = sj;
    s[j] = si;
    const k = s[(s[i]! + s[j]!) & 0xff]!;
    result[idx] = data[idx]! ^ k;
  }
  return result;
}

function getPermissionsValue(permissionObject: EncryptionPermissions = {}): number {
  let permissions = 0xfffff0c0 >> 0;
  if (permissionObject.printing === 'lowResolution') {
    permissions |= 0b000000000100;
  }
  if (permissionObject.printing === 'highResolution') {
    permissions |= 0b100000000100;
  }
  if (permissionObject.modifying) {
    permissions |= 0b000000001000;
  }
  if (permissionObject.copying) {
    permissions |= 0b000000010000;
  }
  if (permissionObject.annotating) {
    permissions |= 0b000000100000;
  }
  if (permissionObject.fillingForms) {
    permissions |= 0b000100000000;
  }
  if (permissionObject.contentAccessibility) {
    permissions |= 0b001000000000;
  }
  if (permissionObject.documentAssembly) {
    permissions |= 0b010000000000;
  }
  return permissions;
}

function ensureDocumentId(context: PDFContext): Uint8Array {
  const idWordArray = CryptoJS.lib.WordArray.random(16);
  const idBytes = wordArrayToUint8(idWordArray);
  const hex = Buffer.from(idBytes).toString('hex');
  const idArray = PDFArray.withContext(context);
  idArray.push(PDFHexString.of(hex));
  idArray.push(PDFHexString.of(hex));
  context.trailerInfo.ID = idArray;
  return idBytes;
}

function createOwnerEntry(paddedOwner: Uint8Array, paddedUser: Uint8Array): Uint8Array {
  const digest = md5Bytes(paddedOwner);
  const key = digest.subarray(0, KEY_BYTES);
  return rc4(key, paddedUser);
}

function createEncryptionKey(
  paddedUser: Uint8Array,
  ownerEntry: Uint8Array,
  permissions: number,
  documentId: Uint8Array,
): Uint8Array {
  const buffer = new Uint8Array(
    paddedUser.length + ownerEntry.length + 4 + documentId.length,
  );
  let offset = 0;
  buffer.set(paddedUser, offset);
  offset += paddedUser.length;
  buffer.set(ownerEntry, offset);
  offset += ownerEntry.length;
  const perms = new DataView(buffer.buffer, buffer.byteOffset + offset, 4);
  perms.setInt32(0, permissions, true);
  offset += 4;
  buffer.set(documentId, offset);
  const digest = md5Bytes(buffer);
  return digest.subarray(0, KEY_BYTES);
}

function createUserEntry(encryptionKey: Uint8Array): Uint8Array {
  return rc4(encryptionKey, PASSWORD_PADDING);
}

function objectEncryptionKey(encryptionKey: Uint8Array, ref: PDFRef): Uint8Array {
  const keyBuffer = new Uint8Array(encryptionKey.length + 5);
  keyBuffer.set(encryptionKey, 0);
  keyBuffer[encryptionKey.length + 0] = ref.objectNumber & 0xff;
  keyBuffer[encryptionKey.length + 1] = (ref.objectNumber >> 8) & 0xff;
  keyBuffer[encryptionKey.length + 2] = (ref.objectNumber >> 16) & 0xff;
  keyBuffer[encryptionKey.length + 3] = ref.generationNumber & 0xff;
  keyBuffer[encryptionKey.length + 4] = (ref.generationNumber >> 8) & 0xff;
  const digest = md5Bytes(keyBuffer);
  return digest.subarray(0, KEY_BYTES);
}

function encryptString(value: PDFString | PDFHexString, encryptFn: EncryptFn): PDFHexString {
  const bytes = value.asBytes();
  const encrypted = encryptFn(bytes);
  return PDFHexString.of(Buffer.from(encrypted).toString('hex'));
}

function encryptStream(stream: PDFStream, encryptFn: EncryptFn, context: PDFContext): PDFStream {
  const encrypted = encryptFn(stream.getContents());
  const dict = stream.dict.clone(context);
  return PDFRawStream.of(dict, encrypted);
}

function traverseAndEncrypt(
  object: PDFObject,
  ref: PDFRef,
  encryptFn: EncryptFn,
  context: PDFContext,
  visited: Set<PDFObject>,
): PDFObject {
  if (visited.has(object)) return object;
  visited.add(object);

  if (object instanceof PDFString || object instanceof PDFHexString) {
    return encryptString(object, encryptFn);
  }

  if (object instanceof PDFStream) {
    return encryptStream(object, encryptFn, context);
  }

  if (object instanceof PDFDict) {
    const entries = object.entries();
    for (const [key, value] of entries) {
      if (value instanceof PDFRef) continue;
      const updated = traverseAndEncrypt(value, ref, encryptFn, context, visited);
      if (updated !== value) {
        object.set(key, updated);
      }
    }
    return object;
  }

  if (object instanceof PDFArray) {
    for (let idx = 0; idx < object.size(); idx += 1) {
      const value = object.get(idx);
      if (value instanceof PDFRef) continue;
      const updated = traverseAndEncrypt(value, ref, encryptFn, context, visited);
      if (updated !== value) {
        object.set(idx, updated);
      }
    }
    return object;
  }

  return object;
}

export function applyStandardEncryption(
  context: PDFContext,
  options: EncryptionOptions,
): void {
  const permissionsValue = getPermissionsValue(options.permissions);
  const documentId = ensureDocumentId(context);

  const paddedUserPassword = padPassword(options.userPassword);
  const paddedOwnerPassword = padPassword(options.ownerPassword ?? options.userPassword);

  const ownerEntry = createOwnerEntry(paddedOwnerPassword, paddedUserPassword);
  const encryptionKey = createEncryptionKey(
    paddedUserPassword,
    ownerEntry,
    permissionsValue,
    documentId,
  );
  const userEntry = createUserEntry(encryptionKey);

  const encryptionDict = context.obj({
    Filter: PDFName.of('Standard'),
    V: PDFNumber.of(1),
    R: PDFNumber.of(2),
    Length: PDFNumber.of(40),
    O: PDFHexString.of(Buffer.from(ownerEntry).toString('hex')),
    U: PDFHexString.of(Buffer.from(userEntry).toString('hex')),
    P: PDFNumber.of(permissionsValue),
  });

  const encryptionRef = context.register(encryptionDict);
  context.trailerInfo.Encrypt = encryptionRef;

  const visited = new Set<PDFObject>();

  for (const [ref, object] of context.enumerateIndirectObjects()) {
    if (ref === encryptionRef) continue;
    const key = objectEncryptionKey(encryptionKey, ref);
    const encryptFn: EncryptFn = (input) => rc4(key, input);
    const updated = traverseAndEncrypt(object, ref, encryptFn, context, visited);
    if (updated !== object) {
      context.assign(ref, updated);
    }
  }
}
