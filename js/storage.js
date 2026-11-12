(function(){
  if(window.__storagePageReady) return;
  window.__storagePageReady = true;

  var ORDER = ['聊天记录','表情图','语音','字卡','头像背景','其它设置'];
  var LIMIT_BYTES = 5 * 1024 * 1024;

  var __enc = (function(){
    try{ if(window.TextEncoder) return new TextEncoder(); }catch(e){}
    return null;
  })();
  function bytesOf(str){
    if(!str) return 0;
    try{
      if(__enc) return __enc.encode(str).length;
    }catch(e){}
    return str.length * 2;
  }

  function fmtSize(b){
    if(b < 1024) return b + ' B';
    if(b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
    return (b / 1024 / 1024).toFixed(2) + ' MB';
  }

  function scanLocalStorage(cb){
    var buckets = {};
    ORDER.forEach(function(k){ buckets[k] = 0; });
    var keys = [];
    try{
      for(var i = 0; i < localStorage.length; i++){
        var k = localStorage.key(i);
        if(k) keys.push(k);
      }
    }catch(e){ console.warn('[storage] 取键失败', e); cb(buckets); return; }
    var idx = 0;
    function step(){
      if(idx >= keys.length){ cb(buckets); return; }
      var k = keys[idx++];
      var v = '';
      try{ v = localStorage.getItem(k) || ''; }catch(e){ v = ''; }
      var size = bytesOf(k) + bytesOf(v);
      var label = '其它设置';
      if(k.indexOf('mj_msgs_') === 0 || k.indexOf('mj_group_msgs_') === 0){
        label = '聊天记录';
      } else if(k.indexOf('mj_sticker_store') === 0){
        label = '表情图';
      } else if(k.indexOf('mj_voice_lib') === 0 || k.indexOf('mj_video_lib') === 0){
        label = '语音';
      } else if(k.indexOf('mj_card_groups') === 0 || k.indexOf('mj_card_trash') === 0 || k.indexOf('mj_builtin_card') === 0){
        label = '字卡';
      } else if(k.indexOf('bg_') === 0 || k.indexOf('tarot_') === 0 || k.indexOf('drawer_bg_') === 0 || k.indexOf('mybg_') === 0 || k.indexOf('mycardbg_') === 0 || k.indexOf('myfont_') === 0){
        label = '头像背景';
      }
      buckets[label] = (buckets[label] || 0) + size;
      setTimeout(step, 0);
    }
    step();
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
    scanLocalStorage(function(local){
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
        '<div style="margin-top:24px; padding:0 2px 20px; display:flex; flex-direction:column; gap:10px;">' +
          '<button id="btnMigrateImages" type="button" style="width:100%;padding:15px;border-radius:14px;border:none;background:var(--th-text);color:var(--th-bg1);font-size:13.5px;letter-spacing:2px;font-family:inherit;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,.1);">' +
            '把老的贴图搬到 IndexedDB (腾 localStorage)' +
          '</button>' +
          '<button id="btnMigrateMsgs" type="button" style="width:100%;padding:15px;border-radius:14px;border:none;background:var(--th-text);color:var(--th-bg1);font-size:13.5px;letter-spacing:2px;font-family:inherit;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,.1);">' +
            '把聊天记录搬到 IndexedDB (腾出空间)' +
          '</button>' +
          '<div style="text-align:center;font-size:11px;color:#bbb;margin-top:12px;line-height:1.6;letter-spacing:.5px;">' +
            '如果点了搬家发现聊天记录空了，点下面的「搬回本地」即可恢复。' +
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
    });
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

  var __stgScanToken = 0;
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
          '<div style="padding:0 22px 24px;">' +
            '<button id="btnRestoreMsgs" type="button" style="width:100%;padding:15px;border-radius:14px;border:0.7px solid #1a1a1a;background:transparent;color:#1a1a1a;font-size:13.5px;letter-spacing:2px;font-family:inherit;cursor:pointer;">把聊天记录搬回本地 (找回记录)</button>' +
          '</div>' +
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

  /* ============================================================
     ★ 新增：聊天记录搬回本地（找回丢失数据）
     ============================================================ */
  function restoreMsgsFromIdb(){
    if(!window.__idb || !window.__msgIdb){
      if(typeof toast === 'function') toast('底层数据库未加载，请刷新网页重试');
      return;
    }
    
    if(typeof uniConfirm === 'function'){
      uniConfirm({
        title: '找回聊天记录',
        body: '把你之前搬到 IndexedDB 的聊天记录找回来，重新放到本地。确定要找吗？',
        okText: '开始找回',
        cancelText: '取 消'
      }).then(function(ok){ if(ok) doRestore(); });
    } else {
      if(confirm('要把之前搬到 IndexedDB 的聊天记录找回来吗？')) doRestore();
    }
  }

  function doRestore(){
    if(typeof toast === 'function') toast('正在寻找搬走的聊天记录…');
    
    window.__idb.keys().then(function(keys){
      var targetKeys = (keys || []).filter(function(k){ return k.indexOf('mj_msgs_') === 0; });
      if(!targetKeys.length){
        if(typeof toast === 'function') toast('没找到搬走的记录，可能被系统彻底清除了');
        return;
      }

      var count = 0;
      var pending = targetKeys.length;

      targetKeys.forEach(function(k){
        window.__msgIdb.get(k, function(arr){
          if(Array.isArray(arr) && arr.length > 0){
            try{
              localStorage.setItem(k, JSON.stringify(arr));
              localStorage.setItem('mj_idb_' + k, '1');
              count++;
            }catch(e){
              console.error('写回本地失败', k, e);
            }
          }
          pending--;
          if(pending === 0){
            if(count > 0){
              if(typeof toast === 'function') toast('成功找回了 ' + count + ' 个角色的记录，即将刷新…');
              setTimeout(function(){ location.reload(); }, 1000);
            } else {
              if(typeof toast === 'function') toast('数据都在，但已经是空记录，无法恢复');
            }
          }
        });
      });
    }).catch(function(e){
      console.error('[找回聊天记录] 失败', e);
      if(typeof toast === 'function') toast('找回失败：' + e.message);
    });
  }

 

  /* ============================================================
     ★ 新增：把老的贴图搬到 IndexedDB（腾出 localStorage 空间）
     ============================================================ */
  function migrateImagesToIdb(){
    var idb = window.__idb;
    if(!idb || typeof idb.keys !== 'function'){
      if(typeof toast === 'function') toast('当前环境不支持搬家');
      return;
    }
    
    if(typeof uniConfirm !== 'function'){
      if(!confirm('确定要把本地旧图片搬进 IndexedDB 吗？\n\n这会腾出很多手机空间，防止聊天记录存不下。')) return;
      doMigrate();
      return;
    }

    uniConfirm({
      title: '贴图搬家',
      body: '把原本存在文字库里的图片，搬进图片库（IndexedDB）。\n\n能腾出大量空间，防止新消息发不出去，确定要搬吗？',
      okText: '开始搬家',
      cancelText: '取 消'
    }).then(function(ok){
      if(ok) doMigrate();
    });
  }

  function doMigrate(){
    if(typeof toast === 'function') toast('正在搬运图片，请稍候…');
    var changedCount = 0;
    
    function toBlob(dataUrl){
      try{
        var parts = dataUrl.split(',');
        var mime = (parts[0].match(/:(.*?);/) || [])[1] || 'image/jpeg';
        var bin = atob(parts[1]);
        var len = bin.length;
        var arr = new Uint8Array(len);
        for(var i = 0; i < len; i++) arr[i] = bin.charCodeAt(i);
        return new Blob([arr], { type: mime });
      }catch(e){ return null; }
    }

    function processStorageValue(key, valStr){
      if(!valStr || valStr.indexOf('data:image/') < 0) return valStr;
      
      try{
        var data = JSON.parse(valStr);
        var modified = false;
        
        function walk(obj){
          if(!obj) return;
          if(Array.isArray(obj)){
            obj.forEach(walk);
            return;
          }
          if(typeof obj === 'object'){
            Object.keys(obj).forEach(function(k){
              var v = obj[k];
              if(typeof v === 'string' && v.indexOf('data:image/') === 0){
                // 生成一个唯一的 idb key
                var idbKey = 'mig_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,6);
                var blob = toBlob(v);
                if(blob){
                  window.__idb.set(idbKey, blob).then(function(){
                    changedCount++;
                  }).catch(function(){});
                  obj[k] = 'idb:' + idbKey;
                  modified = true;
                }
              } else if(typeof v === 'object'){
                walk(v);
              }
            });
          }
        }
        
        walk(data);
        if(modified){
          return JSON.stringify(data);
        }
      }catch(e){}
      return valStr;
    }

    try{
      for(var i = 0; i < localStorage.length; i++){
        var k = localStorage.key(i);
        if(!k) continue;
        if(k.indexOf('mj_') === 0){
          var v = localStorage.getItem(k);
          var newV = processStorageValue(k, v);
          if(newV !== v){
            localStorage.setItem(k, newV);
          }
        }
      }
      
      setTimeout(function(){
        if(typeof toast === 'function') toast('搬家完成，处理了 ' + changedCount + ' 张图片');
        if(typeof render === 'function') render();
      }, 1500);
      
    }catch(e){
      console.error('[搬家] 失败', e);
      if(typeof toast === 'function') toast('搬家出错，可能空间不够');
    }
  }

 

  /* ============================================================
     ★ 新增：把聊天记录搬到 IndexedDB（腾出 5MB 限制）
     ============================================================ */
 

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