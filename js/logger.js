(function(){
  'use strict';
  var LOG_KEY = 'mj_error_logs_v1';
  var MAX_LOGS = 50;
  var lastLogTime = {};

  function getLogs() {
    try {
      var raw = localStorage.getItem(LOG_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch(e) { return []; }
  }

  function saveLogs(arr) {
    try { localStorage.setItem(LOG_KEY, JSON.stringify(arr)); } catch(e) {}
  }

  function addLog(type, message, detail) {
    var now = Date.now();
    // 节流：同一个错误 3 秒内只记一次，防止死循环撑爆存储
    var key = type + '|' + message;
    if (lastLogTime[key] && now - lastLogTime[key] < 3000) return;
    lastLogTime[key] = now;

    var logs = getLogs();
    logs.unshift({
      time: now,
      type: type,
      msg: String(message),
      detail: String(detail || ''),
      ua: navigator.userAgent,
      url: location.href
    });

    if (logs.length > MAX_LOGS) logs.length = MAX_LOGS;
    saveLogs(logs);

    // 如果是致命错误，在页面顶部弹个极小提示，避免用户完全不知道发生了啥
    if (type === 'Fatal' || type === 'Init') {
      var tip = document.getElementById('mj-error-tip');
      if (!tip) {
        tip = document.createElement('div');
        tip.id = 'mj-error-tip';
        tip.style.cssText = 'position:fixed;top:10px;left:50%;transform:translateX(-50%);background:#ff4757;color:#fff;padding:8px 14px;border-radius:20px;font-size:12px;z-index:999999;box-shadow:0 4px 12px rgba(0,0,0,.15);cursor:pointer;letter-spacing:1px;';
        tip.textContent = '检测到异常，点击去设置查看日志';
        tip.onclick = function() {
          tip.remove();
          var settingsBtn = document.querySelector('[data-set="log"]');
          if (settingsBtn) settingsBtn.click();
        };
        document.body.appendChild(tip);
        setTimeout(function(){ if(tip.parentNode) tip.remove(); }, 8000);
      }
    }
  }

  // 1. 捕获常规 JS 错误
  window.addEventListener('error', function(e) {
    var file = e.filename ? e.filename.split('/').pop() : 'unknown';
    addLog('Fatal', e.message, 'At ' + file + ':' + e.lineno + ':' + e.colno);
  }, true);

  // 2. 捕获资源加载错误 (404 等)
  window.addEventListener('error', function(e) {
    if (e.target && (e.target.tagName === 'SCRIPT' || e.target.tagName === 'LINK' || e.target.tagName === 'IMG')) {
      addLog('Network', '资源加载失败', e.target.src || e.target.href);
    }
  }, true);

  // 3. 捕获未处理的 Promise 错误
  window.addEventListener('unhandledrejection', function(e) {
    addLog('Promise', e.reason && e.reason.message ? e.reason.message : '未处理的 Promise 错误', e.reason && e.reason.stack ? e.reason.stack : '');
  });

  // 获取环境快照
  function getSnapshot() {
    var snap = {};
    try { snap.mem = window.performance.memory ? Math.round(window.performance.memory.usedJSHeapSize / 1024 / 1024) + ' MB' : 'Unknown'; } catch(e){}
    try {
      var lsSize = 0;
      for (var i = 0; i < localStorage.length; i++) {
        lsSize += (localStorage.getItem(localStorage.key(i)) || '').length;
      }
      snap.storage = Math.round(lsSize / 1024) + ' KB';
    } catch(e){ snap.storage = 'Unknown'; }
    return snap;
  }

  // 对外暴露 API 供 UI 调用
  window.MJ_LOGGER = {
    get: getLogs,
    clear: function() { saveLogs([]); },
    log: addLog,
    // ★ 新增：面包屑轨迹追踪
    trace: function(action, detail) {
      try {
        var t = JSON.parse(sessionStorage.getItem('mj_trace_v1') || '[]');
        t.push({ t: Date.now(), a: action, d: detail });
        if (t.length > 20) t.shift(); // 保留最近 20 条
        sessionStorage.setItem('mj_trace_v1', JSON.stringify(t));
      } catch(e){}
    },
    getTrace: function() {
      try { return JSON.parse(sessionStorage.getItem('mj_trace_v1') || '[]'); } catch(e){ return []; }
    },
    exportTxt: function() {
      var logs = getLogs();
      var traces = this.getTrace();
      var snap = getSnapshot();
      
      var text = '====== MJ 错误报告 ======\n';
      text += '导出时间: ' + new Date().toLocaleString() + '\n';
      text += '设备信息: ' + navigator.userAgent + '\n';
      text += '内存占用: ' + snap.mem + '\n';
      text += '本地存储: ' + snap.storage + '\n\n';
      
      text += '--- 操作轨迹 (最后 20 步) ---\n';
      if (!traces.length) text += '无记录\n';
      traces.forEach(function(t) {
        text += '[' + new Date(t.t).toLocaleTimeString() + '] ' + t.a + (t.d ? ' : ' + t.d : '') + '\n';
      });
      
      text += '\n--- 错误日志 ---\n';
      if (!logs.length) text += '无错误记录\n';
      logs.forEach(function(l) {
        text += '[' + new Date(l.time).toLocaleString() + '] [' + l.type + ']\n';
        text += '内容: ' + l.msg + '\n';
        if (l.detail) text += '详情: ' + l.detail + '\n';
        text += '------------------------\n';
      });
      return text;
    }
  };

  // 全局自动打点：记录关键点击
  document.addEventListener('click', function(e) {
    var el = e.target.closest('button, .btn, .set-row, [data-func], [data-act]');
    if (el) {
      var name = el.innerText || el.id || el.className || el.tagName;
      window.MJ_LOGGER.trace('Click', String(name).slice(0, 20).replace(/\n/g, ' '));
    }
  }, { capture: true, passive: true });
})();