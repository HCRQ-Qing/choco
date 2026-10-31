/* ============================================================
   写信 · LETTERS
   - 写一封信 → 直接作为一条「信件卡」消息发到聊天界面
   - 角色 1~30 分钟内回信（可在设置 / 写信页右上角调整）
   - 可设置「有概率不回信」「主动来信概率（默认 15%/小时）」
   - 收到信后可写「理解」，Ta 会给一个 1%~100% 的准确度判定
   - 写完理解可「存到回忆」，也可以「存本地相册」
   ============================================================ */
(function(){
  if(window.__lettersReady) return;
  window.__lettersReady = true;

  var CFG_KEY  = 'mj_letter_cfg_v1';
  var PEND_KEY = 'mj_letter_pending_v1';
  var LAST_KEY = 'mj_letter_last_v1';

  /* 默认：回信 1~30 分钟；10% 概率不回信；主动来信 15%/小时 */
  var DEFAULTS = {
    noReplyOn: true,
    noReplyRate: 10,     /* % */
    replyMin: 1,
    replyMax: 30,
    activeOn: true,
    activeRate: 15       /* % / 小时 */
  };

  var TITLES = [
    '写给最近的你', '见字如面', '今天想和你说说话', '一封很短的信',
    '夜里写的信', '把这一天寄给你', '想你了，所以写信', '一封没有主题的信',
    '风把话吹到你那里', '写在告别之前'
  ];
  var OPENS = [
    '见字如面。', '展信安。', '提笔的时候，窗外的光刚好落下来。', '不知道你现在在做什么。',
    '这封信写得很慢。'
  ];
  var BODIES = [
    '今天过得有点慢，从早到晚都在等一个合适的时机，把想说的话整理成句子。',
    '我最近总是想起一些很小的事，比如你说过的一句话，或者那天我们聊到很晚。',
    '有些话打字说出来太轻了，写在纸上好像才够认真。',
    '日子一天天过去，我把想你的部分单独收起来，留到写这封信的时候。',
    '如果此刻你也刚好在想我，那这封信就不算迟到。',
    '我不太会写很长的话，但每一句都是真的。',
    '希望你今天吃饱了，也睡得好，不要总是硬撑。',
    '我把今天的天气、心情，还有一点点想念，一起装进这个信封里。',
    '有时候觉得，能和你说话本身就是一件很幸运的事。',
    '你不用马上回我，我只是想把这几句话放在你那里。'
  ];
  var CLOSES = ['就写到这里。', '等你的回信。', '晚安。', '明天见。', '你要好好的。'];

  function pick(a){ return a[Math.floor(Math.random() * a.length)]; }
  function randInt(a, b){ return a + Math.floor(Math.random() * (b - a + 1)); }
  function clamp(n, a, b){ n = Number(n); if(!isFinite(n)) n = a; return Math.max(a, Math.min(b, n)); }

  function getCfg(rid){
    var all = lsGet(CFG_KEY, {}) || {};
    var c = Object.assign({}, DEFAULTS, all[rid] || {});
    c.replyMin = clamp(c.replyMin, 1, 1440);
    c.replyMax = clamp(c.replyMax, c.replyMin, 1440);
    c.noReplyRate = clamp(c.noReplyRate, 0, 100);
    c.activeRate = clamp(c.activeRate, 0, 100);
    c.noReplyOn = !!c.noReplyOn;
    c.activeOn = !!c.activeOn;
    return c;
  }
  function saveCfg(rid, patch){
    var all = lsGet(CFG_KEY, {}) || {};
    all[rid] = Object.assign({}, DEFAULTS, all[rid] || {}, patch || {});
    lsSet(CFG_KEY, all);
  }
  function getLastMap(){ return lsGet(LAST_KEY, {}) || {}; }
  function setLastActive(rid, t){ var m = getLastMap(); m[rid] = t; lsSet(LAST_KEY, m); }

  function getPending(){ var a = lsGet(PEND_KEY, null); return Array.isArray(a) ? a : []; }
  function savePending(a){ lsSet(PEND_KEY, a); }

  function roleNameOf(rid){
    try{ return getRoleNameById(rid); }catch(e){}
    return 'Ta';
  }
  function fmtTime(t){
    try{
      return new Date(t).toLocaleString('zh-CN', { month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit' });
    }catch(e){ return ''; }
  }

  /* ---------- 生成一封来信 ---------- */
  function buildLetterText(rid, isReply){
    var parts = [];
    if(isReply){
      parts.push('你的信我收到了，读了好几遍。');
      parts.push(pick(OPENS));
    } else {
      parts.push(pick(OPENS));
    }
    var n = randInt(2, 4);
    var pool = BODIES.slice();
    for(var i = 0; i < n && pool.length; i++){
      var idx = Math.floor(Math.random() * pool.length);
      parts.push(pool.splice(idx, 1)[0]);
    }
    /* 用角色当前的字卡池补一句，让每封信都带一点 Ta 的味道 */
    try{
      if(typeof pickCard === 'function'){
        var line = pickCard(rid);
        line = String(line || '').trim();
        if(line && line.length <= 40 && !/\{\{/.test(line)) parts.push('刚刚忽然想到一句话：' + line + '。');
      }
    }catch(e){}
    parts.push(pick(CLOSES));
    return parts.join('\n\n');
  }

  function makeRoleLetter(rid, isReply){
    return {
      dir: 'in',
      title: pick(TITLES),
      text: buildLetterText(rid, isReply),
      time: Date.now(),
      replyTo: isReply ? 'user' : ''
    };
  }

  /* 把来信直接发到聊天界面（appendMsgToRole 会负责未读 / 通知） */
  function pushRoleLetter(rid, isReply){
    var lc = makeRoleLetter(rid, isReply);
    var msg = { id: uid(), role: 'char', letterCard: lc, time: Date.now() };
    if(typeof appendMsgToRole === 'function') appendMsgToRole(rid, msg);
    return msg;
  }

  /* ---------- 定时：待回信 ---------- */
  function checkPendingReplies(){
    var arr = getPending();
    if(!arr.length) return;
    var now = Date.now();
    var changed = false;
    arr.forEach(function(p){
      if(!p || p.done) return;
      if(now < (p.dueAt || 0)) return;
      p.done = true;
      changed = true;
      try{
        pushRoleLetter(p.roleId, true);
      }catch(e){ console.error('发送回信失败', e); }
    });
    if(changed){
      savePending(arr.filter(function(p){ return !p.done; }));
    }
  }

  /* ---------- 定时：角色主动来信（每小时摇一次） ---------- */
  function checkActiveLetters(){
    var now = Date.now();
    var friends = [];
    try{ friends = getFriends(); }catch(e){ return; }
    var lastMap = getLastMap();
    var dirty = false;
    friends.forEach(function(f){
      if(!f || f.hidden || f.blocked) return;
      var rid = f.id;
      var cfg = getCfg(rid);
      if(!cfg.activeOn) return;
      var last = Number(lastMap[rid] || 0);
      if(!last){
        lastMap[rid] = now;   /* 第一次只记时间，先摇下一小时 */
        dirty = true;
        return;
      }
      if(now - last < 60 * 60 * 1000) return;
      lastMap[rid] = now;
      dirty = true;
      if(Math.random() * 100 < cfg.activeRate){
        try{ pushRoleLetter(rid, false); }catch(e){ console.error('主动来信失败', e); }
      }
    });
    if(dirty) lsSet(LAST_KEY, lastMap);
  }

  /* ---------- 寄信 ---------- */
  function appendUserLetter(rid, title, text){
    var lc = { dir: 'out', title: title || '无题', text: text, time: Date.now() };
    var msg = { id: uid(), role: 'user', letterCard: lc, time: Date.now(), readState: 'read' };
    var isCur = (typeof getCurrentRoleId === 'function') && getCurrentRoleId() === rid;
    if(isCur){
      var arr = null;
      try{ arr = window.__getCurMsgs ? window.__getCurMsgs() : null; }catch(e){}
      if(Array.isArray(arr)){
        arr.push(msg);
        if(typeof saveMsgs === 'function') saveMsgs();
        window.__lastRenderSig = '';
        if(typeof renderChatFull === 'function') renderChatFull(true);
      }
    } else {
      var key = 'mj_msgs_' + rid;
      var list = lsGet(key, null);
      if(!Array.isArray(list)) list = [];
      list.push(msg);
      lsSet(key, list);
    }
    return msg;
  }

  function scheduleReply(rid){
    var cfg = getCfg(rid);
    if(cfg.noReplyOn && Math.random() * 100 < cfg.noReplyRate) return null;
    var min = Math.max(1, cfg.replyMin);
    var max = Math.max(min, cfg.replyMax);
    var delayMs = (min + Math.random() * (max - min)) * 60 * 1000;
    var arr = getPending();
    var p = { id: uid(), roleId: rid, dueAt: Date.now() + delayMs, done: false };
    arr.push(p);
    savePending(arr);
    return p;
  }

  /* ---------- 写信页 ---------- */
  function injectStyle(){
    if(document.getElementById('letterStyles')) return;
    var st = document.createElement('style');
    st.id = 'letterStyles';
    st.textContent = `
/* ---- 聊天里的信件卡 ---- */
.letter-card{
  width:232px;max-width:100%;
  background:#fff;border:0.8px solid #e6e6e6;border-radius:4px;
  padding:16px 15px 13px;box-shadow:0 3px 14px rgba(0,0,0,.05);
  position:relative;text-align:left;
}
.letter-card.out{background:#fbfbfb;border-color:#dedede}
.letter-card .lc-head{
  font-family:Georgia,serif;font-size:9px;letter-spacing:4px;color:#b5b5b5;
  margin-bottom:10px;
}
.letter-card .lc-title{
  font-size:14px;font-weight:600;color:#1a1a1a;letter-spacing:.6px;
  margin-bottom:8px;line-height:1.5;
}
.letter-card .lc-body{
  font-size:12.5px;line-height:1.9;color:#333;white-space:pre-wrap;
  word-break:break-word;
}
.letter-card .lc-foot{
  margin-top:12px;font-size:10.5px;color:#aaa;letter-spacing:.4px;
  text-align:right;
}
.letter-card .letter-read-btn{
  display:block;width:100%;margin-top:12px;padding:7px 0;
  border:0.8px solid #1a1a1a;border-radius:6px;background:transparent;
  font-family:inherit;font-size:11.5px;letter-spacing:2px;color:#1a1a1a;cursor:pointer;
}
.letter-card .letter-read-btn:active{background:rgba(0,0,0,.05)}
.letter-card .letter-under{
  margin-top:12px;padding-top:11px;border-top:0.8px dashed #e0e0e0;
}
.letter-card .lu-h{font-size:10.5px;color:#999;letter-spacing:.6px;margin-bottom:5px}
.letter-card .lu-t{
  font-size:12px;line-height:1.8;color:#1a1a1a;white-space:pre-wrap;word-break:break-word;
}
.letter-card .lu-acts{display:flex;gap:8px;margin-top:9px}
.letter-card .lu-btn{
  flex:1;padding:6px 0;border:0.8px solid #ddd;border-radius:6px;background:transparent;
  font-family:inherit;font-size:11px;letter-spacing:1px;color:#666;cursor:pointer;
}
.letter-card .lu-btn:active{background:rgba(0,0,0,.04)}

/* ---- 写信页 ---- */
.lt-mask{
  position:fixed;inset:0;z-index:1400;background:#fff;
  display:flex;flex-direction:column;
  animation:ltIn .22s ease;
}
@keyframes ltIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.lt-top{
  display:flex;align-items:center;gap:10px;padding:14px 16px 12px;
  border-bottom:0.7px solid #f0f0f0;flex:none;
}
.lt-back,.lt-gear{
  width:32px;height:32px;flex:none;border:none;background:transparent;
  font-family:inherit;font-size:17px;color:#1a1a1a;cursor:pointer;
  display:flex;align-items:center;justify-content:center;
}
.lt-title{
  flex:1;text-align:center;font-size:14px;letter-spacing:5px;text-indent:5px;
  color:#1a1a1a;font-weight:500;
}
.lt-sub{
  display:block;font-size:8.5px;letter-spacing:3px;text-indent:3px;
  color:#bbb;font-weight:400;margin-top:2px;font-family:Georgia,serif;
}
.lt-list{
  flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;
  padding:14px 16px 100px;
}
.lt-tip{
  text-align:center;color:#bbb;font-size:12px;padding:40px 10px;line-height:2;
}
.lt-item{
  border:0.8px solid #ececec;border-radius:12px;padding:14px 14px 12px;
  margin-bottom:12px;background:#fff;cursor:pointer;
}
.lt-item:active{background:#fafafa}
.lt-item .lti-row{display:flex;align-items:baseline;gap:8px}
.lt-item .lti-dir{
  font-size:9px;letter-spacing:2px;color:#fff;background:#1a1a1a;
  padding:2px 6px;border-radius:3px;flex:none;
}
.lt-item .lti-dir.in{background:#1a1a1a}
.lt-item .lti-dir.out{background:#999}
.lt-item .lti-title{
  font-size:13.5px;font-weight:600;color:#1a1a1a;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;
}
.lt-item .lti-time{font-size:10px;color:#bbb;flex:none}
.lt-item .lti-prev{
  margin-top:7px;font-size:11.5px;color:#999;line-height:1.7;
  display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;
  white-space:pre-wrap;
}
.lt-item .lti-badge{
  display:inline-block;margin-top:9px;font-size:10px;letter-spacing:1px;
  padding:3px 8px;border-radius:20px;background:#f4f4f4;color:#888;
}
.lt-item .lti-badge.done{background:#1a1a1a;color:#fff}
.lt-pending{
  border:0.8px dashed #ddd;border-radius:12px;padding:12px 14px;margin-bottom:12px;
  font-size:11.5px;color:#888;letter-spacing:.5px;
}
.lt-compose{
  position:absolute;left:50%;transform:translateX(-50%);bottom:24px;
  padding:12px 30px;border:none;border-radius:30px;background:#1a1a1a;color:#fff;
  font-family:inherit;font-size:13px;letter-spacing:4px;text-indent:4px;cursor:pointer;
  box-shadow:0 8px 24px rgba(0,0,0,.18);
}
.lt-compose:active{opacity:.82}

/* ---- 通用小遮罩 ---- */
.lt-sheet-mask{
  position:fixed;inset:0;z-index:1500;background:rgba(0,0,0,.4);
  display:flex;align-items:flex-end;justify-content:center;
}
.lt-sheet{
  width:100%;max-width:520px;background:#fff;border-radius:20px 20px 0 0;
  padding:18px 18px calc(18px + env(safe-area-inset-bottom));
  animation:ltUp .25s cubic-bezier(.22,1,.36,1);
  max-height:88vh;overflow-y:auto;
}
@keyframes ltUp{from{transform:translateY(26px);opacity:.6}to{transform:none;opacity:1}}
.lt-sh-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
.lt-sh-title{font-size:14px;font-weight:600;letter-spacing:3px;text-indent:3px;color:#1a1a1a}
.lt-sh-x{border:none;background:transparent;font-size:16px;color:#bbb;cursor:pointer;font-family:inherit}
.lt-field{margin-bottom:14px}
.lt-label{font-size:11px;letter-spacing:1px;color:#999;margin-bottom:6px}
.lt-input,.lt-area{
  width:100%;box-sizing:border-box;border:0.8px solid #e4e4e4;border-radius:10px;
  padding:11px 12px;font-family:inherit;font-size:13px;color:#1a1a1a;background:#fbfbfb;
  outline:none;line-height:1.7;
}
.lt-input:focus,.lt-area:focus{border-color:#1a1a1a;background:#fff}
.lt-area{resize:vertical;min-height:150px}
.lt-actions{display:flex;gap:10px;margin-top:6px}
.lt-primary{
  flex:1;padding:12px 0;border:none;border-radius:12px;background:#1a1a1a;color:#fff;
  font-family:inherit;font-size:13px;letter-spacing:3px;cursor:pointer;
}
.lt-ghost{
  flex:1;padding:12px 0;border:0.8px solid #ddd;border-radius:12px;background:transparent;
  font-family:inherit;font-size:13px;letter-spacing:3px;color:#666;cursor:pointer;
}
.lt-row{
  display:flex;align-items:center;justify-content:space-between;
  padding:13px 2px;border-bottom:0.7px solid #f2f2f2;
}
.lt-row .lt-r-main{flex:1;min-width:0;padding-right:12px}
.lt-row .lt-r-t1{font-size:13px;color:#1a1a1a;letter-spacing:.4px}
.lt-row .lt-r-t2{font-size:10.5px;color:#aaa;margin-top:3px;line-height:1.6}
.lt-switch{position:relative;width:42px;height:24px;flex:none}
.lt-switch input{position:absolute;opacity:0;width:100%;height:100%;margin:0;cursor:pointer}
.lt-switch .knob{
  position:absolute;inset:0;border-radius:24px;background:#e4e4e4;transition:.22s;pointer-events:none;
}
.lt-switch .knob::after{
  content:"";position:absolute;left:3px;top:3px;width:18px;height:18px;border-radius:50%;
  background:#fff;transition:.22s;box-shadow:0 1px 3px rgba(0,0,0,.18);
}
.lt-switch input:checked + .knob{background:#1a1a1a}
.lt-switch input:checked + .knob::after{left:21px}
.lt-num{
  width:76px;box-sizing:border-box;border:0.8px solid #e4e4e4;border-radius:8px;
  padding:7px 8px;text-align:center;font-family:inherit;font-size:13px;color:#1a1a1a;
  background:#fbfbfb;outline:none;
}
.lt-num:focus{border-color:#1a1a1a;background:#fff}
.lt-range{width:100%;margin:6px 0 0;accent-color:#1a1a1a}
.lt-range-val{font-size:11.5px;color:#1a1a1a;flex:none;min-width:44px;text-align:right}
.lt-note{font-size:10.5px;color:#bbb;line-height:1.8;margin-top:14px}
.lt-read-mask{position:fixed;inset:0;z-index:1500;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;padding:18px}
.lt-read-card{
  width:100%;max-width:380px;max-height:86vh;overflow-y:auto;background:#fff;
  border-radius:16px;padding:18px 18px 16px;box-shadow:0 16px 48px rgba(0,0,0,.22);
}
.lt-read-card .rc-head{font-family:Georgia,serif;font-size:9px;letter-spacing:4px;color:#bbb}
.lt-read-card .rc-title{font-size:15px;font-weight:600;color:#1a1a1a;margin:7px 0 10px;line-height:1.5}
.lt-read-card .rc-body{font-size:12.5px;line-height:1.95;color:#333;white-space:pre-wrap;word-break:break-word}
.lt-read-card .rc-foot{font-size:10.5px;color:#aaa;text-align:right;margin-top:12px}
`;
    document.head.appendChild(st);
  }

  function closeOnMask(mask){
    mask.addEventListener('click', function(e){ if(e.target === mask) mask.remove(); });
  }

  /* 写信 / 写理解 的通用底部面板 */
  function openSheet(title, innerHTML, onMount){
    injectStyle();
    var mask = document.createElement('div');
    mask.className = 'lt-sheet-mask';
    mask.innerHTML = '<div class="lt-sheet"><div class="lt-sh-head"><div class="lt-sh-title">' +
      escapeHTML(title) + '</div><button class="lt-sh-x" type="button">✕</button></div>' +
      '<div class="lt-body">' + innerHTML + '</div></div>';
    closeOnMask(mask);
    mask.querySelector('.lt-sh-x').onclick = function(){ mask.remove(); };
    document.body.appendChild(mask);
    onMount && onMount(mask);
    return mask;
  }

  /* ---------- 写信页 ---------- */
  function openLettersPage(){
    injectStyle();
    closeLettersPage();
    var rid = getCurrentRoleId();
    var mask = document.createElement('div');
    mask.className = 'lt-mask';
    mask.id = 'lettersMask';
    mask.innerHTML =
      '<div class="lt-top">' +
        '<button class="lt-back" type="button">←</button>' +
        '<div class="lt-title">信<span class="lt-sub">LETTERS</span></div>' +
        '<button class="lt-gear" type="button">⚙</button>' +
      '</div>' +
      '<div class="lt-list" id="ltList"></div>' +
      '<button class="lt-compose" type="button">写一封信</button>';
    document.body.appendChild(mask);

    mask.querySelector('.lt-back').onclick = function(){ mask.remove(); };
    mask.querySelector('.lt-gear').onclick = function(){ openLetterSettings(); };
    mask.querySelector('.lt-compose').onclick = function(){ openCompose(rid); };
    renderLettersList(); 
  }

  function closeLettersPage(){
    var el = document.getElementById('lettersMask');
    if(el) el.remove();
  }

  function renderLettersList(){
    var list = document.getElementById('ltList');
    if(!list) return;
    var rid = getCurrentRoleId();
    var arr = [];
    try{ arr = window.__getCurMsgs ? window.__getCurMsgs() : []; }catch(e){ arr = []; }
    var letters = (arr || []).filter(function(m){ return m && m.letterCard; });

    /* 待回信提示 */
    var pend = getPending().filter(function(p){ return p && p.roleId === rid && !p.done; });
    var pendHTML = '';
    if(pend.length){
      var soon = Math.min.apply(null, pend.map(function(p){ return p.dueAt || 0; }));
      var mins = Math.max(1, Math.round((soon - Date.now()) / 60000));
      pendHTML = '<div class="lt-pending">已寄出，等待回信 · 约 ' + mins + ' 分钟内</div>';
    }

    if(!letters.length && !pendHTML){
      list.innerHTML = '<div class="lt-tip">还没有信件<br>点下方按钮，写第一封信给 ' + escapeHTML(roleNameOf(rid)) + '</div>';
      return;
    }

    var html = pendHTML + letters.slice().reverse().map(function(m){
      var lc = m.letterCard || {};
      var isOut = lc.dir === 'out';
      var who = isOut ? '我' : roleNameOf(rid);
      var badge = lc.understanding ? '<span class="lti-badge done">已写理解' + (typeof lc.accuracy === 'number' ? ' · 准度 ' + lc.accuracy + '%' : '') + '</span>' : '';
      return '<div class="lt-item" data-lt-id="' + m.id + '">' +
        '<div class="lti-row">' +
          '<span class="lti-dir ' + (isOut ? 'out' : 'in') + '">' + (isOut ? '寄出' : '来信') + '</span>' +
          '<span class="lti-title">' + escapeHTML(lc.title || '无题') + '</span>' +
          '<span class="lti-time">' + fmtTime(lc.time || m.time) + '</span>' +
        '</div>' +
        '<div class="lti-prev">' + escapeHTML(lc.text || '') + '</div>' +
        (badge || ('<span class="lti-badge">' + escapeHTML(who) + ' 写</span>')) +
      '</div>';
    }).join('');
    list.innerHTML = html;

    list.querySelectorAll('.lt-item[data-lt-id]').forEach(function(el){
      el.onclick = function(){ openLetterDetail(el.dataset.ltId); };
    });
  }

  /* 信件详情：可写理解 / 存回忆 / 存本地 */
  function openLetterDetail(msgId){
    var m = findMsg(msgId);
    if(!m || !m.letterCard){ toast('信件已不存在'); return; }
    var lc = m.letterCard;
    var isOut = lc.dir === 'out';
    var role = roleNameOf(getCurrentRoleId());
    var undHTML = lc.understanding ? (
      '<div class="lt-field" style="margin-top:16px;padding-top:12px;border-top:0.8px dashed #e6e6e6">' +
        '<div class="lt-label">我的理解' + (typeof lc.accuracy === 'number' ? ' · Ta 判定准确度 ' + lc.accuracy + '%' : '') + '</div>' +
        '<div style="font-size:12.5px;line-height:1.9;color:#333;white-space:pre-wrap">' + escapeHTML(lc.understanding) + '</div>' +
      '</div>'
    ) : '';

    var mask = document.createElement('div');
    mask.className = 'lt-read-mask';
    mask.innerHTML = '<div class="lt-read-card">' +
      '<div class="rc-head">LETTER · ' + (isOut ? '寄出' : '来信') + '</div>' +
      '<div class="rc-title">' + escapeHTML(lc.title || '无题') + '</div>' +
      '<div class="rc-body">' + escapeHTML(lc.text || '') + '</div>' +
      '<div class="rc-foot">' + (isOut ? '我' : escapeHTML(role)) + ' 写 · ' + fmtTime(lc.time || m.time) + '</div>' +
      undHTML +
      (lc.understanding
        ? '<div class="lt-actions" style="margin-top:14px">' +
            '<button class="lt-ghost" data-lt-act="mem" type="button">存到回忆</button>' +
            '<button class="lt-primary" data-lt-act="save" type="button">存本地相册</button>' +
          '</div>'
        : (!isOut ? '<div class="lt-actions" style="margin-top:16px"><button class="lt-primary" data-lt-act="read" type="button">写理解</button><button class="lt-ghost" data-lt-act="save" type="button">存本地</button></div>' : '<div class="lt-actions" style="margin-top:16px"><button class="lt-ghost" data-lt-act="save" type="button">存本地相册</button></div>')
      ) +
      '</div>';

    closeOnMask(mask);
    mask.querySelectorAll('[data-lt-act]').forEach(function(b){
      b.onclick = function(){
        var act = b.dataset.ltAct;
        if(act === 'read'){ mask.remove(); openUnderstand(msgId); }
        else if(act === 'mem'){ mask.remove(); saveLetterToMemory(msgId); }
        else if(act === 'save'){ saveLetterImage(msgId); }
      };
    });
    document.body.appendChild(mask);
  }

  /* ---------- 写信面板 ---------- */
  function openCompose(rid){
    var toName = roleNameOf(rid);
    var mask = openSheet('写 一 封 信',
      '<div class="lt-field"><div class="lt-label">收信人</div>' +
        '<div class="lt-input" style="background:#f4f4f4;color:#666">' + escapeHTML(toName) + '</div></div>' +
      '<div class="lt-field"><div class="lt-label">标题</div>' +
        '<input class="lt-input" id="ltTitleInput" type="text" maxlength="40" placeholder="给这封信起个名字…"></div>' +
      '<div class="lt-field"><div class="lt-label">正文</div>' +
        '<textarea class="lt-area" id="ltTextInput" placeholder="想对 ' + escapeHTML(toName) + ' 说的话…"></textarea></div>' +
      '<div class="lt-actions">' +
        '<button class="lt-ghost" data-act="cancel" type="button">取消</button>' +
        '<button class="lt-primary" data-act="send" type="button">寄 出</button>' +
      '</div>' +
      '<div class="lt-note">寄出后 ' + escapeHTML(toName) + ' 会在 1~30 分钟内回信（可在 ⚙ 里调整）。</div>',
      function(mask){
        setTimeout(function(){ var t = mask.querySelector('#ltTextInput'); if(t) t.focus(); }, 120);
        mask.querySelector('[data-act="cancel"]').onclick = function(){ mask.remove(); };
        mask.querySelector('[data-act="send"]').onclick = function(){
          var title = mask.querySelector('#ltTitleInput').value.trim();
          var text = mask.querySelector('#ltTextInput').value.trim();
          if(!text){ toast('信的内容不能为空'); return; }
          mask.remove();
          doSendLetter(rid, title, text);
        };
      }
    );
  }

  function doSendLetter(rid, title, text){
    appendUserLetter(rid, title, text);
    var p = scheduleReply(rid);
    if(p){
      var mins = Math.max(1, Math.round((p.dueAt - Date.now()) / 60000));
      toast('信已寄出，' + roleNameOf(rid) + ' 约 ' + mins + ' 分钟后回信');
    } else {
      toast('信已寄出');
    }
    /* 写信页开着就刷新列表 */
    if(document.getElementById('lettersMask')) renderLettersList();
  }

  /* ---------- 写理解 ---------- */
  function openUnderstand(msgId){
    var m = findMsg(msgId);
    if(!m || !m.letterCard){ toast('信件已不存在'); return; }
    var lc = m.letterCard;
    if(lc.dir === 'out'){ toast('这是你寄出的信，等 Ta 回信后再写理解'); return; }
    var mask = openSheet('写 下 我 的 理 解',
      '<div class="lt-note" style="margin:0 0 12px">《' + escapeHTML(lc.title || '无题') + '》</div>' +
      '<div class="lt-field"><textarea class="lt-area" id="ltUnderstand" placeholder="读完这封信，你想说些什么…"></textarea></div>' +
      '<div class="lt-actions">' +
        '<button class="lt-ghost" data-act="cancel" type="button">取消</button>' +
        '<button class="lt-primary" data-act="save" type="button">保 存</button>' +
      '</div>' +
      '<div class="lt-note">保存后 Ta 会给出一个 1%~100% 的准确度判定，可存到回忆或本地相册。</div>',
      function(mask){
        setTimeout(function(){ var t = mask.querySelector('#ltUnderstand'); if(t) t.focus(); }, 120);
        mask.querySelector('[data-act="cancel"]').onclick = function(){ mask.remove(); };
        mask.querySelector('[data-act="save"]').onclick = function(){
          var txt = mask.querySelector('#ltUnderstand').value.trim();
          if(!txt){ toast('内容不能为空'); return; }
          mask.remove();
          var accuracy = randInt(1, 100);
          var next = Object.assign({}, lc, { understanding: txt, accuracy: accuracy, understoodAt: Date.now() });
          var ok = false;
          try{
            ok = window.__patchMsg ? window.__patchMsg(msgId, { letterCard: next }) : false;
          }catch(e){ console.error('写理解保存失败', e); }
          if(!ok) toast('保存失败');
          else toast('已保存 · Ta 判定准确度 ' + accuracy + '%');
          if(document.getElementById('lettersMask')) renderLettersList();
          /* 保存成功后稍等一会儿，直接给出保存入口 */
          if(ok){
            setTimeout(function(){
              var mm = findMsg(msgId);
              if(mm && mm.letterCard && mm.letterCard.understanding){
                var sheet = openSheet('理解已保存',
                  '<div style="font-size:12px;line-height:1.9;color:#666;white-space:pre-wrap">' + escapeHTML(txt) + '</div>' +
                  '<div class="lt-note">Ta 判定准确度 ' + accuracy + '%</div>' +
                  '<div class="lt-actions" style="margin-top:14px">' +
                    '<button class="lt-ghost" data-act="mem" type="button">存到回忆</button>' +
                    '<button class="lt-primary" data-act="save" type="button">存本地相册</button>' +
                  '</div>', function(mk){
                    mk.querySelector('[data-act="mem"]').onclick = function(){ mk.remove(); saveLetterToMemory(msgId); };
                    mk.querySelector('[data-act="save"]').onclick = function(){ mk.remove(); saveLetterImage(msgId); };
                  });
              }
            }, 260);
          }
        };
      }
    );
  }

  function findMsg(msgId){
    try{
      var arr = window.__getCurMsgs ? window.__getCurMsgs() : null;
      if(Array.isArray(arr)){
        var hit = arr.find(function(x){ return x && x.id === msgId; });
        if(hit) return hit;
      }
    }catch(e){}
    var rid = getCurrentRoleId();
    var list = lsGet('mj_msgs_' + rid, null);
    if(Array.isArray(list)) return list.find(function(x){ return x && x.id === msgId; }) || null;
    return null;
  }

  /* ---------- 把信件画成图片 ---------- */
  function buildLetterCanvas(lc, roleName){
    var W = 760, PAD = 56, DPR = 2;
    var bodyFont = '20px -apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif';
    var cv = document.createElement('canvas');
    var ctx = cv.getContext('2d');
    ctx.font = bodyFont;
    var bodyLines = wrapText(ctx, lc.text || '', W - PAD * 2);
    var undLines = lc.understanding ? wrapText(ctx, lc.understanding, W - PAD * 2) : [];
    var H = PAD + 26 /*LETTER*/ + 18 + 40 /*title*/ + bodyLines.length * 34 + 34 + 22 /*foot*/;
    if(lc.understanding){
      H += 36 + 24 + 24 + undLines.length * 32;
    }
    H += PAD + 16;

    cv.width = W * DPR;
    cv.height = H * DPR;
    ctx.scale(DPR, DPR);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);
    /* 细边框 */
    ctx.strokeStyle = '#eeeeee';
    ctx.lineWidth = 1;
    ctx.strokeRect(20.5, 20.5, W - 41, H - 41);

    var y = PAD;
    ctx.fillStyle = '#bbbbbb';
    ctx.font = '12px Georgia,serif';
    ctx.fillText('L E T T E R', PAD, y);
    y += 44;
    ctx.fillStyle = '#1a1a1a';
    ctx.font = 'bold 30px -apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif';
    ctx.fillText(lc.title || '无题', PAD, y);
    y += 30;
    ctx.font = bodyFont;
    ctx.fillStyle = '#333333';
    bodyLines.forEach(function(line){
      y += 34;
      ctx.fillText(line, PAD, y);
    });
    y += 34;
    ctx.font = '15px -apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif';
    ctx.fillStyle = '#aaaaaa';
    var foot = (lc.dir === 'out' ? '我' : (roleName || 'Ta')) + ' 写 · ' + fmtTime(lc.time || Date.now());
    ctx.textAlign = 'right';
    ctx.fillText(foot, W - PAD, y);
    ctx.textAlign = 'left';

    if(lc.understanding){
      y += 30;
      ctx.strokeStyle = '#e5e5e5';
      ctx.beginPath();
      ctx.moveTo(PAD, y);
      ctx.lineTo(W - PAD, y);
      ctx.stroke();
      y += 34;
      ctx.fillStyle = '#999999';
      ctx.font = '15px -apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif';
      ctx.fillText('我 的 理 解' + (typeof lc.accuracy === 'number' ? ' · Ta 判 定 准 确 度 ' + lc.accuracy + '%' : ''), PAD, y);
      y += 12;
      ctx.fillStyle = '#1a1a1a';
      ctx.font = '19px -apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif';
      undLines.forEach(function(line){
        y += 32;
        ctx.fillText(line, PAD, y);
      });
    }

    ctx.fillStyle = '#dddddd';
    ctx.font = '12px Georgia,serif';
    ctx.textAlign = 'center';
    ctx.fillText('choco', W / 2, H - 26);
    ctx.textAlign = 'left';
    return cv;
  }

  function wrapText(ctx, text, maxWidth){
    var out = [];
    String(text || '').split('\n').forEach(function(par){
      if(!par){ out.push(''); return; }
      var line = '';
      for(var i = 0; i < par.length; i++){
        var ch = par[i];
        if(ctx.measureText(line + ch).width > maxWidth && line){
          out.push(line);
          line = ch;
        } else {
          line += ch;
        }
      }
      out.push(line);
    });
    return out;
  }

  function letterImageDataURL(msgId){
    var m = findMsg(msgId);
    if(!m || !m.letterCard) return null;
    var lc = m.letterCard;
    var cv = buildLetterCanvas(lc, roleNameOf(getCurrentRoleId()));
    return cv.toDataURL('image/png');
  }

  function saveLetterImage(msgId){
    var m = findMsg(msgId);
    if(!m || !m.letterCard){ toast('信件已不存在'); return; }
    var url = letterImageDataURL(msgId);
    if(!url){ toast('生成图片失败'); return; }
    var lc = m.letterCard;
    var a = document.createElement('a');
    a.href = url;
    a.download = 'letter_' + (lc.time ? new Date(lc.time).toISOString().slice(0, 10) : Date.now()) + '.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast('已保存到本地相册');
  }

  function saveLetterToMemory(msgId){
    var m = findMsg(msgId);
    if(!m || !m.letterCard){ toast('信件已不存在'); return; }
    var url = letterImageDataURL(msgId);
    if(!url){ toast('生成图片失败'); return; }
    var lc = m.letterCard;
    var html = '<div style="padding:18px;background:#fff;border:0.8px solid #eee;border-radius:6px">' +
      '<div style="font-family:Georgia,serif;font-size:9px;letter-spacing:4px;color:#bbb">LETTER</div>' +
      '<div style="font-size:16px;font-weight:600;color:#1a1a1a;margin:8px 0 10px">' + escapeHTML(lc.title || '无题') + '</div>' +
      '<div style="font-size:12.5px;line-height:1.9;color:#333;white-space:pre-wrap">' + escapeHTML(lc.text || '') + '</div>' +
      (lc.understanding ? '<div style="margin-top:12px;padding-top:10px;border-top:0.8px dashed #e0e0e0;font-size:12px;line-height:1.8;color:#1a1a1a;white-space:pre-wrap">我的理解' + (typeof lc.accuracy === 'number' ? ' · Ta 判定准确度 ' + lc.accuracy + '%' : '') + '<br>' + escapeHTML(lc.understanding) + '</div>' : '') +
    '</div>';
    try{
      if(typeof addMemory === 'function') addMemory(html, url);
      toast('已存到回忆');
    }catch(e){ console.error('存到回忆失败', e); toast('保存失败'); }
  }

  /* ---------- 写信设置 ---------- */
  function openLetterSettings(){
    var rid = getCurrentRoleId();
    var c = getCfg(rid);
    openSheet('写 信 设 置',
      '<div class="lt-row">' +
        '<div class="lt-r-main"><div class="lt-r-t1">有概率不回信</div>' +
          '<div class="lt-r-t2">开启后，寄出的信有可能收不到回信</div></div>' +
        '<label class="lt-switch"><input type="checkbox" id="ltNoReply" ' + (c.noReplyOn ? 'checked' : '') + '><span class="knob"></span></label>' +
      '</div>' +
      '<div class="lt-field" style="margin-top:14px">' +
        '<div class="lt-label" style="display:flex;justify-content:space-between"><span>不回信概率</span><span class="lt-range-val" id="ltNoReplyVal">' + Math.round(c.noReplyRate) + '%</span></div>' +
        '<input class="lt-range" id="ltNoReplyRate" type="range" min="0" max="100" step="1" value="' + Math.round(c.noReplyRate) + '">' +
      '</div>' +
      '<div class="lt-row">' +
        '<div class="lt-r-main"><div class="lt-r-t1">回信最快（分钟）</div></div>' +
        '<input class="lt-num" id="ltReplyMin" type="number" min="1" max="1440" value="' + Math.round(c.replyMin) + '">' +
      '</div>' +
      '<div class="lt-row">' +
        '<div class="lt-r-main"><div class="lt-r-t1">回信最慢（分钟）</div></div>' +
        '<input class="lt-num" id="ltReplyMax" type="number" min="1" max="1440" value="' + Math.round(c.replyMax) + '">' +
      '</div>' +
      '<div class="lt-row">' +
        '<div class="lt-r-main"><div class="lt-r-t1">角色可以主动写信</div>' +
          '<div class="lt-r-t2">每个整点小时摇一次，摇中就会寄来信件</div></div>' +
        '<label class="lt-switch"><input type="checkbox" id="ltActiveOn" ' + (c.activeOn ? 'checked' : '') + '><span class="knob"></span></label>' +
      '</div>' +
      '<div class="lt-field" style="margin-top:14px">' +
        '<div class="lt-label" style="display:flex;justify-content:space-between"><span>主动写信概率（每小时）</span><span class="lt-range-val" id="ltActiveVal">' + Math.round(c.activeRate) + '%</span></div>' +
        '<input class="lt-range" id="ltActiveRate" type="range" min="0" max="100" step="1" value="' + Math.round(c.activeRate) + '">' +
      '</div>' +
      '<div class="lt-actions" style="margin-top:6px">' +
        '<button class="lt-ghost" data-act="cancel" type="button">取消</button>' +
        '<button class="lt-primary" data-act="save" type="button">保 存</button>' +
      '</div>' +
      '<div class="lt-note">当前角色：' + escapeHTML(roleNameOf(rid)) + '。设置只对这个角色生效。</div>',
      function(mask){
        var r1 = mask.querySelector('#ltNoReplyRate');
        var r1v = mask.querySelector('#ltNoReplyVal');
        r1.oninput = function(){ r1v.textContent = r1.value + '%'; };
        var r2 = mask.querySelector('#ltActiveRate');
        var r2v = mask.querySelector('#ltActiveVal');
        r2.oninput = function(){ r2v.textContent = r2.value + '%'; };
        mask.querySelector('[data-act="cancel"]').onclick = function(){ mask.remove(); };
        mask.querySelector('[data-act="save"]').onclick = function(){
          var noOn = mask.querySelector('#ltNoReply').checked;
          var noRate = clamp(mask.querySelector('#ltNoReplyRate').value, 0, 100);
          var min = clamp(mask.querySelector('#ltReplyMin').value, 1, 1440);
          var max = clamp(mask.querySelector('#ltReplyMax').value, 1, 1440);
          if(max < min){ var tmp = min; min = max; max = tmp; }
          var actOn = mask.querySelector('#ltActiveOn').checked;
          var actRate = clamp(mask.querySelector('#ltActiveRate').value, 0, 100);
          saveCfg(rid, {
            noReplyOn: noOn, noReplyRate: noRate,
            replyMin: min, replyMax: max,
            activeOn: actOn, activeRate: actRate
          });
          mask.remove();
          toast('写信设置已保存');
        };
      }
    );
  }

  /* ---------- 点击信件卡上的按钮 ---------- */
  document.addEventListener('click', function(e){
    var t = e.target;
    if(!t || !t.closest) return;
    var readBtn = t.closest('[data-letter-read]');
    var memBtn  = t.closest('[data-letter-mem]');
    var saveBtn = t.closest('[data-letter-save]');
    if(!readBtn && !memBtn && !saveBtn) return;
    e.preventDefault();
    e.stopPropagation();
    if(readBtn) openUnderstand(readBtn.dataset.letterRead);
    else if(memBtn) saveLetterToMemory(memBtn.dataset.letterMem);
    else if(saveBtn) saveLetterImage(saveBtn.dataset.letterSave);
  }, true);

  /* ---------- 定时任务 ---------- */
  try{
    if(typeof kaSchedule === 'function'){
      kaSchedule('letter-pending', checkPendingReplies, 60 * 1000);
      kaSchedule('letter-active', checkActiveLetters, 60 * 1000);
    } else {
      setInterval(checkPendingReplies, 60 * 1000);
      setInterval(checkActiveLetters, 60 * 1000);
    }
  }catch(e){ console.error('写信定时任务启动失败', e); }

  /* 暴露接口 */
  window.openLettersPage = openLettersPage;
  window.openLetterSettings = openLetterSettings;
  window.openLetterCompose = openCompose;
  window.checkLetterPending = checkPendingReplies;
})();
