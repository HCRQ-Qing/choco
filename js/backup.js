/* ============================================================
   数据备份 / 恢复（backup.js）
   ------------------------------------------------------------
   清缓存 / 换手机 / 卸载重装时，localStorage 和 IndexedDB 都会丢。
   这里把两者打包成一个 JSON，方便用户自己存到网盘 / 微信收藏。

   - 导出：localStorage 的 mj_* / xy-home-v2:* 全部原始字符串
           + IndexedDB（mj_big_files / files）里的大文件（转 base64）
   - 恢复：校验文件头 → 二次确认 → 覆盖写回 → 刷新页面

   依赖：indexeddb.js 的 window.__idb、app.js 的 toast / uniAsk
   本文件必须在 app.js 之后、indexeddb.js 之后加载。
   ============================================================ */
(function(){
  'use strict';
  if(window.__chocoBackupReady) return;
  window.__chocoBackupReady = true;

  /* 只备份本应用的键，避免把同源其它数据一起带走 */
  var LS_PREFIXES = ['mj_', 'xy-home-v2:', 'choco_'];
  /* 单个 / 合计大文件上限（base64 后会膨胀约 33%） */
  var MAX_ITEM_BYTES  = 8 * 1024 * 1024;
  var MAX_TOTAL_BYTES = 80 * 1024 * 1024;

  function isAppKey(k){
    if(!k) return false;
    for(var i = 0; i < LS_PREFIXES.length; i++){
      if(k.indexOf(LS_PREFIXES[i]) === 0) return true;
    }
    return false;
  }

  function say(msg){
    try{ if(typeof toast === 'function') toast(msg); }catch(e){ console.log('[backup]', msg); }
  }

  function blobToDataURL(blob){
    return new Promise(function(resolve, reject){
      var fr = new FileReader();
      fr.onload  = function(){ resolve(fr.result); };
      fr.onerror = function(){ reject(fr.error || new Error('读取文件失败')); };
      fr.readAsDataURL(blob);
    });
  }

  function dataURLToBlob(dataURL){
    if(window.__idb && __idb.dataURLToBlob){
      var b = __idb.dataURLToBlob(dataURL);
      if(b) return b;
    }
    var parts = String(dataURL || '').split(',');
    var mime = (parts[0].match(/:(.*?);/) || [])[1] || 'application/octet-stream';
    var bin = atob(parts[1] || '');
    var arr = new Uint8Array(bin.length);
    for(var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
  }

  function stamp(){
    var d = new Date();
    function p(n){ return String(n).padStart(2, '0'); }
    return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes());
  }

  function download(filename, obj){
    var json = JSON.stringify(obj);
    var blob = new Blob([json], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(function(){
      URL.revokeObjectURL(url);
      if(a.parentNode) a.parentNode.removeChild(a);
    }, 1500);
    return json.length;
  }

  /* ---------- 导出 ---------- */
  function showExportPicker(){
    var old = document.getElementById('bkExportPicker');
    if(old) old.remove();
    var layer = document.createElement('div');
    layer.id = 'bkExportPicker';
    layer.style.cssText = 'position:fixed;inset:0;z-index:2147483640;background:rgba(0,0,0,.35);display:flex;align-items:flex-end;justify-content:center';
    function item(act, title, sub){
      return '<div data-act="' + act + '" style="padding:15px 18px;border-bottom:0.7px solid #f1f1f1;cursor:pointer">' +
        '<div style="font-size:13px;color:#1a1a1a;letter-spacing:1px">' + title + '</div>' +
        '<div style="font-size:11px;color:#999;margin-top:4px">' + sub + '</div>' +
      '</div>';
    }
    layer.innerHTML =
      '<div style="width:100%;max-width:520px;background:#fff;border-radius:18px 18px 0 0;padding:6px 0 calc(10px + env(safe-area-inset-bottom))">' +
        '<div style="text-align:center;font-size:14px;letter-spacing:4px;text-indent:4px;padding:16px 0 10px;color:#1a1a1a">导 出 备 份</div>' +
        item('all', '全部备份', '角色 / 字卡 / 聊天 / 表情 / 设置，全打包') +
        item('chat', '聊天备份', '只导聊天记录，文件小') +
        item('sticker', '表情包备份', '只导表情图，可单独分享') +
        '<div data-act="cancel" style="text-align:center;padding:16px;font-size:13px;color:#999;letter-spacing:2px;cursor:pointer">取 消</div>' +
      '</div>';
    document.body.appendChild(layer);
    layer.addEventListener('click', function(e){
      if(e.target === layer){ layer.remove(); return; }
      var el = e.target.closest('[data-act]');
      if(!el) return;
      var act = el.dataset.act;
      layer.remove();
      if(act === 'all') exportAll('all');
      else if(act === 'chat') exportAll('chat');
      else if(act === 'sticker') exportAll('sticker');
    });
  }

  function exportAll(mode){
    mode = mode || 'all';
    var ls = {};
    try{
      for(var i = 0; i < localStorage.length; i++){
        var k = localStorage.key(i);
        if(!isAppKey(k)) continue;
        ls[k] = localStorage.getItem(k);
      }
    }catch(e){
      console.error('[backup] 读 localStorage 失败', e);
    }

    var payload = {
      __type: 'choco-backup',
      version: 1,
      app: 'choco',
      mode: mode,
      exportedAt: new Date().toISOString(),
      localStorage: {},
      idb: {}
    };

    var skipped = 0;
    var totalBytes = 0;

    var stickerIdbKeys = [];
    if(mode === 'sticker'){
      try{
        if(window.__stickerBackup && window.__stickerBackup.makeExportPayload){
          payload.sticker = window.__stickerBackup.makeExportPayload();
        }
        if(window.__stickerBackup && window.__stickerBackup.listIdbStickerKeys){
          stickerIdbKeys = window.__stickerBackup.listIdbStickerKeys();
        }
      }catch(e){ console.error('[backup] 表情导出准备失败', e); }
    }

    function keepKey(k){
      if(mode === 'chat') return k.indexOf('mj_msgs_') === 0;
      if(mode === 'sticker') return false;
      return true;
    }

    Object.keys(ls).forEach(function(k){
      if(keepKey(k)) payload.localStorage[k] = ls[k];
    });

    function finish(){
      var _sfx = mode === 'chat' ? '-chat' : (mode === 'sticker' ? '-sticker' : '-all');
      var size = download('choco-backup-' + stamp() + _sfx + '.json', payload);
      var mb = (size / 1024 / 1024).toFixed(1);
      var nLS = Object.keys(ls).length;
      /* 统计字卡与消息数量，让用户知道备份了多少内容 */
      var cardCount = 0, msgCount = 0;
      try{
        var raw = ls['mj_card_groups_v5'];
        if(raw){
          var cs = JSON.parse(raw);
          function countCards(groups){
            (groups||[]).forEach(function(g){
              (g.cats||[]).forEach(function(c){
                cardCount += (c.list||[]).length;
              });
            });
          }
          countCards(cs.public);
          Object.keys(cs.roles||{}).forEach(function(rid){ countCards(cs.roles[rid]); });
        }
      }catch(e){}
      Object.keys(ls).forEach(function(k){
        if(k.indexOf('mj_msgs_') === 0){
          try{ msgCount += (JSON.parse(ls[k])||[]).length; }catch(e){}
        }
      });
      var extra = skipped ? '（' + skipped + ' 个大文件超过上限已跳过）' : '';
      say('已导出 ' + mb + ' MB：' + nLS + ' 项设置 / ' + cardCount + ' 张字卡 / ' + msgCount + ' 条消息' + extra);
    }

    if(!(window.__idb && __idb.keys && __idb.get)){
      finish();
      return;
    }

    say('正在打包备份…');
    __idb.keys().then(function(keys){
      keys = Array.from(keys || []);
      if(mode === 'chat') keys = [];
      else if(mode === 'sticker'){
        var _set = {};
        stickerIdbKeys.forEach(function(k){ _set[k] = 1; });
        keys = keys.filter(function(k){ return _set[k]; });
      }
      var idx = 0;

      function next(){
        if(idx >= keys.length) return Promise.resolve();
        var key = keys[idx++];
        return __idb.get(key).then(function(val){
          if(!val) return;
          if(val instanceof Blob){
            if(val.size > MAX_ITEM_BYTES || totalBytes + val.size > MAX_TOTAL_BYTES){
              skipped++;
              return;
            }
            totalBytes += val.size;
            return blobToDataURL(val).then(function(dataURL){
              payload.idb[key] = { kind: 'blob', mime: val.type || '', data: dataURL };
            });
          }
          /* 非 Blob 的（极少见）直接原样存 */
          try{ payload.idb[key] = { kind: 'raw', data: val }; }catch(e){ skipped++; }
        }).catch(function(e){
          console.warn('[backup] 读取大文件失败', key, e);
          skipped++;
        }).then(next);
      }

      return next();
    }).then(finish).catch(function(e){
      console.error('[backup] 打包失败', e);
      say('备份失败：' + (e && e.message ? e.message : '未知错误'));
    });
  }

  /* ---------- 恢复 ---------- */
  function applyImport(data, done){
    try{
      var mode = __pendingImportMode || 'all';
      var ls = data.localStorage || {};

      function keyMatch(k){
        if(mode === 'chat') return k.indexOf('mj_msgs_') === 0;
        if(mode === 'sticker') return false;
        return true;
      }

      /* 1. 只清要覆盖的那一类键，其它类保留 */
      var oldKeys = [];
      for(var i = 0; i < localStorage.length; i++){
        var k = localStorage.key(i);
        if(isAppKey(k) && keyMatch(k)) oldKeys.push(k);
      }
      oldKeys.forEach(function(k){ try{ localStorage.removeItem(k); }catch(e){} });

      var wrote = 0, failed = 0;
      Object.keys(ls).forEach(function(k){
        if(!isAppKey(k)) return;
        if(typeof ls[k] !== 'string') return;
        try{ localStorage.setItem(k, ls[k]); wrote++; }catch(e){ failed++; console.error('[backup] 写入失败', k, e); }
      });

      if(mode === 'sticker'){
        try{
          if(window.__stickerBackup && window.__stickerBackup.replaceStickersFromPayload && data.sticker){
            window.__stickerBackup.replaceStickersFromPayload(data.sticker);
          }
        }catch(e){ console.error('[backup] 表情写回失败', e); }
      }

      /* 2. IndexedDB：按模式处理 */
      var idb = data.idb || {};
      var entries = Object.keys(idb);
      if(mode === 'chat'){
        done({ wrote: wrote, failed: failed, idb: 0 });
        return;
      }
      if(!entries.length || !(window.__idb && __idb.set)){
        done({ wrote: wrote, failed: failed, idb: 0 });
        return;
      }

      var clearPromise = Promise.resolve();
      if(mode === 'all'){
        clearPromise = __idb.clear().catch(function(){});
      } else if(mode === 'sticker'){
        clearPromise = (window.__stickerBackup && window.__stickerBackup.clearIdbStickers)
          ? window.__stickerBackup.clearIdbStickers().catch(function(){})
          : Promise.resolve();
      }

      var stickerKeySet = null;
      if(mode === 'sticker'){
        stickerKeySet = {};
        try{
          if(window.__stickerBackup && window.__stickerBackup.listIdbStickerKeys){
            window.__stickerBackup.listIdbStickerKeys().forEach(function(k){ stickerKeySet[k] = 1; });
          }
        }catch(e){}
      }

      clearPromise.then(function(){
        var idx = 0;
        var idbOk = 0;
        function next(){
          if(idx >= entries.length) return Promise.resolve();
          var key = entries[idx++];
          if(mode === 'sticker' && stickerKeySet && !stickerKeySet[key]){
            return next();
          }
          var it = idb[key] || {};
          var blob = null;
          try{
            if(it.kind === 'blob' && typeof it.data === 'string') blob = dataURLToBlob(it.data);
            else if(it.data !== undefined) blob = it.data;
          }catch(e){ console.warn('[backup] 解析大文件失败', key, e); }
          if(!blob) return next();
          return __idb.set(key, blob).then(function(){ idbOk++; }).catch(function(e){
            console.warn('[backup] 写回大文件失败', key, e);
          }).then(next);
        }
        return next().then(function(){
          done({ wrote: wrote, failed: failed, idb: idbOk });
        });
      }).catch(function(){ done({ wrote: wrote, failed: failed, idb: 0 }); });
    }catch(e){
      console.error('[backup] 恢复失败', e);
      say('恢复失败：' + (e && e.message ? e.message : '未知错误'));
    }
  }

  function importFromFile(file){
    if(!file) return;
    var reader = new FileReader();
    reader.onload = function(){
      var data = null;
      try{ data = JSON.parse(String(reader.result || '')); }catch(e){}
      if(!data || data.__type !== 'choco-backup'){
        say('这不是 choco 的备份文件');
        return;
      }
      var nLS = Object.keys(data.localStorage || {}).length;
      var nIDB = Object.keys(data.idb || {}).length;
      var sub = '备份时间：' + (data.exportedAt || '未知') + '\n包含 ' + nLS + ' 项设置与 ' + nIDB + ' 个文件。\n恢复会覆盖当前全部数据，输入「恢复」确认';

      function go(){
        say('正在恢复数据…');
        applyImport(data, function(stats){
          stats = stats || {};
          var msg = '恢复完成：写入 ' + (stats.wrote||0) + ' 项设置';
          if(stats.failed) msg += '，' + stats.failed + ' 项失败';
          if(stats.idb) msg += '，' + stats.idb + ' 个文件';
          say(msg + '，正在刷新…');
          setTimeout(function(){ location.reload(); }, 600);
        });
      }

      if(typeof uniAsk === 'function'){
        uniAsk({
          title: '恢复备份',
          sub: sub,
          value: '',
          placeholder: '输入「恢复」两个字确认',
          maxlength: 4
        }).then(function(v){
          if(v === null) return;
          if(String(v).trim() !== '恢复'){ say('未确认，已取消'); return; }
          go();
        });
      }else{
        if(window.confirm('恢复会覆盖当前全部数据，确定继续吗？')) go();
      }
    };
    reader.onerror = function(){ say('读取备份文件失败'); };
    reader.readAsText(file);
  }

  var __pendingImportMode = 'all';

  function showImportPicker(){
    var old = document.getElementById('bkImportPicker');
    if(old) old.remove();
    var layer = document.createElement('div');
    layer.id = 'bkImportPicker';
    layer.style.cssText = 'position:fixed;inset:0;z-index:2147483640;background:rgba(0,0,0,.35);display:flex;align-items:flex-end;justify-content:center';
    function item(act, title, sub){
      return '<div data-act="' + act + '" style="padding:15px 18px;border-bottom:0.7px solid #f1f1f1;cursor:pointer">' +
        '<div style="font-size:13px;color:#1a1a1a;letter-spacing:1px">' + title + '</div>' +
        '<div style="font-size:11px;color:#999;margin-top:4px">' + sub + '</div>' +
      '</div>';
    }
    layer.innerHTML =
      '<div style="width:100%;max-width:520px;background:#fff;border-radius:18px 18px 0 0;padding:6px 0 calc(10px + env(safe-area-inset-bottom))">' +
        '<div style="text-align:center;font-size:14px;letter-spacing:4px;text-indent:4px;padding:16px 0 10px;color:#1a1a1a">恢 复 备 份</div>' +
        item('all', '恢复全部', '角色 / 字卡 / 聊天 / 表情 / 设置，全部覆盖') +
        item('chat', '只恢复聊天', '只覆盖聊天记录，其它类保留') +
        item('sticker', '只恢复表情包', '只覆盖表情图，其它类保留') +
        '<div data-act="cancel" style="text-align:center;padding:16px;font-size:13px;color:#999;letter-spacing:2px;cursor:pointer">取 消</div>' +
      '</div>';
    document.body.appendChild(layer);
    layer.addEventListener('click', function(e){
      if(e.target === layer){ layer.remove(); return; }
      var el = e.target.closest('[data-act]');
      if(!el) return;
      var act = el.dataset.act;
      layer.remove();
      if(act === 'cancel') return;
      __pendingImportMode = act;
      pickImport();
    });
  }

  function pickImport(){
    try {
      var active = document.activeElement;
      if(active && (active.tagName === 'TEXTAREA' || active.tagName === 'INPUT')) { active.blur(); }
      document.querySelectorAll('.screen, .modal').forEach(function(el){ el.classList.remove('show', 'on'); });
    } catch(e) {}
    var f = document.getElementById('bkImportFile');
    if(f){ f.value = ''; f.click(); }
  }

  /* 隐藏文件选择器：change 事件 */
  function bindFileInput(){
    var f = document.getElementById('bkImportFile');
    if(!f || f._bkBound) return;
    f._bkBound = true;
    f.addEventListener('change', function(){
      var file = this.files && this.files[0];
      this.value = '';
      if(file) importFromFile(file);
    });
  }
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', bindFileInput);
  }else{
    bindFileInput();
  }

  window.ChocoBackup = {
    exportAll: exportAll,
    importFromFile: importFromFile,
    pickImport: pickImport,
    showExportPicker: showExportPicker,
    showImportPicker: showImportPicker
  };
})();
