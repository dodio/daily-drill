/*!
 * AES Pad · core.js
 * 原生 WebCrypto 实现：PBKDF2-HMAC-SHA-256 -> AES-256-GCM
 * 无依赖、无网络、可在浏览器与 Node(>=18) 中运行。
 *
 * 密文格式（v2）：
 *   AESv2.<base64url( salt[16] || iv[12] || ciphertext || tag[16] )>
 *   例：AESv2.Kt3s...（单行、可安全放进短信/IM）
 */
(function (root) {
  'use strict';

  var N = (root.AESPAD = root.AESPAD || {});

  var PARAMS = {
    format: 'AESv2',
    kdf: 'PBKDF2-HMAC-SHA-256',
    iterations: 600000,
    cipher: 'AES-256-GCM',
    keyBits: 256,
    saltBytes: 16,
    ivBytes: 12,
    tagBits: 128
  };

  var CODE = {
    EMPTY_INPUT: 'EMPTY_INPUT',
    EMPTY_PASSWORD: 'EMPTY_PASSWORD',
    BAD_FORMAT: 'BAD_FORMAT',
    AUTH_FAILED: 'AUTH_FAILED',
    UNSUPPORTED: 'UNSUPPORTED'
  };

  var textEncoder = new TextEncoder();
  var textDecoder = new TextDecoder('utf-8');

  function fail(code, message) {
    var err = new Error(message || code);
    err.code = code;
    return err;
  }

  function getSubtle() {
    if (!root.crypto || !root.crypto.subtle || !root.crypto.getRandomValues) {
      throw fail(CODE.UNSUPPORTED, '当前环境不支持 WebCrypto（需要 HTTPS 或 localhost）');
    }
    return root.crypto.subtle;
  }

  function randomBytes(length) {
    var buf = new Uint8Array(length);
    root.crypto.getRandomValues(buf);
    return buf;
  }

  /* ---------- base64url ---------- */

  var B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

  /**
   * 密文清洗：从 IM / 聊天记录里复制出来的密文经常被折行、加空格、
   * 被引号包住，或夹带零宽字符。这里一次性抹掉，避免"格式认不出来"。
   */
  var QUOTE_CHARS = '"\'`\u201c\u201d\u2018\u2019\u300c\u300d\u300e\u300f';
  var BLANK_RE = /[\s\u00a0\u1680\u2000-\u200d\u2028\u2029\u202f\u205f\u3000\ufeff]+/g;

  function stripEdges(str) {
    var s = String(str).trim();
    var changed = true;
    while (changed && s.length > 0) {
      changed = false;
      if (QUOTE_CHARS.indexOf(s.charAt(0)) !== -1) {
        s = s.slice(1);
        changed = true;
      }
      if (s.length > 0 && QUOTE_CHARS.indexOf(s.charAt(s.length - 1)) !== -1) {
        s = s.slice(0, -1);
        changed = true;
      }
    }
    return s;
  }

  function normalizeToken(token) {
    return stripEdges(token).replace(BLANK_RE, '');
  }

  function b64uEncode(bytes) {
    var out = '';
    var i = 0;
    var len = bytes.length;
    for (; i + 2 < len; i += 3) {
      var n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
      out += B64_CHARS[(n >>> 18) & 63] + B64_CHARS[(n >>> 12) & 63] + B64_CHARS[(n >>> 6) & 63] + B64_CHARS[n & 63];
    }
    var rest = len - i;
    if (rest === 1) {
      var a = bytes[i] << 16;
      out += B64_CHARS[(a >>> 18) & 63] + B64_CHARS[(a >>> 12) & 63];
    } else if (rest === 2) {
      var b = (bytes[i] << 16) | (bytes[i + 1] << 8);
      out += B64_CHARS[(b >>> 18) & 63] + B64_CHARS[(b >>> 12) & 63] + B64_CHARS[(b >>> 6) & 63];
    }
    return out;
  }

  function b64uDecode(str) {
    // 同时接受 base64url（-_）与标准 base64（+/），防止密文被中间工具转过码
    var clean = String(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/[^A-Za-z0-9\-_]/g, '');
    var out = new Uint8Array(Math.floor((clean.length * 3) / 4));
    var acc = 0;
    var bits = 0;
    var pos = 0;
    for (var i = 0; i < clean.length; i++) {
      var v = B64_CHARS.indexOf(clean[i]);
      if (v < 0) continue;
      acc = (acc << 6) | v;
      bits += 6;
      if (bits >= 8) {
        bits -= 8;
        out[pos++] = (acc >>> bits) & 0xff;
      }
    }
    return out.subarray(0, pos);
  }

  /* ---------- 密钥派生 ---------- */

  function deriveKey(password, salt, iterations) {
    var subtle = getSubtle();
    return subtle
      .importKey('raw', textEncoder.encode(password), 'PBKDF2', false, ['deriveKey'])
      .then(function (baseKey) {
        return subtle.deriveKey(
          { name: 'PBKDF2', salt: salt, iterations: iterations, hash: 'SHA-256' },
          baseKey,
          { name: 'AES-GCM', length: PARAMS.keyBits },
          false,
          ['encrypt', 'decrypt']
        );
      });
  }

  /* ---------- v2 加密 / 解密 ---------- */

  function assembleToken(salt, iv, ct) {
    var payload = new Uint8Array(salt.length + iv.length + ct.length);
    payload.set(salt, 0);
    payload.set(iv, salt.length);
    payload.set(ct, salt.length + iv.length);
    return PARAMS.format + '.' + b64uEncode(payload);
  }

  /** 用已派生好的密钥加密（批量共用密钥时用这个） */
  function encryptWithKey(key, plaintext, salt) {
    var iv = randomBytes(PARAMS.ivBytes);
    return getSubtle()
      .encrypt({ name: 'AES-GCM', iv: iv, tagLength: PARAMS.tagBits }, key, textEncoder.encode(plaintext))
      .then(function (buffer) {
        return assembleToken(salt, iv, new Uint8Array(buffer));
      });
  }

  function parseV2(token) {
    var body = token.slice(PARAMS.format.length + 1);
    var raw = b64uDecode(body);
    var minLength = PARAMS.saltBytes + PARAMS.ivBytes + PARAMS.tagBits / 8;
    if (raw.length < minLength) throw fail(CODE.BAD_FORMAT, '密文长度不足，可能不完整');
    return {
      salt: raw.subarray(0, PARAMS.saltBytes),
      iv: raw.subarray(PARAMS.saltBytes, PARAMS.saltBytes + PARAMS.ivBytes),
      ct: raw.subarray(PARAMS.saltBytes + PARAMS.ivBytes)
    };
  }

  function decryptParsedV2(parsed, key) {
    return getSubtle()
      .decrypt({ name: 'AES-GCM', iv: parsed.iv, tagLength: PARAMS.tagBits }, key, parsed.ct)
      .then(
        function (buffer) {
          return textDecoder.decode(buffer);
        },
        function () {
          // GCM 认证失败：口令错误，或密文被改动过
          throw fail(CODE.AUTH_FAILED, '解密失败');
        }
      );
  }

  function encrypt(plaintext, password) {
    return Promise.resolve().then(function () {
      if (typeof plaintext !== 'string' || plaintext.length === 0) {
        throw fail(CODE.EMPTY_INPUT, '没有可加密的内容');
      }
      if (!password) throw fail(CODE.EMPTY_PASSWORD, '口令不能为空');

      var salt = randomBytes(PARAMS.saltBytes);
      return deriveKey(password, salt, PARAMS.iterations).then(function (key) {
        return encryptWithKey(key, plaintext, salt);
      });
    });
  }

  function decryptV2(token, password) {
    return Promise.resolve().then(function () {
      var parsed = parseV2(token);
      return deriveKey(password, parsed.salt, PARAMS.iterations).then(function (key) {
        return decryptParsedV2(parsed, key);
      });
    });
  }

  /* ---------- 批量 ---------- */

  function hexOf(bytes) {
    var out = '';
    for (var i = 0; i < bytes.length; i++) {
      out += (bytes[i] < 16 ? '0' : '') + bytes[i].toString(16);
    }
    return out;
  }

  /**
   * 批量加密：整批共用一个随机盐，PBKDF2 只跑一次。
   * 同一密钥下每条使用独立随机 IV（12 字节，碰撞概率可忽略）。
   * 每条输出的密文仍是标准 AESv2，单条解密完全兼容。
   */
  function encryptMany(texts, password, options) {
    var opts = options || {};
    return Promise.resolve().then(function () {
      if (!password) throw fail(CODE.EMPTY_PASSWORD, '口令不能为空');
      if (!texts || texts.length === 0) throw fail(CODE.EMPTY_INPUT, '没有可加密的内容');

      var salt = randomBytes(PARAMS.saltBytes);
      var items = new Array(texts.length);

      return deriveKey(password, salt, PARAMS.iterations).then(function (key) {
        var chain = Promise.resolve();

        texts.forEach(function (text, i) {
          chain = chain.then(function () {
            if (typeof text !== 'string' || text.length === 0) {
              items[i] = { ok: true, value: '', empty: true };
              return;
            }
            return encryptWithKey(key, text, salt).then(
              function (value) {
                items[i] = { ok: true, value: value };
              },
              function (err) {
                items[i] = { ok: false, error: (err && err.message) || '加密失败' };
              }
            );
          });
          chain = chain.then(function () {
            if (opts.onProgress) opts.onProgress(i + 1, texts.length);
          });
        });

        return chain.then(function () {
          return { items: items, salt: salt };
        });
      });
    });
  }

  /**
   * 批量解密：按盐缓存派生结果，同一批密文只派生一次。
   * 保留「口令首尾空格」容错：先用原口令，失败的条目再用 trim 后的口令重试。
   */
  function decryptMany(tokens, password, options) {
    var opts = options || {};
    return Promise.resolve().then(function () {
      if (!password) throw fail(CODE.EMPTY_PASSWORD, '口令不能为空');
      if (!tokens || tokens.length === 0) throw fail(CODE.EMPTY_INPUT, '没有可解密的内容');

      var results = new Array(tokens.length);
      var keyCache = {};
      var trimmedPassword = String(password).trim();
      var hasFallback = trimmedPassword && trimmedPassword !== password;

      function keyFor(salt, useFallback) {
        var cacheKey = (useFallback ? 'f:' : 'p:') + hexOf(salt);
        if (!keyCache[cacheKey]) {
          keyCache[cacheKey] = deriveKey(useFallback ? trimmedPassword : password, salt, PARAMS.iterations);
        }
        return keyCache[cacheKey];
      }

      function decryptOne(i) {
        var raw = tokens[i];
        if (typeof raw !== 'string' || raw.trim().length === 0) {
          results[i] = { ok: true, text: '', empty: true };
          return Promise.resolve();
        }

        var token = normalizeToken(raw);
        var format = detectFormat(token);
        var adjusted = false;

        function attempt(useFallback) {
          if (format === 'AESv2') {
            var parsed;
            try {
              parsed = parseV2(token);
            } catch (e) {
              return Promise.reject(e);
            }
            return keyFor(parsed.salt, useFallback).then(function (key) {
              return decryptParsedV2(parsed, key);
            });
          }
          if (format === 'AESCryptoV10' || format === 'OpenSSL' || format === 'legacy-hex') {
            return N.legacy.decryptLegacy(token, useFallback ? trimmedPassword : password);
          }
          return Promise.reject(fail(CODE.BAD_FORMAT, '无法识别的密文格式'));
        }

        return attempt(false).then(
          function (text) {
            return { text: text, format: format, adjusted: false };
          },
          function (err) {
            if (err && err.code === CODE.AUTH_FAILED && hasFallback) {
              adjusted = true;
              return attempt(true).then(function (text) {
                return { text: text, format: format, adjusted: adjusted };
              });
            }
            throw err;
          }
        ).then(
          function (payload) {
            results[i] = { ok: true, text: payload.text, format: payload.format, adjusted: payload.adjusted };
          },
          function (err) {
            results[i] = {
              ok: false,
              code: err && err.code,
              error: (err && err.message) || '解密失败'
            };
          }
        );
      }

      var chain = Promise.resolve();
      var attempted = 0;
      var failedCount = 0;
      var aborted = false;
      var abortAfter = opts.abortAfter || 0;

      tokens.forEach(function (_, i) {
        chain = chain
          .then(function () {
            if (aborted) {
              results[i] = { ok: false, skipped: true, error: '已中止' };
              return;
            }
            return decryptOne(i).then(function () {
              var item = results[i];
              if (item && !item.empty) {
                attempted++;
                if (item.ok) failedCount = 0;
                else failedCount++;
                // 连续整批失败基本可判定口令不对，及时止损
                if (abortAfter && attempted >= abortAfter && failedCount >= attempted) aborted = true;
              }
            });
          })
          .then(function () {
            if (opts.onProgress) opts.onProgress(i + 1, tokens.length);
          });
      });

      return chain.then(function () {
        return { items: results };
      });
    });
  }

  /* ---------- 探测 ---------- */

  var LEGACY_PREFIX = 'AESCryptoV10';
  var OPENSSL_PREFIX = 'U2FsdGVkX1'; // base64("Salted__")

  function isV2(token) {
    return /^AESv2\.[A-Za-z0-9\-_]+$/.test(normalizeToken(token));
  }

  function isLegacyToken(token) {
    var s = normalizeToken(token);
    return /^AESCryptoV10[0-9a-fA-F]{48,}$/.test(s) || /^U2FsdGVkX1[A-Za-z0-9+/=]{20,}$/.test(s);
  }

  function looksEncrypted(token) {
    return isV2(token) || isLegacyToken(token);
  }

  function detectFormat(token) {
    var s = normalizeToken(token);
    if (/^AESv2\./.test(s)) return 'AESv2';
    if (s.indexOf(LEGACY_PREFIX) === 0) return 'AESCryptoV10';
    if (s.indexOf(OPENSSL_PREFIX) === 0) return 'OpenSSL';
    if (/^[0-9a-fA-F]{48,}$/.test(s)) return 'legacy-hex';
    if (/^[A-Za-z0-9+/=]{32,}$/.test(s)) return 'base64-only';
    return 'unknown';
  }

  /* ---------- 解密 ---------- */

  function decryptOnce(normalized, password, format) {
    if (format === 'AESv2') return decryptV2(normalized, password);
    if (!N.legacy) throw fail(CODE.UNSUPPORTED, '旧格式兼容模块未加载');
    return N.legacy.decryptLegacy(normalized, password);
  }

  /**
   * 带诊断信息的解密。
   * 兼容处理：口令首尾空格、密文折行/带引号、标准 base64、三种密文格式。
   * 返回 { text, format, passwordAdjusted }
   */
  function decryptWithInfo(token, password) {
    return Promise.resolve().then(function () {
      if (typeof token !== 'string') throw fail(CODE.EMPTY_INPUT);
      var normalized = normalizeToken(token);
      if (normalized.length === 0) throw fail(CODE.EMPTY_INPUT, '没有可解密的内容');
      if (!password) throw fail(CODE.EMPTY_PASSWORD, '口令不能为空');

      var format = detectFormat(normalized);
      if (format === 'unknown' || format === 'base64-only') {
        var err = fail(CODE.BAD_FORMAT, '无法识别的密文格式');
        err.diagnostic = { format: format, length: normalized.length };
        throw err;
      }

      // 原版 aescrypto.com 会对口令做 trim。用户若保留了首尾空格，
      // 这里先按原样试，失败再按 trim 后的口令试一次。
      var attempts = [password];
      var trimmed = String(password).trim();
      if (trimmed && trimmed !== password) attempts.push(trimmed);

      function attempt(i) {
        return decryptOnce(normalized, attempts[i], format).then(
          function (text) {
            return {
              text: text,
              format: format,
              passwordAdjusted: i > 0
            };
          },
          function (err) {
            if (err && err.code === CODE.AUTH_FAILED && i + 1 < attempts.length) {
              return attempt(i + 1);
            }
            throw err;
          }
        );
      }

      return attempt(0);
    });
  }

  /** 兼容旧签名：只返回明文 */
  function decrypt(token, password) {
    return decryptWithInfo(token, password).then(function (info) {
      return info.text;
    });
  }

  /* ---------- 自检 ---------- */

  /**
   * 控制台里运行 AESPAD.core.selfTest() 可确认本机环境与全部链路是否正常。
   */
  function selfTest() {
    var report = [];
    var plain = 'AES Pad self test · 自检 🎉';
    var pw = 'self-test-pw';

    function step(name, fn) {
      return Promise.resolve()
        .then(fn)
        .then(
          function (n) {
            report.push({ name: name, ok: true, note: n || '' });
          },
          function (err) {
            report.push({ name: name, ok: false, note: (err && (err.code || err.message)) || '未知错误' });
          }
        );
    }

    return step('WebCrypto 可用', function () {
      getSubtle();
      return 'ok';
    })
      .then(function () {
        return step('AESv2 加密→解密', function () {
          return encrypt(plain, pw).then(function (ct) {
            return decrypt(ct, pw).then(function (back) {
              if (back !== plain) throw new Error('内容不一致');
              return ct.slice(0, 10) + '…';
            });
          });
        });
      })
      .then(function () {
        return step('AESv2 含空格密文容错', function () {
          return encrypt(plain, pw).then(function (ct) {
            var dirty = '"' + ct.slice(0, 20) + '\n  ' + ct.slice(20) + '"';
            return decrypt(dirty, pw).then(function (back) {
              if (back !== plain) throw new Error('内容不一致');
              return 'OK';
            });
          });
        });
      })
      .then(function () {
        return step('旧格式 AESCryptoV10', function () {
          if (!N.legacy) throw new Error('legacy 未加载');
          return N.legacy.encryptLegacy(plain, pw).then(function (ct) {
            return N.legacy.decryptLegacy(ct, pw).then(function (back) {
              if (back !== plain) throw new Error('内容不一致');
              return ct.slice(0, 16) + '…';
            });
          });
        });
      })
      .then(function () {
        var failed = report.filter(function (r) {
          return !r.ok;
        });
        return {
          ok: failed.length === 0,
          params: PARAMS,
          steps: report
        };
      });
  }

  N.core = {
    PARAMS: PARAMS,
    CODE: CODE,
    encrypt: encrypt,
    encryptMany: encryptMany,
    decrypt: decrypt,
    decryptWithInfo: decryptWithInfo,
    decryptMany: decryptMany,
    decryptV2: decryptV2,
    isV2: isV2,
    isLegacyToken: isLegacyToken,
    looksEncrypted: looksEncrypted,
    detectFormat: detectFormat,
    normalizeToken: normalizeToken,
    deriveKey: deriveKey,
    randomBytes: randomBytes,
    b64uEncode: b64uEncode,
    b64uDecode: b64uDecode,
    selfTest: selfTest
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
