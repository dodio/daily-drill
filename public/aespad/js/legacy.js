/*!
 * AES Pad · legacy.js
 * 兼容层：解密 aescrypto.com 生成的旧密文。
 *
 * 旧实现 = CryptoJS <<OpenSSL KDF>>：
 *   EvpKDF(MD5, iterations = 1) -> 48 字节（前 32 字节做 key，后 16 字节做 IV）
 *   AES-256-CBC + PKCS7，随机 8 字节盐
 *   输出： "AESCryptoV10" + hex(salt) + hex(ciphertext)     避免 Salted__ 的 base64
 *
 * 这里用纯 JS 实现 MD5 与 EvpKDF（WebCrypto 不提供 MD5），CBC 交给 WebCrypto。
 */
(function (root) {
  'use strict';

  var N = (root.AESPAD = root.AESPAD || {});

  var PREFIX = 'AESCryptoV10';
  var SALT_BYTES_LEGACY = 8;

  /* ---------- MD5 ---------- */

  var MD5_S = [
    7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
    5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
    4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
    6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21
  ];

  var MD5_K = (function () {
    var k = new Int32Array(64);
    for (var i = 0; i < 64; i++) {
      k[i] = (Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296)) | 0;
    }
    return k;
  })();

  function md5(bytes) {
    var len = bytes.length;
    var bitLen = len * 8;
    var padded = new Uint8Array((((len + 8) >> 6) + 1) << 6);
    padded.set(bytes);
    padded[len] = 0x80;

    var view = new DataView(padded.buffer);
    view.setUint32(padded.length - 8, bitLen >>> 0, true);
    view.setUint32(padded.length - 4, Math.floor(bitLen / 4294967296) >>> 0, true);

    var a0 = 0x67452301 | 0;
    var b0 = 0xefcdab89 | 0;
    var c0 = 0x98badcfe | 0;
    var d0 = 0x10325476 | 0;
    var m = new Int32Array(16);

    for (var offset = 0; offset < padded.length; offset += 64) {
      for (var j = 0; j < 16; j++) m[j] = view.getInt32(offset + j * 4, true);

      var A = a0;
      var B = b0;
      var C = c0;
      var D = d0;

      for (var i = 0; i < 64; i++) {
        var F, g;
        if (i < 16) {
          F = (B & C) | (~B & D);
          g = i;
        } else if (i < 32) {
          F = (D & B) | (~D & C);
          g = (5 * i + 1) % 16;
        } else if (i < 48) {
          F = B ^ C ^ D;
          g = (3 * i + 5) % 16;
        } else {
          F = C ^ (B | ~D);
          g = (7 * i) % 16;
        }
        F = (F + A + MD5_K[i] + m[g]) | 0;
        A = D;
        D = C;
        C = B;
        var s = MD5_S[i];
        B = (B + ((F << s) | (F >>> (32 - s)))) | 0;
      }

      a0 = (a0 + A) | 0;
      b0 = (b0 + B) | 0;
      c0 = (c0 + C) | 0;
      d0 = (d0 + D) | 0;
    }

    var digest = new Uint8Array(16);
    var out = new DataView(digest.buffer);
    out.setInt32(0, a0, true);
    out.setInt32(4, b0, true);
    out.setInt32(8, c0, true);
    out.setInt32(12, d0, true);
    return digest;
  }

  /* ---------- EvpKDF（CryptoJS 兼容） ---------- */

  function evpKDF(passwordBytes, saltBytes, keyLen, ivLen) {
    var need = keyLen + ivLen;
    var block = new Uint8Array(0);
    var chunks = [];
    var total = 0;

    while (total < need) {
      var buffer = new Uint8Array(block.length + passwordBytes.length + saltBytes.length);
      buffer.set(block, 0);
      buffer.set(passwordBytes, block.length);
      buffer.set(saltBytes, block.length + passwordBytes.length);
      block = md5(buffer);
      chunks.push(block);
      total += block.length;
    }

    var joined = new Uint8Array(total);
    var at = 0;
    for (var i = 0; i < chunks.length; i++) {
      joined.set(chunks[i], at);
      at += chunks[i].length;
    }

    return {
      key: joined.slice(0, keyLen),
      iv: joined.slice(keyLen, need)
    };
  }

  /* ---------- hex ---------- */

  function hexToBytes(hex) {
    var clean = String(hex).replace(/[^0-9a-fA-F]/g, '');
    var out = new Uint8Array(clean.length >> 1);
    for (var i = 0; i < out.length; i++) {
      out[i] = parseInt(clean.substr(i * 2, 2), 16);
    }
    return out;
  }

  function bytesToHex(bytes) {
    var out = '';
    for (var i = 0; i < bytes.length; i++) {
      out += (bytes[i] < 16 ? '0' : '') + bytes[i].toString(16);
    }
    return out;
  }

  /* ---------- PKCS7（仅做兜底：WebCrypto 的 AES-CBC 已自带填充处理） ---------- */

  function pkcs7Unpad(bytes, blockSize) {
    if (bytes.length === 0 || bytes.length % blockSize !== 0) throw new Error('BAD_PADDING');
    var padLen = bytes[bytes.length - 1];
    if (padLen < 1 || padLen > blockSize) throw new Error('BAD_PADDING');
    for (var i = bytes.length - padLen; i < bytes.length; i++) {
      if (bytes[i] !== padLen) throw new Error('BAD_PADDING');
    }
    return bytes.subarray(0, bytes.length - padLen);
  }

  function decodePlain(bytes) {
    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch (e) {
      // 少数实现不会剥离 PKCS7，这里补一刀
      try {
        return new TextDecoder('utf-8', { fatal: true }).decode(pkcs7Unpad(bytes, 16));
      } catch (e2) {
        throw authFailed();
      }
    }
  }

  /* ---------- AES-CBC ---------- */

  function aesCbcDecrypt(keyBytes, ivBytes, cipherBytes) {
    var subtle = root.crypto.subtle;
    return subtle
      .importKey('raw', keyBytes, { name: 'AES-CBC' }, false, ['decrypt'])
      .then(function (key) {
        return subtle.decrypt({ name: 'AES-CBC', iv: ivBytes }, key, cipherBytes);
      })
      .then(function (buffer) {
        return new Uint8Array(buffer);
      });
  }

  function aesCbcEncrypt(keyBytes, ivBytes, plainBytes) {
    var subtle = root.crypto.subtle;
    return subtle
      .importKey('raw', keyBytes, { name: 'AES-CBC' }, false, ['encrypt'])
      .then(function (key) {
        return subtle.encrypt({ name: 'AES-CBC', iv: ivBytes }, key, plainBytes);
      })
      .then(function (buffer) {
        return new Uint8Array(buffer);
      });
  }

  /* ---------- 解析 ---------- */

  function looksLegacy(token) {
    var s = String(token).trim();
    if (s.indexOf(PREFIX) === 0) return true;
    if (s.indexOf('U2FsdGVkX1') === 0) return true;
    return /^[0-9a-fA-F]{48,}$/.test(s); // 前缀被截掉的裸 hex
  }

  function parseLegacy(token) {
    var s = String(token).replace(/\s+/g, '');

    if (s.indexOf(PREFIX) === 0) {
      var body = s.slice(PREFIX.length);
      if (body.length < 16 + 32) throw badFormat();
      return {
        salt: hexToBytes(body.slice(0, 16)),
        ciphertext: hexToBytes(body.slice(16))
      };
    }

    // 前缀被粘贴过程截掉了：首 16 位 hex 仍然可以当盐用
    if (/^[0-9a-fA-F]{48,}$/.test(s)) {
      return {
        salt: hexToBytes(s.slice(0, 16)),
        ciphertext: hexToBytes(s.slice(16))
      };
    }

    // OpenSSL / CryptoJS 默认格式：base64("Salted__" + salt + ciphertext)
    var raw = base64ToBytes(s);
    if (raw.length < 32) throw badFormat();
    var magic = '';
    for (var i = 0; i < 8; i++) magic += String.fromCharCode(raw[i]);
    if (magic !== 'Salted__') throw badFormat();
    return {
      salt: raw.slice(8, 16),
      ciphertext: raw.slice(16)
    };
  }

  function badFormat() {
    var err = new Error('无法识别的密文格式');
    err.code = 'BAD_FORMAT';
    return err;
  }

  function base64ToBytes(str) {
    var clean = String(str).replace(/[^A-Za-z0-9+/=]/g, '');
    if (typeof atob === 'function') {
      var bin = atob(clean);
      var out = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
      return out;
    }
    return new Uint8Array(Buffer.from(clean, 'base64'));
  }

  /* ---------- 对外 ---------- */

  function decryptLegacy(token, password) {
    return Promise.resolve().then(function () {
      var parsed = parseLegacy(token);
      var passwordBytes = new TextEncoder().encode(password);
      var derived = evpKDF(passwordBytes, parsed.salt, 32, 16);

      return aesCbcDecrypt(derived.key, derived.iv, parsed.ciphertext).then(
        function (plain) {
          return decodePlain(plain);
        },
        function () {
          throw authFailed();
        }
      );
    });
  }

  /**
   * 生成与 aescrypto.com 完全互通的密文（供老设备/老版本打开）。
   * 安全性明显弱于 AESv2，仅供兼容使用。
   */
  function encryptLegacy(plaintext, password) {
    return Promise.resolve().then(function () {
      var salt = new Uint8Array(SALT_BYTES_LEGACY);
      root.crypto.getRandomValues(salt);
      var passwordBytes = new TextEncoder().encode(password);
      var derived = evpKDF(passwordBytes, salt, 32, 16);
      var plain = new TextEncoder().encode(plaintext);

      return aesCbcEncrypt(derived.key, derived.iv, plain).then(function (ct) {
        return PREFIX + bytesToHex(salt) + bytesToHex(ct);
      });
    });
  }

  function authFailed() {
    var err = new Error('解密失败');
    err.code = 'AUTH_FAILED';
    return err;
  }

  N.legacy = {
    PREFIX: PREFIX,
    looksLegacy: looksLegacy,
    decryptLegacy: decryptLegacy,
    encryptLegacy: encryptLegacy,
    md5: md5,
    evpKDF: evpKDF,
    hexToBytes: hexToBytes,
    bytesToHex: bytesToHex
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
