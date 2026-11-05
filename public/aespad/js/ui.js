/*!
 * AES Pad · ui.js
 * 交互层：单输入框原位加解密，含批量模式。
 * localStorage 只存「主题 / 格式 / 开关」，绝不存口令与文本。
 */
(function () {
  'use strict';

  var AESPAD = window.AESPAD || {};
  var core = AESPAD.core;
  var legacy = AESPAD.legacy;

  if (!core || !legacy) {
    document.body.innerHTML = '<p style="padding:40px;font-family:sans-serif">加密模块加载失败，请检查 js/ 目录是否完整。</p>';
    return;
  }

  var STORE_KEY = 'aespad.settings.v2';
  var COMMON_WEAK = [
    '123456', '12345678', '123456789', 'password', 'passw0rd', 'qwerty',
    'abc123', '111111', '000000', 'iloveyou', 'admin', 'root', '666666',
    '888888', 'a123456', 'woaini1314', '5201314'
  ];

  var el = {
    themeBtn: document.getElementById('themeBtn'),
    settingsBtn: document.getElementById('settingsBtn'),
    settings: document.getElementById('settings'),
    formatSwitch: document.getElementById('formatSwitch'),
    formatHint: document.getElementById('formatHint'),
    clearOnHide: document.getElementById('clearOnHide'),

    password: document.getElementById('password'),
    keypadField: document.querySelector('.keypad__field'),
    togglePw: document.getElementById('togglePw'),
    clearPw: document.getElementById('clearPw'),
    meter: document.getElementById('meter'),
    meterText: document.getElementById('meterText'),

    content: document.getElementById('content'),
    contentCount: document.getElementById('contentCount'),
    contentHint: document.getElementById('contentHint'),
    contentKind: document.getElementById('contentKind'),
    copyContent: document.getElementById('copyContent'),
    clearContent: document.getElementById('clearContent'),

    status: document.getElementById('status'),
    statusText: document.querySelector('#status .status__text'),
    encryptBtn: document.getElementById('encryptBtn'),
    decryptBtn: document.getElementById('decryptBtn'),
    encryptLabel: document.querySelector('#encryptBtn .primary__label'),
    decryptLabel: document.querySelector('#decryptBtn .primary__label'),
    batchToggle: document.getElementById('batchToggle'),
    progress: document.getElementById('progress'),
    progressBar: document.getElementById('progressBar'),

    selfTestBtn: document.getElementById('selfTestBtn'),
    selfTestResult: document.getElementById('selfTestResult'),
    toast: document.getElementById('toast')
  };

  var state = {
    format: 'AESv2',
    batch: false,
    busy: false,
    clearOnHide: true
  };

  /* ---------------- 设置持久化（只存偏好） ---------------- */

  function loadSettings() {
    var raw;
    try {
      raw = JSON.parse(window.localStorage.getItem(STORE_KEY) || '{}');
    } catch (e) {
      raw = {};
    }
    if (raw.theme === 'light' || raw.theme === 'dark') applyTheme(raw.theme);
    if (raw.format === 'legacy' || raw.format === 'AESv2') state.format = raw.format;
    if (typeof raw.batch === 'boolean') state.batch = raw.batch;
    if (typeof raw.clearOnHide === 'boolean') state.clearOnHide = raw.clearOnHide;
  }

  function saveSettings() {
    try {
      window.localStorage.setItem(
        STORE_KEY,
        JSON.stringify({
          theme: document.documentElement.getAttribute('data-theme'),
          format: state.format,
          batch: state.batch,
          clearOnHide: state.clearOnHide
        })
      );
    } catch (e) {
      /* 隐私模式下会抛错，忽略 */
    }
  }

  /* ---------------- 主题 ---------------- */

  function resolvedTheme() {
    var attr = document.documentElement.getAttribute('data-theme');
    if (attr === 'dark' || attr === 'light') return attr;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    el.themeBtn.title = theme === 'dark' ? '切换到浅色' : '切换到深色';
  }

  /* ---------------- 状态 / 提示 ---------------- */

  function setStatus(kind, text) {
    el.status.setAttribute('data-kind', kind);
    el.statusText.textContent = text;
  }

  var toastTimer;
  function toast(text) {
    el.toast.textContent = text;
    el.toast.classList.add('is-visible');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      el.toast.classList.remove('is-visible');
    }, 1700);
  }

  function now() {
    return (window.performance || Date).now();
  }

  /* ---------------- 口令强度 ---------------- */

  function strengthOf(pw) {
    if (!pw) return { level: 0, label: '口令强度' };
    if (COMMON_WEAK.indexOf(pw.toLowerCase()) >= 0) return { level: 1, label: '弱 · 常见口令' };

    var pool = 0;
    if (/[a-z]/.test(pw)) pool += 26;
    if (/[A-Z]/.test(pw)) pool += 26;
    if (/[0-9]/.test(pw)) pool += 10;
    if (/[^a-zA-Z0-9]/.test(pw)) pool += 33;
    if (/[\u4e00-\u9fa5]/.test(pw)) pool += 2000;

    var bits = (pw.length * Math.log(pool)) / Math.LN2;
    if (/^(.)\1+$/.test(pw)) bits = Math.min(bits, 20);
    if (/^\d+$/.test(pw)) bits *= 0.6;
    if (/(19|20)\d{2}/.test(pw)) bits *= 0.9;

    var level = bits < 40 ? 1 : bits < 62 ? 2 : bits < 88 ? 3 : 4;
    var label = ['口令强度', '弱 · 挡不住离线爆破', '一般 · 建议加长', '较强', '很强'][level];
    if (/^\s|\s$/.test(pw)) label += '（首尾有空格）';
    return { level: level, label: label };
  }

  function renderMeter() {
    var s = strengthOf(el.password.value);
    el.meter.setAttribute('data-level', String(s.level));
    el.meterText.textContent = s.label;
  }

  /* ---------------- 计数 ---------------- */

  function formatName(format) {
    if (format === 'AESv2') return 'AESv2';
    if (format === 'OpenSSL') return 'OpenSSL';
    if (format === 'AESCryptoV10') return 'AESCryptoV10';
    if (format === 'legacy-hex') return '旧版密文';
    return '';
  }

  function renderContentMeta() {
    var text = el.content.value;
    var trimmed = text.trim();
    var length = text.length;
    el.contentCount.textContent = length ? length.toLocaleString() + ' 字符' : '0 字符';
    el.copyContent.disabled = length === 0;
    el.contentKind.classList.remove('is-cipher');
    el.content.classList.remove('is-cipher');

    if (!trimmed) {
      el.contentHint.textContent = '加密时输入明文，解密时粘贴密文';
      el.contentKind.textContent = '等待输入';
      return;
    }

    var lines = trimmed.split(/\r?\n/).filter(function (line) {
      return line.trim();
    });
    var first = lines[0] || '';
    var format = core.detectFormat(first);
    var isCipher = lines.every(function (line) {
      return core.looksEncrypted(line);
    });

    if (isCipher) {
      el.contentHint.textContent = state.batch
        ? '已按行识别密文，可直接批量解密'
        : '已识别密文，输入口令后即可解密';
      el.contentKind.textContent = formatName(format) || '密文';
      el.contentKind.classList.add('is-cipher');
      el.content.classList.add('is-cipher');
      return;
    }

    el.contentHint.textContent = state.batch
      ? '批量模式下每行作为一条独立内容'
      : '当前内容是明文，输入口令后即可加密';
    el.contentKind.textContent = state.batch && lines.length > 1
      ? lines.length + ' 行明文'
      : '明文';
  }

  /* ---------------- 批量文案 ---------------- */

  function renderBatchState() {
    el.batchToggle.checked = state.batch;
    el.encryptLabel.textContent = state.batch ? '批量加密' : '加密';
    el.decryptLabel.textContent = state.batch ? '批量解密' : '解密';
    document.body.classList.toggle('is-batch', state.batch);
    renderContentMeta();
    if (!state.busy) {
      setStatus('idle', state.batch ? '批量模式：每行一条，空行会保留占位' : '准备就绪');
    }
  }

  /* ---------------- 进度 ---------------- */

  function setProgress(done, total) {
    if (!total) return;
    el.progress.removeAttribute('hidden');
    el.progressBar.style.width = Math.round((done / total) * 100) + '%';
  }

  function resetProgress() {
    el.progress.setAttribute('hidden', '');
    el.progressBar.style.width = '0%';
  }

  /* ---------------- 忙碌态 ---------------- */

  function setBusy(busy, which) {
    state.busy = busy;
    el.encryptBtn.disabled = busy;
    el.decryptBtn.disabled = busy;
    el.encryptBtn.classList.toggle('is-busy', busy && which === 'encrypt');
    el.decryptBtn.classList.toggle('is-busy', busy && which === 'decrypt');
  }

  function splitLines(text) {
    return text.replace(/\r\n/g, '\n').split('\n');
  }

  /* ---------------- 主流程 ---------------- */

  function run(direction) {
    if (state.busy) return;

    var text = el.content.value;
    var password = el.password.value;

    if (!text.trim()) {
      setStatus('error', direction === 'encrypt' ? '请先输入要加密的内容' : '请先粘贴要解密的密文');
      el.content.focus();
      return;
    }
    if (!password) {
      setStatus('error', '请先输入口令');
      el.password.focus();
      return;
    }

    setBusy(true, direction);
    setStatus('busy', state.batch ? '批量处理中…' : '派生密钥中…（PBKDF2 600,000 次迭代）');
    var started = now();

    if (state.batch) {
      runBatch(direction, text, password, started);
    } else {
      runSingle(direction, text, password, started);
    }
  }

  function fillContent(text) {
    el.content.value = text;
    el.content.scrollTop = 0;
    renderContentMeta();
  }

  function runSingle(direction, text, password, started) {
    var task;
    if (direction === 'encrypt') {
      task = state.format === 'legacy' ? legacy.encryptLegacy(text, password) : core.encrypt(text, password);
    } else {
      task = core.decryptWithInfo(text, password);
    }

    task
      .then(function (result) {
        var elapsed = ((now() - started) / 1000).toFixed(2);
        setBusy(false);

        if (direction === 'encrypt') {
          fillContent(result);
          setStatus('ok', '已加密 · ' + text.length + ' → ' + result.length + ' 字符 · ' + elapsed + 's');
        } else {
          fillContent(result.text);
          var note = '已解密 · ' + formatLabel(result.format) + ' · 校验通过 · ' + elapsed + 's';
          if (result.passwordAdjusted) {
            note += ' · 已按去掉首尾空格的口令重试成功';
            toast('原版会忽略口令首尾空格，已据此解开');
          }
          setStatus('ok', note);
        }
      })
      .catch(function (err) {
        setBusy(false);
        renderContentMeta();
        setStatus('error', errorMessage(err, direction));
      });
  }

  function runBatch(direction, text, password, started) {
    var lines = splitLines(text);
    var total = lines.length;
    setProgress(0, total);

    var options = {
      onProgress: function (done) {
        setProgress(done, total);
      }
    };

    var task;
    if (direction === 'encrypt') {
      task = core.encryptMany(lines, password, options).then(function (res) {
        var real = res.items.filter(function (it) { return it && !it.empty; });
        return {
          lines: res.items.map(function (it) {
            return it.ok ? it.value : '⚠ ' + (it.error || '失败');
          }),
          okCount: real.filter(function (it) { return it.ok; }).length,
          total: real.length
        };
      });
    } else {
      options.abortAfter = 3;
      task = core.decryptMany(lines, password, options).then(function (res) {
        var failedAt = [];
        var okCount = 0;
        var skipped = 0;
        var real = 0;
        var out = res.items.map(function (it, i) {
          if (!it) return '';
          if (it.empty) return '';
          real++;
          if (it.ok) {
            okCount++;
            return it.text;
          }
          if (it.skipped) {
            skipped++;
            return '⚠ 已中止';
          }
          failedAt.push(i + 1);
          return '⚠ 第 ' + (i + 1) + ' 行：' + (it.error || '解密失败');
        });
        return { lines: out, okCount: okCount, failedAt: failedAt, skipped: skipped, total: real };
      });
    }

    task
      .then(function (res) {
        var elapsed = ((now() - started) / 1000).toFixed(2);
        setBusy(false);
        resetProgress();
        fillContent(res.lines.join('\n'));

        var totalReal = res.total || total;
        var summary = direction === 'encrypt'
          ? '批量加密完成 · ' + res.okCount + '/' + totalReal + ' 条 · ' + elapsed + 's'
          : '批量解密完成 · ' + res.okCount + '/' + totalReal + ' 条';

        if (res.skipped) {
          summary = '口令可能不对，已在连续 3 条失败后中止 · 成功 ' + res.okCount + ' 条';
          setStatus('error', summary);
        } else if (res.failedAt && res.failedAt.length) {
          if (res.okCount === 0 && res.failedAt.length >= 3) {
            summary = '口令可能不对 · ' + res.failedAt.length + ' 条全部解密失败';
          } else {
            summary += ' · 失败行：' + res.failedAt.slice(0, 6).join('、') + (res.failedAt.length > 6 ? '…' : '');
          }
          setStatus('error', summary);
        } else {
          setStatus('ok', summary + (direction === 'encrypt' ? '' : ' · ' + elapsed + 's'));
        }
      })
      .catch(function (err) {
        setBusy(false);
        resetProgress();
        renderContentMeta();
        setStatus('error', errorMessage(err, direction));
      });
  }

  function formatLabel(format) {
    if (format === 'AESv2') return 'AESv2';
    if (format === 'OpenSSL') return 'OpenSSL';
    if (format === 'AESCryptoV10' || format === 'legacy-hex') return '旧版 AESCryptoV10';
    return format;
  }

  function errorMessage(err, direction) {
    var code = err && err.code;
    if (code === 'EMPTY_INPUT') return direction === 'encrypt' ? '请先输入要加密的内容' : '请先粘贴要解密的密文';
    if (code === 'EMPTY_PASSWORD') return '请先输入口令';
    if (code === 'AUTH_FAILED') {
      var hint = '解密失败：口令不对，或密文被改动过（完整性校验未通过）';
      if (/^\s|\s$/.test(el.password.value)) hint += '。另外口令首尾有空格，试试去掉？';
      return hint;
    }
    if (code === 'BAD_FORMAT') {
      var d = err.diagnostic || {};
      var detail = d.format === 'base64-only'
        ? '（看起来像 base64，但缺少 Salted__ 头）'
        : d.format === 'unknown' && d.length
          ? '（长度 ' + d.length + '）'
          : '';
      return '无法识别这段内容，它不像密文' + detail;
    }
    if (code === 'UNSUPPORTED') return '当前环境不支持 WebCrypto，请用 HTTPS 或 localhost 打开';
    return '出错了：' + (err && err.message ? err.message : '未知错误');
  }

  /* ---------------- 复制 / 清空 ---------------- */

  function copyFrom(node, btn) {
    var text = node.value;
    if (!text) return;

    function done() {
      toast('已复制到剪贴板');
      var old = btn.textContent;
      btn.textContent = '已复制';
      window.setTimeout(function () {
        btn.textContent = old;
      }, 1400);
    }

    function fallback() {
      node.focus();
      node.select();
      try {
        document.execCommand('copy');
        done();
      } catch (e) {
        toast('复制失败，请手动选择');
      }
      node.setSelectionRange(0, 0);
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, fallback);
    } else {
      fallback();
    }
  }

  /* ---------------- 设置渲染 ---------------- */

  function renderFormatHint() {
    if (state.format === 'legacy') {
      el.formatHint.innerHTML =
        'AESCryptoV10：与 aescrypto.com 互通的旧格式（<code>EvpKDF-MD5 + AES-256-CBC</code>）。' +
        '没有完整性校验、口令派生只迭代 1 次，<strong>明显弱于 AESv2</strong>，仅在需要让旧设备/旧版本打开时才使用。';
    } else {
      el.formatHint.innerHTML =
        'AESv2：<code>PBKDF2-SHA-256(600k) + AES-256-GCM</code>，带认证标签，口令错误或密文被改都会明确报错。' +
        '输出为单行 <code>AESv2.xxx</code>，可直接贴进短信 / IM。';
    }
  }

  /* ---------------- 事件绑定 ---------------- */

  el.encryptBtn.addEventListener('click', function () {
    run('encrypt');
  });
  el.decryptBtn.addEventListener('click', function () {
    run('decrypt');
  });

  el.content.addEventListener('input', renderContentMeta);
  el.content.addEventListener('paste', function () {
    window.setTimeout(renderContentMeta, 0);
  });

  el.password.addEventListener('input', renderMeter);
  el.password.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.isComposing) {
      e.preventDefault();
      run('encrypt');
    }
  });

  el.togglePw.addEventListener('click', function () {
    var revealed = el.keypadField.classList.toggle('is-revealed');
    el.password.type = revealed ? 'text' : 'password';
    el.togglePw.setAttribute('aria-label', revealed ? '隐藏口令' : '显示口令');
  });

  el.clearPw.addEventListener('click', function () {
    el.password.value = '';
    renderMeter();
    el.password.focus();
  });

  el.copyContent.addEventListener('click', function () {
    copyFrom(el.content, el.copyContent);
  });

  el.clearContent.addEventListener('click', function () {
    el.content.value = '';
    renderContentMeta();
    setStatus('idle', '已清空内容');
    el.content.focus();
  });

  el.batchToggle.addEventListener('change', function () {
    state.batch = el.batchToggle.checked;
    renderBatchState();
    saveSettings();
  });

  el.settingsBtn.addEventListener('click', function () {
    var open = el.settings.hasAttribute('hidden');
    if (open) {
      el.settings.removeAttribute('hidden');
    } else {
      el.settings.setAttribute('hidden', '');
    }
    el.settingsBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  el.formatSwitch.addEventListener('click', function (e) {
    var btn = e.target.closest('button');
    if (!btn) return;
    state.format = btn.getAttribute('data-format');
    Array.prototype.forEach.call(el.formatSwitch.querySelectorAll('button'), function (b) {
      b.classList.toggle('is-active', b === btn);
    });
    renderFormatHint();
    saveSettings();
  });

  el.clearOnHide.addEventListener('change', function () {
    state.clearOnHide = el.clearOnHide.checked;
    saveSettings();
  });

  el.themeBtn.addEventListener('click', function () {
    applyTheme(resolvedTheme() === 'dark' ? 'light' : 'dark');
    saveSettings();
  });

  el.selfTestBtn.addEventListener('click', function () {
    if (el.selfTestBtn.disabled) return;
    el.selfTestBtn.disabled = true;
    el.selfTestResult.textContent = '自检中…';
    core.selfTest()
      .then(function (report) {
        el.selfTestBtn.disabled = false;
        var failed = report.steps.filter(function (s) {
          return !s.ok;
        });
        if (report.ok) {
          el.selfTestResult.textContent = '✓ 加密链路正常（4/4），问题更可能出在口令或密文本身';
          setStatus('ok', '自检通过：加密与解密链路正常');
        } else {
          el.selfTestResult.textContent = '✗ 异常：' + failed.map(function (s) { return s.name; }).join('、');
          setStatus('error', '自检失败：' + failed[0].name + '（' + failed[0].note + '）');
        }
        if (window.console && console.table) console.table(report.steps);
      })
      .catch(function (err) {
        el.selfTestBtn.disabled = false;
        el.selfTestResult.textContent = '✗ 自检无法执行：' + (err && err.message);
      });
  });

  document.addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      run(e.shiftKey ? 'decrypt' : 'encrypt');
    }
    if (e.key === 'Escape' && !el.settings.hasAttribute('hidden')) {
      el.settings.setAttribute('hidden', '');
      el.settingsBtn.setAttribute('aria-expanded', 'false');
    }
  });

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden' && state.clearOnHide && el.password.value) {
      el.password.value = '';
      renderMeter();
    }
  });

  /* ---------------- 初始化 ---------------- */

  loadSettings();

  el.clearOnHide.checked = state.clearOnHide;
  Array.prototype.forEach.call(el.formatSwitch.querySelectorAll('button'), function (b) {
    b.classList.toggle('is-active', b.getAttribute('data-format') === state.format);
  });
  renderFormatHint();

  var themeAttr = document.documentElement.getAttribute('data-theme');
  if (themeAttr === 'light' || themeAttr === 'dark') {
    applyTheme(themeAttr);
  } else {
    el.themeBtn.title = resolvedTheme() === 'dark' ? '切换到浅色' : '切换到深色';
  }

  renderContentMeta();
  renderMeter();
  renderBatchState();
  setStatus('idle', '准备就绪');

  el.content.focus();
})();
