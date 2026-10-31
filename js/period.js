/* ============================================================
   经期字卡 + 日历经期标记 + 经期设置弹层（纯本地 localStorage）
   - 数据：mj_period_cfg_v1 = { on, cycleLen, periodLen, lastStart, remind }
   - 字卡分组：g-period / 分类 cp-period
   - 暴露：window.openPeriodSettings / window.__periodIsToday / window.__periodMark
   ============================================================ */
(function(){
  if(window.__periodInited) return;
  window.__periodInited = true;

  var CFG_KEY = 'mj_period_cfg_v1';
  var REMIND_KEY = 'mj_period_remind_v1';
  var GROUP_ID = 'g-period';
  var CAT_ID = 'cp-period';
  var STYLE_ID = 'periodStyles';
  var PERIOD_RATE = 0.3;   /* 经期期间抽到经期字卡的概率 */
  var DEFAULT_CFG = { on:false, cycleLen:28, periodLen:5, lastStart:'', remind:true };
  var PERIOD_CARDS = [
    '肚子有点疼',
    '帮我揉揉',
    '今天不太舒服，想躺着',
    '腰好酸，不想动',
    '有点累，想抱抱',
    '今天脾气有点大，让让我',
    '想喝点热的',
    '帮我拿个热水袋好不好',
    '你别走，陪我一会儿',
    '今天想被多照顾一点',
    '肚子不舒服，说话都没力气',
    '记得别惹我，我今天不舒服'
  ];

  /* ---------- 基础存取 ---------- */
  function lsRead(k, d){
    if(typeof lsGet === 'function'){ try{ return lsGet(k, d); }catch(e){} }
    try{
      var v = localStorage.getItem(k);
      return v ? JSON.parse(v) : d;
    }catch(e){ return d; }
  }
  function lsWrite(k, v){
    if(typeof lsSet === 'function'){ try{ lsSet(k, v); return; }catch(e){} }
    try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){}
  }
  function clamp(n, min, max){
    n = Math.round(Number(n));
    if(!isFinite(n)) n = min;
    return n < min ? min : (n > max ? max : n);
  }
  function pad2(n){ return (n < 10 ? '0' : '') + n; }
  function keyOf(dt){
    return dt.getFullYear() + '-' + pad2(dt.getMonth() + 1) + '-' + pad2(dt.getDate());
  }
  function parseKey(s){
    if(typeof s !== 'string') return null;
    var m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if(!m) return null;
    var y = Number(m[1]), mo = Number(m[2]), da = Number(m[3]);
    var dt = new Date(y, mo - 1, da);
    if(dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== da) return null;
    return dt;
  }
  function dayDiff(a, b){
    var A = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
    var B = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
    return Math.round((B - A) / 86400000);
  }

  /* ---------- 配置读取（带短缓存，避免月历 31 个格子反复解析） ---------- */
  var _cfgCache = null, _cfgCacheAt = 0;
  function readCfg(){
    var nowTs = Date.now();
    if(_cfgCache && nowTs - _cfgCacheAt < 2000) return _cfgCache;
    var c = lsRead(CFG_KEY, null);
    if(!c || typeof c !== 'object') c = {};
    var out = {
      on: (c.on === true),
      cycleLen: (typeof c.cycleLen === 'number') ? clamp(c.cycleLen, 15, 60) : DEFAULT_CFG.cycleLen,
      periodLen: (typeof c.periodLen === 'number') ? clamp(c.periodLen, 1, 15) : DEFAULT_CFG.periodLen,
      lastStart: parseKey(c.lastStart) ? c.lastStart : '',
      remind: (c.remind === false) ? false : true
    };
    _cfgCache = out;
    _cfgCacheAt = nowTs;
    return out;
  }
  function saveCfg(cfg){
    lsWrite(CFG_KEY, cfg);
    _cfgCache = null;
    _cfgCacheAt = 0;
  }

  /* ---------- 经期计算 ---------- */
  function isPeriodDay(dt){
    var cfg = readCfg();
    if(!cfg.on) return false;
    var start = parseKey(cfg.lastStart);
    if(!start) return false;
    var diff = dayDiff(start, dt);
    if(diff < 0) return false;
    var plen = Math.min(cfg.periodLen, cfg.cycleLen);
    return (diff % cfg.cycleLen) < plen;
  }
  function isCycleStart(dt){
    var cfg = readCfg();
    if(!cfg.on) return false;
    var start = parseKey(cfg.lastStart);
    if(!start) return false;
    var diff = dayDiff(start, dt);
    if(diff < 0) return false;
    return (diff % cfg.cycleLen) === 0;
  }

  window.__periodIsToday = function(){
    try{ return isPeriodDay(new Date()); }catch(e){ return false; }
  };
  window.__periodMark = function(y, m, d){
    try{ return isPeriodDay(new Date(y, m - 1, d)); }catch(e){ return false; }
  };

  /* ---------- 经期字卡 ---------- */
  function ensurePeriodGroup(){
    try{
      if(typeof cardStore === 'undefined' || !cardStore || !Array.isArray(cardStore.public)) return;
      var g = cardStore.public.find(function(x){ return x && x.id === GROUP_ID; });
      var dirty = false;
      if(!g){
        g = { id:GROUP_ID, name:'经期字卡', icon:'note', sub:'经期时角色更体贴一点', cats:[] };
        cardStore.public.push(g);
        dirty = true;
      }
      if(!Array.isArray(g.cats)){ g.cats = []; dirty = true; }
      /* 只在分类缺失时创建，用户改过 / 清空过的分类不动 */
      if(!g.cats.some(function(c){ return c && c.id === CAT_ID; })){
        g.cats.push({
          id: CAT_ID,
          name: '经期',
          list: PERIOD_CARDS.map(function(t){ return { text: t, t: Date.now() }; })
        });
        dirty = true;
      }
      if(dirty && typeof saveCardStore === 'function') saveCardStore();
    }catch(e){ console.error('经期字卡初始化失败', e); }
  }
  function getPeriodPool(){
    ensurePeriodGroup();
    try{
      if(typeof getCardsFromGroup === 'function'){
        return getCardsFromGroup('public', GROUP_ID) || [];
      }
    }catch(e){}
    return [];
  }
  try{ ensurePeriodGroup(); }catch(e){}

  /* ---------- 拦截 pickCard：经期窗口内 30% 概率抽经期字卡 ---------- */
  try{
    if(typeof pickCard === 'function'){
      var _origPickCard = pickCard;
      pickCard = function(roleId){
        try{
          if(isPeriodDay(new Date()) && Math.random() < PERIOD_RATE){
            var pool = getPeriodPool();
            if(pool.length) return pool[Math.floor(Math.random() * pool.length)];
          }
        }catch(e){}
        /* 任何分支都回退原函数，绝不返回 undefined */
        return _origPickCard.apply(this, arguments);
      };
    }
  }catch(e){ console.error('经期字卡挂载失败', e); }

  /* ---------- 样式（黑白极简） ---------- */
  function injectStyle(){
    if(document.getElementById(STYLE_ID)) return;
    var st = document.createElement('style');
    st.id = STYLE_ID;
    st.textContent = [
      '.cal-period-dot{position:absolute;top:3px;left:3px;width:4px;height:4px;border-radius:50%;background:#b9b9b9;z-index:3;pointer-events:none;}',
      '#periodMask{position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.4);display:flex;align-items:flex-end;justify-content:center;}',
      '#periodSheet{width:100%;max-width:520px;background:#fff;border-radius:18px 18px 0 0;padding:20px 20px calc(18px + env(safe-area-inset-bottom));box-sizing:border-box;font-family:inherit;}',
      '.pd-title{font-size:13px;font-weight:300;letter-spacing:4px;text-align:center;color:#1a1a1a;padding-bottom:14px;border-bottom:.6px solid #f0f0f0;}',
      '.pd-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:13px 0;border-bottom:.6px solid #f4f4f4;}',
      '.pd-row .pd-main{flex:1;min-width:0;}',
      '.pd-label{font-size:12px;color:#1a1a1a;letter-spacing:.5px;}',
      '.pd-hint{font-size:11px;color:#b5b5b5;margin-top:3px;line-height:1.4;}',
      '.pd-num,.pd-date{width:82px;border:1px solid #e8e8e8;border-radius:12px;background:#fff;color:#1a1a1a;font-size:12px;font-family:inherit;padding:6px 10px;text-align:center;outline:none;box-sizing:border-box;}',
      '.pd-date{width:138px;text-align:left;}',
      '.pd-switch{position:relative;width:40px;height:22px;flex:none;}',
      '.pd-switch input{display:none;}',
      '.pd-slider{position:absolute;inset:0;background:#e8e8e8;border-radius:12px;transition:.2s;cursor:pointer;}',
      '.pd-slider:before{content:"";position:absolute;width:16px;height:16px;border-radius:50%;background:#fff;top:3px;left:3px;transition:.2s;}',
      '.pd-switch input:checked + .pd-slider{background:#1a1a1a;}',
      '.pd-switch input:checked + .pd-slider:before{transform:translateX(18px);}',
      '.pd-actions{display:flex;gap:10px;margin-top:18px;}',
      '.pd-btn{flex:1;height:40px;border-radius:12px;font-size:12px;letter-spacing:3px;font-family:inherit;cursor:pointer;}',
      '.pd-btn.cancel{border:1px solid #e8e8e8;background:#fff;color:#1a1a1a;}',
      '.pd-btn.save{border:1px solid #1a1a1a;background:#1a1a1a;color:#fff;}',
      '.pd-note{font-size:11px;color:#bbb;text-align:center;margin-top:10px;letter-spacing:.5px;}'
    ].join('\n');
    (document.head || document.documentElement).appendChild(st);
  }

  /* ---------- 设置弹层 ---------- */
  function closePeriodSettings(){
    var mask = document.getElementById('periodMask');
    if(mask && mask.parentNode) mask.parentNode.removeChild(mask);
  }

  function openPeriodSettings(){
    injectStyle();
    closePeriodSettings();
    var cfg = readCfg();
    var mask = document.createElement('div');
    mask.id = 'periodMask';
    mask.innerHTML =
      '<div id="periodSheet">' +
        '<div class="pd-title">经 期 设 置</div>' +
        '<div class="pd-row">' +
          '<div class="pd-main"><div class="pd-label">开启经期</div><div class="pd-hint">开启后经期会出现在聊天与日历</div></div>' +
          '<label class="pd-switch"><input type="checkbox" id="pdOn"' + (cfg.on ? ' checked' : '') + '><span class="pd-slider"></span></label>' +
        '</div>' +
        '<div class="pd-row">' +
          '<div class="pd-main"><div class="pd-label">周期天数</div><div class="pd-hint">两次经期开始之间的天数</div></div>' +
          '<input class="pd-num" type="number" id="pdCycle" min="15" max="60" value="' + cfg.cycleLen + '">' +
        '</div>' +
        '<div class="pd-row">' +
          '<div class="pd-main"><div class="pd-label">经期天数</div><div class="pd-hint">每次持续的预计天数</div></div>' +
          '<input class="pd-num" type="number" id="pdLen" min="1" max="15" value="' + cfg.periodLen + '">' +
        '</div>' +
        '<div class="pd-row">' +
          '<div class="pd-main"><div class="pd-label">上次开始日期</div><div class="pd-hint">用来推算每次经期</div></div>' +
          '<input class="pd-date" type="date" id="pdLast" value="' + (cfg.lastStart || '') + '">' +
        '</div>' +
        '<div class="pd-row">' +
          '<div class="pd-main"><div class="pd-label">经期提醒</div><div class="pd-hint">开始时提醒一次，每天只提示一次</div></div>' +
          '<label class="pd-switch"><input type="checkbox" id="pdRemind"' + (cfg.remind ? ' checked' : '') + '><span class="pd-slider"></span></label>' +
        '</div>' +
        '<div class="pd-actions">' +
          '<button type="button" class="pd-btn cancel" id="pdCancel">取 消</button>' +
          '<button type="button" class="pd-btn save" id="pdSave">保 存</button>' +
        '</div>' +
        '<div class="pd-note">数据只保存在本机浏览器</div>' +
      '</div>';
    document.body.appendChild(mask);

    mask.addEventListener('click', function(e){
      if(e.target === mask) closePeriodSettings();
    });
    var cancelBtn = mask.querySelector('#pdCancel');
    if(cancelBtn) cancelBtn.onclick = closePeriodSettings;
    var saveBtn = mask.querySelector('#pdSave');
    if(saveBtn){
      saveBtn.onclick = function(){
        var onEl = mask.querySelector('#pdOn');
        var cycleEl = mask.querySelector('#pdCycle');
        var lenEl = mask.querySelector('#pdLen');
        var lastEl = mask.querySelector('#pdLast');
        var remindEl = mask.querySelector('#pdRemind');
        var on = !!(onEl && onEl.checked);
        var cycle = clamp(cycleEl ? cycleEl.value : 28, 15, 60);
        var plen = clamp(lenEl ? lenEl.value : 5, 1, 15);
        var lastStart = lastEl ? String(lastEl.value || '').trim() : '';
        var remind = !!(remindEl && remindEl.checked);
        if(on && !parseKey(lastStart)){
          if(typeof toast === 'function') toast('请选择上次开始日期');
          return;
        }
        if(plen >= cycle) plen = cycle - 1;
        if(plen < 1) plen = 1;
        saveCfg({ on:on, cycleLen:cycle, periodLen:plen, lastStart:lastStart, remind:remind });
        closePeriodSettings();
        try{ if(typeof refreshCalendarPage === 'function') refreshCalendarPage(); }catch(e){}
        if(typeof toast === 'function') toast('经期设置已保存');
      };
    }
  }
  window.openPeriodSettings = openPeriodSettings;

  /* ---------- 提醒：今天 / 明天是预计经期开始时，每天只提示一次 ---------- */
  function checkRemind(){
    try{
      var cfg = readCfg();
      if(!cfg.on || !cfg.remind) return;
      if(!parseKey(cfg.lastStart)) return;
      var now = new Date();
      var tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      var todayStart = isCycleStart(now);
      var tomorrowStart = isCycleStart(tomorrow);
      if(!todayStart && !tomorrowStart) return;
      var todayKey = keyOf(now);
      if(lsRead(REMIND_KEY, '') === todayKey) return;
      lsWrite(REMIND_KEY, todayKey);
      var msg = todayStart ? '预计今天是经期第一天，记得照顾好自己' : '预计明天经期开始，提前准备好';
      if(typeof toast === 'function') toast(msg);
    }catch(e){}
  }
  setTimeout(checkRemind, 4000);
  document.addEventListener('visibilitychange', function(){
    if(document.visibilityState === 'visible') setTimeout(checkRemind, 800);
  });
})();
