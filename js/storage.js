(function(){
  if(window.__storagePageReady) return;
  window.__storagePageReady = true;

  var PREFIX_MAP = [
    { key:'mj_msgs_',           label:'聊天记录' },
    { key:'mj_group_msgs_',     label:'聊天记录' },
    { key:'mj_sticker_store',   label:'表情图' },
    { key:'mj_voice_lib',       label:'语音' },
    { key:'mj_video_lib',       label:'语音' },
    { key:'mj_card_groups',     label:'字卡' },
    { key:'mj_card_trash',      label:'字卡' },
    { key:'mj_builtin_card',    label:'字卡' }
  ];

  var ORDER = ['聊天记录','表情图','语音','字卡','头像背景','其它设置'];
  var LIMIT_BYTES = 5 * 1024 * 1024;

  function bytesOf(str){
    if(!str) return 0;
    try{
      if(window.TextEncoder) return new TextEncoder().encode(str).length;
    }catch(e){}
    return str.length * 2;
  }

  function fmtSize(b){
    if(b < 1024) return b + ' B';
    if(b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
    return (b / 1024 / 1024).toFixed(2) + ' MB';
  }

  function scanLocalStorage(){
    var buckets = {};
    ORDER.forEach(function(k){ buckets[k] = 0; });
    try{
      for(var i = 0; i < localStorage.length; i++){
        var k = localStorage.key(i);
        if(!k) continue;
        var v = '';
        try{ v = localStorage.getItem(k) || ''; }catch(e){ v = ''; }
        var size = bytesOf(k) + bytesOf(v);
        var label = '';
        for(var j = 0; j < PREFIX_MAP.length; j++){
          if(k.indexOf(PREFIX_MAP[j].key) === 0){ label = PREFIX_MAP[j].label; break; }
        }
        if(!label){
          if(k.indexOf('bg_') === 0 || k.indexOf('tarot_') === 0 || k.indexOf('drawer_bg_') === 0 || k.indexOf('mybg_') === 0 || k.indexOf('mycardbg_') === 0 || k.indexOf('myfont_') === 0){
            label = '头像背景';
          } else {
            label = '其它设置';
          }
        }
        buckets[label] = (buckets[label] || 0) + size;
      }
    }catch(e){ console.warn('[storage] 扫描失败', e); }
    return buckets;
  }

  function scanIDB(cb){
    var result = { 头像背景: 0, 语音: 0, 表情图: 0 };
    var idb = window.__idb;
    if(!idb || typeof idb.keys !== 'function'){ cb(result); return; }
    idb.keys().then(function(keys){
      if(!Array.isArray(keys)){ cb(result); return; }
      var idx = 0;
      function next(){
        if(idx >= keys.length){ cb(result); return; }
        var k = keys[idx++];
        var label = '';
        if(k.indexOf('tarot_') === 0 || k.indexOf('gavatar_') === 0 || k.indexOf('mybg_') === 0 || k.indexOf('mycardbg_') === 0 || k.indexOf('myfont_') === 0 || k.indexOf('bg_') === 0 || k.indexOf('drawer_bg_') === 0 || k.indexOf('chatbg_') === 0 || k.indexOf('watchbg_') === 0){
          label = '头像背景';
        } else if(k.indexOf('voice_') === 0 || k.indexOf('rec_') === 0 || k.indexOf('video_') === 0){
          label = '语音';
        } else if(k.indexOf('sticker') === 0){
          label = '表情图';
        }
        if(!label){ next(); return; }
        idb.get(k).then(function(v){
          var size = 0;
          try{
            if(v && typeof v.size === 'number') size = v.size;
            else if(v && v.byteLength) size = v.byteLength;
            else if(typeof v === 'string') size = bytesOf(v);
            else if(v) size = 1024;
          }catch(e){ size = 1024; }
          result[label] = (result[label] || 0) + size;
          next();
        }).catch(function(){ next(); });
      }
      next();
    }).catch(function(){ cb(result); });
  }

  function render(){
    var box = document.getElementById('storageBody');
    if(!box) return;
    var local = scanLocalStorage();
    scanIDB(function(idb){
      var merged = {};
      ORDER.forEach(function(k){ merged[k] = (local[k] || 0) + (idb[k] || 0); });
      var total = 0;
      ORDER.forEach(function(k){ total += merged[k]; });
      var pct = Math.min(100, (total / LIMIT_BYTES) * 100);

      var localTotal = 0;
      var idbTotal = 0;
      var rowsHTML = ORDER.map(function(k){
        var lb = local[k] || 0;
        var ib = idb[k] || 0;
        localTotal += lb;
        idbTotal += ib;
        var b = lb + ib;
        var barPct = total > 0 ? (b / total * 100) : 0;
        return '<div class="stg-row">' +
          '<div class="stg-name">' + k + '</div>' +
          '<div class="stg-bar"><div class="stg-bar-fill" style="width:' + barPct.toFixed(1) + '%"></div></div>' +
          '<div class="stg-size">' + fmtSize(b) + '</div>' +
        '</div>';
      }).join('');

      var localPct = Math.min(100, (localTotal / LIMIT_BYTES) * 100);
      var localColor = localPct > 90 ? '#DD1440' : (localPct > 70 ? '#E68A00' : 'var(--th-text)');

      var btnHTML = 
        '<div style="margin-top:24px; padding:0 2px 20px;">' +
          '<button id="btnCleanOrphan" type="button" style="width:100%;padding:15px;border-radius:14px;border:none;background:var(--th-text);color:var(--th-bg1);font-size:13.5px;letter-spacing:2px;font-family:inherit;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,.1);">' +
            '清 理 无 主 废 图' +
          '</button>' +
          '<div style="text-align:center;font-size:11px;color:#bbb;margin-top:12px;line-height:1.6;letter-spacing:.5px;">' +
            '将彻底删除已废弃的图片，释放手机空间。' +
          '</div>' +
        '</div>';

      box.innerHTML =
        '<div class="stg-card">' + rowsHTML + '</div>' +
        '<div class="stg-total">' +
          '<div class="stg-total-num">文字数据占用：<span style="color:' + localColor + '">' + fmtSize(localTotal) + ' / 约 5MB（占 ' + localPct.toFixed(1) + '%）</span></div>' +
          '<div class="stg-total-bar"><div class="stg-total-fill" style="width:' + localPct.toFixed(1) + '%; background:' + localColor + '"></div></div>' +
          '<div class="stg-total-num" style="margin-top:16px; font-size:12px; color:#999;">媒体文件（不占 5MB 限制）：' + fmtSize(idbTotal) + '</div>' +
          '<div class="stg-total-hint">只做查看，不做清理。文字数据满时，新消息将无法保存，请先导出备份。</div>' +
        '</div>' +
        btnHTML;

      var btn = document.getElementById('btnCleanOrphan');
      if(btn){
        btn.onclick = function(e){
          e.preventDefault();
          cleanOrphanImages();
        };
      }
    });
  }

  function injectStyle(){
    if(document.getElementById('storagePageStyle')) return;
    var st = document.createElement('style');
    st.id = 'storagePageStyle';
    st.textContent =
      '.stg-wrap{max-width:520px;margin:0 auto;width:100%;height:100%;display:flex;flex-direction:column;background:var(--th-bg1)}' +
      '.stg-body{flex:1;overflow-y:auto;padding:6px 22px 40px;scrollbar-width:none}' +
      '.stg-body::-webkit-scrollbar{display:none}' +
      '.stg-card{padding:6px 0}' +
      '.stg-row{display:flex;align-items:center;gap:10px;padding:13px 0;border-bottom:0.6px dashed var(--th-bubble-me)}' +
      '.stg-row:last-child{border-bottom:none}' +
      '.stg-name{width:80px;flex:none;font-size:13px;color:var(--th-text);letter-spacing:1px;font-weight:300}' +
      '.stg-bar{flex:1;height:6px;border-radius:3px;background:var(--th-accent-soft);overflow:hidden}' +
      '.stg-bar-fill{height:100%;background:var(--th-text);border-radius:3px;transition:width .3s}' +
      '.stg-size{width:80px;flex:none;text-align:right;font-size:11.5px;color:#bbb;font-family:Georgia,serif}' +
      '.stg-total{margin-top:18px;padding:16px 0 4px;border-top:0.6px dashed var(--th-bubble-me)}' +
      '.stg-total-num{font-size:14px;color:var(--th-text);letter-spacing:1px;font-weight:300;margin-bottom:10px}' +
      '.stg-total-bar{height:8px;border-radius:4px;background:var(--th-accent-soft);overflow:hidden}' +
      '.stg-total-fill{height:100%;background:var(--th-text);border-radius:4px;transition:width .3s}' +
      '.stg-total-hint{font-size:11px;color:#bbb;margin-top:10px;letter-spacing:.5px;line-height:1.6}';
    document.head.appendChild(st);
  }

  function openStorageScreen(){
    injectStyle();
    var old = document.getElementById('storageScreen');
    if(!old){
      old = document.createElement('div');
      old.className = 'screen';
      old.id = 'storageScreen';
      old.innerHTML =
        '<div class="stg-wrap">' +
          '<div id="utopHostStorage"></div>' +
          '<div id="storageBody" class="stg-body"></div>' +
        '</div>';
      document.body.appendChild(old);
    }
    if(typeof showScreen === 'function') showScreen('storageScreen');
    else old.classList.add('on');
    if(typeof renderTopBar === 'function'){
      renderTopBar({
        host: 'utopHostStorage',
        title: '存 储',
        onBack: function(){
          document.querySelectorAll('.screen.on').forEach(function(s){ s.classList.remove('on'); });
          if(typeof showScreen === 'function') showScreen('settingsScreen');
          else if(typeof goToPage === 'function') goToPage('me');
        }
      });
    }
    render();
  }

  document.addEventListener('click', function(e){
    var t = e.target;
    if(!t || !t.closest) return;
    var row = t.closest('.set-row[data-set="storage"]');
    if(!row) return;
    e.preventDefault();
    e.stopPropagation();
    openStorageScreen();
  }, true);

  window.openStorageScreen = openStorageScreen;

  function cleanOrphanImages(){
    var idb = window.__idb;
    if(!idb || typeof idb.keys !== 'function'){
      if(typeof toast === 'function') toast('当前环境不支持清理');
      return;
    }

    if(typeof uniConfirm !== 'function'){
      if(!confirm('确定要清理已废弃的图片吗？\n\n清理后无法恢复。')) return;
      doClean();
      return;
    }

    uniConfirm({
      title: '清理无主废图',
      body: '将彻底删除那些你已经从聊天或表情包里删掉、但还赖在手机里的废弃图片。\n\n清理后不可恢复，确定要清理吗？',
      okText: '确认清理',
      cancelText: '取 消'
    }).then(function(ok){
      if(ok) doClean();
    });
  }

  function doClean(){
    if(typeof toast === 'function') toast('正在排查废弃图片…');
    var idb = window.__idb;

    idb.keys().then(function(keys){
      var usedKeys = {};
      
      function markKey(str){
        if(typeof str !== 'string') return;
        if(str.indexOf('idb:') === 0){
          usedKeys[str.replace('idb:', '')] = 1;
        } else if(str.indexOf('mig_') === 0 || str.indexOf('tarot_') === 0 || str.indexOf('bg_') === 0 || str.indexOf('drawer_bg_') === 0 || str.indexOf('chatbg_') === 0 || str.indexOf('watchbg_') === 0 || str.indexOf('gavatar_') === 0 || str.indexOf('mybg_') === 0 || str.indexOf('mycardbg_') === 0 || str.indexOf('myfont_') === 0){
          usedKeys[str] = 1;
        }
      }

      function walk(obj){
        if(!obj) return;
        if(Array.isArray(obj)){
          obj.forEach(walk);
          return;
        }
        if(typeof obj === 'object'){
          Object.keys(obj).forEach(function(k){
            var v = obj[k];
            if(typeof v === 'string'){
              if(k === 'avatar' || k === 'voiceIdbKey' || k === 'imageIdbKey' || k === 'key' || k === 'sticker' || k === 'voice' || k === 'bg'){
                markKey(v);
              } else if(v.indexOf('idb:') === 0 || v.indexOf('voice_') === 0 || v.indexOf('msgimg_') === 0 || v.indexOf('tarot_') === 0 || v.indexOf('sticker_') === 0){
                markKey(v);
              }
            } else {
              walk(v);
            }
          });
        }
      }

      try{
        for(var i = 0; i < localStorage.length; i++){
          var k = localStorage.key(i);
          if(!k) continue;
          if(k.indexOf('mj_') === 0 || k.indexOf('xy-home-v2:') === 0){
            var v = localStorage.getItem(k);
            if(v){
              try{ walk(JSON.parse(v)); }catch(e){}
            }
          }
        }
      }catch(e){ console.warn('[清理] 读取本地记录失败', e); }

      var toDelete = [];
      keys.forEach(function(k){
        if(k.indexOf('mig_') === 0 || k.indexOf('tarot_') === 0 || k.indexOf('bg_') === 0 || k.indexOf('drawer_bg_') === 0 || k.indexOf('chatbg_') === 0 || k.indexOf('watchbg_') === 0 || k.indexOf('gavatar_') === 0 || k.indexOf('mybg_') === 0 || k.indexOf('mycardbg_') === 0 || k.indexOf('myfont_') === 0){
          if(!usedKeys[k]){
            toDelete.push(k);
          }
          return;
        }
        if(k.indexOf('voice_') === 0 || k.indexOf('rec_') === 0 || k.indexOf('video_') === 0 || k.indexOf('msgimg_') === 0 || k.indexOf('sticker_') === 0 || k.indexOf('chat_') === 0){
          if(!usedKeys[k]){
            toDelete.push(k);
          }
        }
      });

      if(!toDelete.length){
        if(typeof toast === 'function') toast('很干净，没有发现废弃图片');
        return;
      }

      var delCount = 0;
      var idx = 0;
      function nextDel(){
        if(idx >= toDelete.length){
          if(typeof toast === 'function') toast('已清理 ' + delCount + ' 张废弃图片，空间已释放');
          if(typeof render === 'function') render();
          return;
        }
        var k = toDelete[idx++];
        idb.del(k).then(function(){
          delCount++;
          if(idb.revokeURL) idb.revokeURL(k);
          nextDel();
        }).catch(function(){
          nextDel();
        });
      }
      nextDel();

    }).catch(function(e){
      console.error('[清理] 获取图片列表失败', e);
      if(typeof toast === 'function') toast('排查失败，请重试');
    });
  }

})();