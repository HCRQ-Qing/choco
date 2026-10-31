/* ============================================================
   背单词功能
   - 单词 / 句子字卡，混入普通字卡池随机出现
   - 英语气泡样式，点击播放发音 + 查看详情
   - Web Speech API 发音
   ============================================================ */
(function(){
  if(document.getElementById('wordsScreenStyle')) return;

  var WORDS_KEY = 'mj_words_v1';
  /* 单词以小概率出现，避免刷屏 */
  var WORD_APPEAR_RATE = 0.12;

  function getWords(){
    try{
      var raw = localStorage.getItem(WORDS_KEY);
      if(!raw) return [];
      var a = JSON.parse(raw);
      return Array.isArray(a) ? a : [];
    }catch(e){ return []; }
  }
  function saveWords(arr){
    try{ localStorage.setItem(WORDS_KEY, JSON.stringify(arr)); }catch(e){}
  }
  function uid(){ return 'w' + Date.now().toString(36) + Math.random().toString(36).slice(2,6); }

  window.getWordById = function(id){
    return getWords().find(function(w){ return w.id === id; }) || null;
  };

  /* 单词字卡池：以一定概率返回一条标记，混入普通字卡 */
  window._getWordPool = function(){
    var arr = getWords();
    if(!arr.length) return [];
    if(Math.random() > WORD_APPEAR_RATE) return [];
    var w = arr[Math.floor(Math.random()*arr.length)];
    return ['{{WORD:' + w.id + '}}'];
  };

  /* CSS */
  var st = document.createElement('style');
  st.id = 'wordsScreenStyle';
  st.textContent = [
    /* 单词气泡 */
    '.word-bubble{background:linear-gradient(135deg,#eef4ff,#e8f0fe) !important;color:#1a365d !important;',
      'border:0.7px solid #c7d8f0 !important;border-radius:14px !important;padding:12px 14px !important;',
      'max-width:78% !important;cursor:pointer;position:relative;',
      'font-family:"Segoe UI",Roboto,"PingFang SC",sans-serif !important}',
    '.word-bubble .wb-tag{display:inline-block;font-size:9px;letter-spacing:2px;color:#5b8def;',
      'background:#dce8fb;border-radius:4px;padding:1px 7px;margin-bottom:8px;font-weight:600}',
    '.word-bubble .wb-main{font-size:17px;font-weight:600;color:#1a365d;letter-spacing:.5px;line-height:1.4}',
    '.word-bubble .wb-phon{font-size:12px;color:#7a8aa8;margin-top:3px;font-family:Georgia,serif}',
    '.word-bubble .wb-sub{font-size:13px;color:#4a6080;margin-top:6px;line-height:1.5}',
    '.word-bubble .wb-ex{font-size:12px;color:#6b7fa0;margin-top:8px;line-height:1.6;font-style:italic;border-top:0.5px dashed #c7d8f0;padding-top:7px}',
    '.word-bubble .wb-hint{font-size:10px;color:#9bb0d0;margin-top:8px;text-align:right;letter-spacing:1px}',

    /* 背单词页 */
    '#wordsScreen{position:fixed;inset:0;z-index:1300;max-width:520px;margin:0 auto;background:#f7f9fc;display:none;flex-direction:column;font-family:"Songti SC","STSong","SimSun",serif;color:#1a1a1a}',
    '#wordsScreen.on{display:flex}',
    '#wordsScreen .w-top{flex:none;display:flex;align-items:center;padding:20px 22px 10px}',
    '#wordsScreen .w-back{width:36px;height:36px;border:none;background:transparent;font-size:24px;color:#1a1a1a;cursor:pointer;opacity:.5;font-family:inherit;padding:0 0 4px}',
    '#wordsScreen .w-title{flex:1;text-align:center;font-size:15px;font-weight:300;letter-spacing:8px}',
    '#wordsScreen .w-add{width:36px;height:36px;border:none;background:transparent;font-size:22px;color:#1a1a1a;cursor:pointer;opacity:.5}',
    '#wordsScreen .w-stats{flex:none;padding:6px 22px 14px;display:flex;gap:10px}',
    '#wordsScreen .w-stat{flex:1;background:#fff;border-radius:12px;padding:12px;text-align:center;box-shadow:0 1px 6px rgba(0,0,0,.04)}',
    '#wordsScreen .w-stat-v{font-size:20px;font-weight:700;color:#5b8def}',
    '#wordsScreen .w-stat-l{font-size:10px;color:#999;letter-spacing:2px;margin-top:3px}',
    '#wordsScreen .w-tabs{flex:none;display:flex;gap:8px;padding:0 22px 12px}',
    '#wordsScreen .w-tab{padding:6px 16px;font-size:12px;color:#999;background:#fff;border:0.7px solid #eee;border-radius:14px;cursor:pointer;font-family:inherit;letter-spacing:2px}',
    '#wordsScreen .w-tab.on{color:#fff;background:#5b8def;border-color:#5b8def}',
    '#wordsScreen .w-list{flex:1;overflow-y:auto;padding:0 22px 30px;scrollbar-width:none}',
    '#wordsScreen .w-list::-webkit-scrollbar{display:none}',
    '#wordsScreen .w-card{background:#fff;border-radius:14px;padding:14px 16px;margin-bottom:10px;box-shadow:0 1px 6px rgba(0,0,0,.04);border:0.7px solid #eef1f5}',
    '#wordsScreen .w-card .wc-main{font-size:17px;font-weight:600;color:#1a365d;font-family:"Segoe UI",Roboto,sans-serif}',
    '#wordsScreen .w-card .wc-phon{font-size:12px;color:#8899b5;margin-top:2px;font-family:Georgia,serif}',
    '#wordsScreen .w-card .wc-mean{font-size:13px;color:#556680;margin-top:6px;line-height:1.5}',
    '#wordsScreen .w-card .wc-ex{font-size:12px;color:#8899b5;margin-top:7px;line-height:1.6;font-style:italic;border-top:0.5px dashed #e0e6f0;padding-top:7px}',
    '#wordsScreen .w-card .wc-acts{display:flex;gap:14px;margin-top:10px;padding-top:10px;border-top:0.5px solid #f0f2f5}',
    '#wordsScreen .w-card .wc-btn{font-size:12px;color:#5b8def;cursor:pointer;background:none;border:none;padding:0;font-family:inherit;letter-spacing:1px}',
    '#wordsScreen .w-card .wc-btn.del{color:#e57373}',
    '#wordsScreen .w-empty{text-align:center;color:#bbb;font-size:13px;padding:80px 20px;line-height:2;letter-spacing:1px}',

    /* 单词详情弹窗 */
    '#wordDetail{position:fixed;inset:0;z-index:1600;background:rgba(0,0,0,.5);display:none;align-items:center;justify-content:center;padding:24px}',
    '#wordDetail.show{display:flex}',
    '#wordDetail .wd-card{background:#fff;border-radius:20px;padding:26px 22px;max-width:380px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.3)}',
    '#wordDetail .wd-tag{display:inline-block;font-size:10px;letter-spacing:3px;color:#fff;background:#5b8def;border-radius:6px;padding:2px 10px;margin-bottom:14px}',
    '#wordDetail .wd-word{font-size:28px;font-weight:700;color:#1a365d;font-family:"Segoe UI",Roboto,sans-serif;line-height:1.3}',
    '#wordDetail .wd-phon{font-size:14px;color:#8899b5;margin-top:6px;font-family:Georgia,serif}',
    '#wordDetail .wd-mean{font-size:15px;color:#445570;margin-top:16px;line-height:1.6}',
    '#wordDetail .wd-ex{font-size:13px;color:#6b7fa0;margin-top:14px;line-height:1.7;font-style:italic;border-top:0.5px dashed #d0daec;padding-top:12px}',
    '#wordDetail .wd-ex-en{color:#5b8def;font-style:normal;font-weight:600}',
    '#wordDetail .wd-acts{display:flex;gap:12px;margin-top:22px}',
    '#wordDetail .wd-btn{flex:1;padding:12px;border-radius:12px;border:none;font-size:13px;letter-spacing:3px;cursor:pointer;font-family:inherit}',
    '#wordDetail .wd-btn.play{background:#5b8def;color:#fff}',
    '#wordDetail .wd-btn.close{background:#f0f2f5;color:#666}'
  ].join('');
  document.head.appendChild(st);

  /* 背单词页 HTML */
  var scr = document.createElement('div');
  scr.id = 'wordsScreen';
  scr.className = 'screen';
  scr.innerHTML =
    '<div class="w-top">' +
      '<button class="w-back" id="wBack">‹</button>' +
      '<div class="w-title">背 单 词</div>' +
      '<button class="w-add" id="wAdd" title="添加">＋</button>' +
    '</div>' +
    '<div class="w-stats">' +
      '<div class="w-stat"><div class="w-stat-v" id="wTotal">0</div><div class="w-stat-l">TOTAL</div></div>' +
      '<div class="w-stat"><div class="w-stat-v" id="wWordCount">0</div><div class="w-stat-l">WORDS</div></div>' +
      '<div class="w-stat"><div class="w-stat-v" id="wSentCount">0</div><div class="w-stat-l">SENTENCES</div></div>' +
    '</div>' +
    '<div class="w-tabs">' +
      '<button class="w-tab on" data-t="all">全部</button>' +
      '<button class="w-tab" data-t="word">单词</button>' +
      '<button class="w-tab" data-t="sentence">句子</button>' +
    '</div>' +
    '<div class="w-list" id="wList"></div>';
  document.body.appendChild(scr);

  var wFilter = 'all';

  function renderWords(){
    var arr = getWords();
    var filtered = arr.filter(function(w){ return wFilter==='all' || w.type===wFilter; });
    var list = document.getElementById('wList');
    document.getElementById('wTotal').textContent = arr.length;
    document.getElementById('wWordCount').textContent = arr.filter(function(w){return w.type==='word';}).length;
    document.getElementById('wSentCount').textContent = arr.filter(function(w){return w.type==='sentence';}).length;
    if(!list) return;
    if(!filtered.length){
      list.innerHTML = '<div class="w-empty">还没有单词<br>点右上角 ＋ 添加单词或句子<br>它们会随机出现在聊天里</div>';
      return;
    }
    list.innerHTML = filtered.map(function(w){
      return '<div class="w-card" data-id="' + w.id + '">' +
        '<div class="wc-main">' + escapeHTML(w.word) + '</div>' +
        (w.phonetic ? '<div class="wc-phon">/' + escapeHTML(w.phonetic) + '/</div>' : '') +
        (w.meaning ? '<div class="wc-mean">' + escapeHTML(w.meaning) + '</div>' : '') +
        (w.example ? '<div class="wc-ex">📖 ' + escapeHTML(w.example) + '</div>' : '') +
        '<div class="wc-acts">' +
          '<button class="wc-btn" data-play="' + w.id + '">🔊 发音</button>' +
          '<button class="wc-btn del" data-del="' + w.id + '">删除</button>' +
        '</div>' +
      '</div>';
    }).join('');
    list.querySelectorAll('[data-play]').forEach(function(b){
      b.onclick = function(e){ e.stopPropagation(); speakWord(b.dataset.play); };
    });
    list.querySelectorAll('[data-del]').forEach(function(b){
      b.onclick = function(e){
        e.stopPropagation();
        var id = b.dataset.del;
        var arr2 = getWords().filter(function(w){ return w.id !== id; });
        saveWords(arr2);
        renderWords();
        if(window.toast) toast('已删除');
      };
    });
  }

  function escapeHTML(s){
    return String(s).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  /* 发音：Web Speech API */
  function speakWord(id){
    var w = getWordById(id);
    if(!w) return;
    if(!('speechSynthesis' in window)){
      if(window.toast) toast('当前浏览器不支持发音');
      return;
    }
    try{
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(w.word);
      u.lang = 'en-US';
      u.rate = 0.9;
      window.speechSynthesis.speak(u);
    }catch(e){
      if(window.toast) toast('发音失败');
    }
  }
  window.speakWord = speakWord;

  /* 点击聊天里的单词气泡 → 详情 + 发音 */
  document.addEventListener('click', function(e){
    var wb = e.target.closest && e.target.closest('.word-bubble');
    if(!wb) return;
    e.stopPropagation();
    var id = wb.dataset.wordId;
    var w = getWordById(id);
    if(!w) return;
    showWordDetail(w);
    speakWord(id);
  }, true);

  /* 详情弹窗 */
  var det = document.createElement('div');
  det.id = 'wordDetail';
  det.innerHTML = '<div class="wd-card">' +
    '<span class="wd-tag" id="wdTag">单词</span>' +
    '<div class="wd-word" id="wdWord"></div>' +
    '<div class="wd-phon" id="wdPhon"></div>' +
    '<div class="wd-mean" id="wdMean"></div>' +
    '<div class="wd-ex" id="wdEx"></div>' +
    '<div class="wd-acts">' +
      '<button class="wd-btn play" id="wdPlay">🔊 再听一次</button>' +
      '<button class="wd-btn close" id="wdClose">关 闭</button>' +
    '</div>' +
  '</div>';
  document.body.appendChild(det);
  var curWordId = '';
  function showWordDetail(w){
    curWordId = w.id;
    document.getElementById('wdTag').textContent = w.type === 'sentence' ? '句 子' : '单 词';
    document.getElementById('wdWord').textContent = w.word || '';
    document.getElementById('wdPhon').textContent = w.phonetic ? '/' + w.phonetic + '/' : '';
    document.getElementById('wdMean').textContent = w.meaning || '';
    document.getElementById('wdEx').innerHTML = w.example
      ? '<span class="wd-ex-en">' + escapeHTML(w.example) + '</span>' + (w.exampleTrans ? '<br>' + escapeHTML(w.exampleTrans) : '')
      : '';
    det.classList.add('show');
  }
  det.querySelector('#wdClose').onclick = function(){ det.classList.remove('show'); };
  det.querySelector('#wdPlay').onclick = function(){ speakWord(curWordId); };
  det.addEventListener('click', function(e){ if(e.target === det) det.classList.remove('show'); });

  /* 添加单词弹窗 */
  var addMask = document.createElement('div');
  addMask.style.cssText = 'position:fixed;inset:0;z-index:1700;background:rgba(0,0,0,.5);display:none;align-items:center;justify-content:center;padding:20px';
  addMask.innerHTML = '<div style="background:#fff;border-radius:18px;padding:24px 22px;max-width:380px;width:100%;max-height:86vh;overflow-y:auto">' +
    '<div style="font-size:15px;letter-spacing:4px;text-align:center;margin-bottom:18px;color:#1a1a1a">添 加 字 卡</div>' +
    '<div style="display:flex;gap:8px;margin-bottom:16px">' +
      '<button class="wtab-btn" data-type="word" style="flex:1;padding:8px;border-radius:10px;border:0.7px solid #5b8def;background:#5b8def;color:#fff;font-family:inherit;cursor:pointer">单词</button>' +
      '<button class="wtab-btn" data-type="sentence" style="flex:1;padding:8px;border-radius:10px;border:0.7px solid #ddd;background:#fff;color:#999;font-family:inherit;cursor:pointer">句子</button>' +
    '</div>' +
    '<label style="font-size:11px;color:#999;letter-spacing:1px">英文' + (false?'':' / 句子') + '</label>' +
    '<input id="wInWord" style="width:100%;border:none;border-bottom:0.7px solid #eee;padding:8px 2px;font-size:15px;font-family:inherit;outline:none;margin-bottom:14px" placeholder="apple">' +
    '<label style="font-size:11px;color:#999;letter-spacing:1px">音标（可选）</label>' +
    '<input id="wInPhon" style="width:100%;border:none;border-bottom:0.7px solid #eee;padding:8px 2px;font-size:13px;font-family:Georgia,serif;outline:none;margin-bottom:14px" placeholder="ˈæp.əl">' +
    '<label style="font-size:11px;color:#999;letter-spacing:1px">中文释义</label>' +
    '<input id="wInMean" style="width:100%;border:none;border-bottom:0.7px solid #eee;padding:8px 2px;font-size:14px;font-family:inherit;outline:none;margin-bottom:14px" placeholder="苹果">' +
    '<label style="font-size:11px;color:#999;letter-spacing:1px">例句（可选）</label>' +
    '<input id="wInEx" style="width:100%;border:none;border-bottom:0.7px solid #eee;padding:8px 2px;font-size:13px;font-family:inherit;outline:none;margin-bottom:6px" placeholder="I eat an apple every day.">' +
    '<div style="display:flex;gap:10px;margin-top:20px">' +
      '<button id="wCancel" style="flex:1;padding:11px;border-radius:12px;border:0.7px solid #ddd;background:#fff;color:#666;font-family:inherit;cursor:pointer;letter-spacing:2px">取 消</button>' +
      '<button id="wOk" style="flex:1;padding:11px;border-radius:12px;border:none;background:#5b8def;color:#fff;font-family:inherit;cursor:pointer;letter-spacing:2px">保 存</button>' +
    '</div>' +
  '</div>';
  document.body.appendChild(addMask);

  var addType = 'word';
  addMask.querySelectorAll('.wtab-btn').forEach(function(b){
    b.onclick = function(){
      addType = b.dataset.type;
      addMask.querySelectorAll('.wtab-btn').forEach(function(x){
        if(x === b){ x.style.background = '#5b8def'; x.style.color = '#fff'; x.style.borderColor = '#5b8def'; }
        else { x.style.background = '#fff'; x.style.color = '#999'; x.style.borderColor = '#ddd'; }
      });
    };
  });
  addMask.querySelector('#wCancel').onclick = function(){ addMask.style.display = 'none'; };
  addMask.querySelector('#wOk').onclick = function(){
    var word = addMask.querySelector('#wInWord').value.trim();
    if(!word){ if(window.toast) toast('请输入英文'); return; }
    var w = {
      id: uid(),
      type: addType,
      word: word,
      phonetic: addMask.querySelector('#wInPhon').value.trim(),
      meaning: addMask.querySelector('#wInMean').value.trim(),
      example: addMask.querySelector('#wInEx').value.trim()
    };
    var arr = getWords();
    arr.push(w);
    saveWords(arr);
    addMask.querySelector('#wInWord').value = '';
    addMask.querySelector('#wInPhon').value = '';
    addMask.querySelector('#wInMean').value = '';
    addMask.querySelector('#wInEx').value = '';
    addMask.style.display = 'none';
    renderWords();
    if(window.toast) toast('已添加');
  };
  addMask.addEventListener('click', function(e){ if(e.target === addMask) addMask.style.display = 'none'; });

  scr.querySelector('#wBack').onclick = function(){ window.closeWordsScreen(); };
  scr.querySelector('#wAdd').onclick = function(){ addMask.style.display = 'flex'; };
  scr.querySelectorAll('.w-tab').forEach(function(t){
    t.onclick = function(){
      wFilter = t.dataset.t;
      scr.querySelectorAll('.w-tab').forEach(function(x){ x.classList.toggle('on', x===t); });
      renderWords();
    };
  });

  window.openWordsScreen = function(){
    renderWords();
    if(window.__deskMode && typeof openDeskFeature === 'function'){
      openDeskFeature('wordsScreen');
    } else {
      document.querySelectorAll('.screen.on').forEach(function(s){ s.classList.remove('on'); });
      scr.classList.add('on');
    }
  };

  window.closeWordsScreen = function(){
    var inDesk = scr.classList.contains('in-desk') || (scr.parentNode && scr.parentNode.id === 'page-desk');
    if(inDesk && typeof closeDeskFeature === 'function'){ closeDeskFeature(); return; }
    scr.classList.remove('on');
  };

  /* 给功能页加「背单词」入口（如果存在 desk） */
  function addDeskEntry(){
    var grid = document.querySelector('#page-desk .desk-grid');
    if(!grid || grid.querySelector('[data-open="words"]')) return;
    var entry = document.createElement('div');
    entry.className = 'desk-app';
    entry.dataset.open = 'words';
    entry.innerHTML = '<div class="da-ic"><svg viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg></div><div class="da-name">背单词</div>';
    grid.appendChild(entry);
    if(typeof bindDeskApps === 'function'){
      entry.addEventListener('click', function(){
        window.__deskMode = true;
        if(typeof openWordsScreen === 'function') openWordsScreen();
      });
    }
  }
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', addDeskEntry);
  } else {
    addDeskEntry();
  }
})();
