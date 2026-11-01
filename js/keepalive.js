/* ============================================================
   后台强力保活 · 增强层（keepalive.js）
   ------------------------------------------------------------
   叠加在 app.js 已有的「静音 <audio> + WebAudio 振荡器」之上，
   补各浏览器平台的短板，把「切后台就断」压到现有技术的极限：

   1. Worker 心跳 —— 主线程定时器被节流时，由 Worker 把 tick 拉回来
   2. 自动顶保活 —— 后台时每 20 秒调一次 startKeepAlive（含 AudioContext.resume）
   3. 手势解锁   —— 刷新后没有用户手势，audio 会被自动播放策略拦下，
                    第一次触摸 / 按键时自动恢复
   4. 冻结补跑   —— 被系统真正冻结（iOS / 激进安卓）后回前台，
                    先顶保活，再把漏掉的定时任务补跑一次
   5. 持久化存储 —— 申请 persistent storage，避免数据被清理
   6. SW 协同    —— 通知调度由 sw.js 兜底（见 sw.js）

   依赖：app.js 里的 getKeepAliveOn / startKeepAlive / applyKeepAliveSwitch
   本文件必须在 app.js 之后加载。
   ============================================================ */
(function(){
  'use strict';
  if(window.__kaHardened) return;
  window.__kaHardened = true;

  var TICK_MS = 1000;         /* 主线程 tick 间隔 */
  var REVIVE_MS = 20000;      /* 后台时多久顶一次保活 */
  var WAKE_GAP = 4000;        /* 超过这个间隔没 tick → 认为被冻结过 */
  var CATCHUP_GAP = 60000;    /* 回前台时，冻结超过 1 分钟才补跑 */
  var CATCHUP_KEY = 'mj_ka_catchup_v1';

  // 废除了多标签页抢夺逻辑，直接默认当前标签为主标签
  var isLeaderTab = true;
  function takeLeadership(reason){}
  function leaderTick(now){ return true; }

  var tasks = [];
  var lastTick = Date.now();
  var lastRevive = 0;
  var worker = null;
  var workerUrl = '';
  var reviveCount = 0;
  var bornAt = Date.now();

  var stats = { ticks: 0, wakes: 0, revives: 0, lastWake: 0, lastCatchUp: 0 };

  function isHidden(){
    return document.hidden || document.visibilityState !== 'visible';
  }

  function kaOn(){
    try{
      return typeof window.getKeepAliveOn === 'function' && !!window.getKeepAliveOn();
    }catch(e){ return false; }
  }

  /* ---------- 1. 顶保活：把静音音频 / AudioContext 拉回来 ---------- */
  function revive(reason){
    if(!kaOn()) return;
    try{
      if(typeof window.startKeepAlive === 'function') window.startKeepAlive();
      reviveCount++;
      stats.revives++;
      /* 日志别刷屏，每 10 次打一条 */
      if(reason || reviveCount % 10 === 1){
        console.log('[KA] 顶保活' + (reason ? '（' + reason + '）' : '') + ' #' + reviveCount);
      }
    }catch(e){
      console.warn('[KA] 顶保活失败', e);
    }
  }

  /* ---------- 2. 冻结后补跑：把漏掉的定时任务补一次 ---------- */
  function catchUp(gapMs){
    if(isHidden()) return;
    /* 只有主标签才补跑，否则多开会重复发消息 */
    leaderTick(Date.now());
    if(!isLeaderTab) return;
    /* 多标签 / 频繁切换防重：1 分钟内只补一次 */
    var last = 0;
    try{ last = Number(localStorage.getItem(CATCHUP_KEY) || 0) || 0; }catch(e){}
    if(Date.now() - last < 60000) return;
    try{ localStorage.setItem(CATCHUP_KEY, String(Date.now())); }catch(e){}

    /* 告诉 video-pool：这次是补跑，放宽时间窗（每角色最多补 1 条） */
    window.__kaCatchUpActive = true;
    try{
      if(typeof window.runVideoScheduleTick === 'function') window.runVideoScheduleTick();
      if(typeof window.runIntroTick === 'function') window.runIntroTick(false);
      if(typeof window.runTheirsCollectTick === 'function') window.runTheirsCollectTick();
      if(typeof window.runFestTick === 'function') window.runFestTick();
      if(typeof window.settleMoments === 'function') window.settleMoments();
    }catch(e){
      console.error('[KA] 补跑出错', e);
    }
    window.__kaCatchUpActive = false;

    stats.lastCatchUp = Date.now();
    console.log('[KA] 补跑完成，冻结约 ' + Math.round((gapMs || 0) / 1000) + ' 秒');
  }

  /* ---------- 3. 统一 tick：所有定时任务都由这里驱动 ---------- */
  function tick(){
    var now = Date.now();
    var gap = now - lastTick;
    lastTick = now;
    stats.ticks++;

    /* 先决定本标签是不是主标签，再决定要不要跑后台任务 */
    leaderTick(now);

    /* 主线程被冻结过（定时器停摆）→ 先顶保活，再补跑
       刚启动 15 秒内不算（页面解析大文件时首个 tick 本来就会迟） */
    if(gap > WAKE_GAP && now - bornAt > 15000){
      stats.wakes++;
      stats.lastWake = gap;
      revive('冻结 ' + Math.round(gap / 1000) + 's 后唤醒');
      catchUp(gap);
    }

    /* 后台调度任务只在主标签执行（多开标签不会重复发消息） */
    if(isLeaderTab){
      for(var i = 0; i < tasks.length; i++){
        var t = tasks[i];
        if(now - t.last >= t.every){
          var late = now - t.last;
          t.last = now;
          try{ t.fn(late); }catch(e){ console.error('[KA] 任务 ' + t.name + ' 出错', e); }
        }
      }
    }

    /* 后台保活巡检 */
    if(isHidden() && kaOn() && now - lastRevive >= REVIVE_MS){
      lastRevive = now;
      revive();
    }
  }

  setInterval(tick, TICK_MS);

  /* 启动就立刻决定主标签，后面的定时任务才有归属 */
  leaderTick(Date.now());

  /* 其它标签写了租约 → 立刻同步（被接管就退位） */
  window.addEventListener('storage', function(e){
    if(e.key !== LEADER_KEY) return;
    leaderTick(Date.now());
  });

  /* ---------- 4. Worker 心跳：主线程 timer 被节流时救场 ---------- */
  var WORKER_SRC =
    'var h=null;' +
    'self.onmessage=function(e){' +
    '  var d=e.data||{};' +
    '  if(d.cmd==="start"){ if(h)clearInterval(h); h=setInterval(function(){ self.postMessage({t:Date.now()}); },1000); }' +
    '  else if(d.cmd==="stop"){ if(h){ clearInterval(h); h=null; } }' +
    '};';

  function startWorker(){
    if(worker) return true;
    if(typeof Worker === 'undefined' || typeof Blob === 'undefined') return false;
    try{
      workerUrl = URL.createObjectURL(new Blob([WORKER_SRC], { type: 'text/javascript' }));
      worker = new Worker(workerUrl);
      worker.onmessage = function(){
        /* 只有主线程 timer 明显停摆时才接管，避免重复 tick */
        if(Date.now() - lastTick > 2000) tick();
      };
      worker.onerror = function(){
        console.warn('[KA] Worker 异常，5 秒后重建');
        stopWorker();
        setTimeout(startWorker, 5000);
      };
      worker.postMessage({ cmd: 'start' });
      console.log('[KA] Worker 心跳已启动');
      return true;
    }catch(e){
      console.warn('[KA] Worker 不可用', e);
      worker = null;
      return false;
    }
  }

  function stopWorker(){
    try{ if(worker) worker.postMessage({ cmd: 'stop' }); }catch(e){}
    try{ if(worker) worker.terminate(); }catch(e){}
    try{ if(workerUrl) URL.revokeObjectURL(workerUrl); }catch(e){}
    worker = null;
    workerUrl = '';
  }

  startWorker();

  /* ---------- 5. 把 app.js 的启停入口包一层 ---------- */
  (function wrapAppHooks(){
    var _start = window.startKeepAlive;
    if(typeof _start === 'function'){
      window.startKeepAlive = function(){
        startWorker();
        return _start.apply(window, arguments);
      };
    }
    var _apply = window.applyKeepAliveSwitch;
    if(typeof _apply === 'function'){
      window.applyKeepAliveSwitch = function(on){
        var r = _apply.apply(window, arguments);
        if(on){
          startWorker();
          revive('开关打开');
        }
        return r;
      };
    }
    var _stop = window.stopKeepAlive;
    if(typeof _stop === 'function'){
      window.stopKeepAlive = function(){
        return _stop.apply(window, arguments);
      };
    }
  })();

  /* ---------- 6. 首次用户手势 → 解锁自动播放 ---------- */
  (function bindFirstGesture(){
    var GESTURES = ['pointerdown', 'touchstart', 'mousedown', 'keydown', 'click'];
    var fired = false;
    function unlock(){
      if(fired) return;
      fired = true;
      GESTURES.forEach(function(ev){
        document.removeEventListener(ev, unlock, true);
      });
      if(kaOn()){
        revive('首次手势解锁');
        console.log('[KA] 已拿到用户手势，保活音频可正常播放');
      }
    }
    GESTURES.forEach(function(ev){
      document.addEventListener(ev, unlock, { capture: true, passive: true });
    });
  })();

  /* ---------- 7. 生命周期事件兜底 ---------- */
  document.addEventListener('visibilitychange', function(){
    if(isHidden()){
      /* 切后台：记时间点 + 立刻顶一次，并确保 Worker 在跑 */
      try{ localStorage.setItem('mj_last_seen_at_v1', String(Date.now())); }catch(e){}
      startWorker();
      revive('切后台');
    }else{
      var gap = Date.now() - lastTick;
      lastTick = Date.now();
      revive('回前台');
      /* 回前台时如果主标签已经停摆，抢过来 */
      leaderTick(Date.now());
      if(gap > CATCHUP_GAP) catchUp(gap);
    }
  });

  /* bfcache 恢复 */
  window.addEventListener('pageshow', function(e){
    revive('pageshow');
    if(e && e.persisted){
      lastTick = Date.now();
      catchUp(CATCHUP_GAP);
    }
  });

  /* Page Lifecycle 的 freeze / resume（Chrome 系） */
  document.addEventListener('freeze', function(){
    try{ localStorage.setItem('mj_ka_freeze_at', String(Date.now())); }catch(e){}
  });
  document.addEventListener('resume', function(){
    lastTick = Date.now();
    revive('resume');
    catchUp(CATCHUP_GAP);
  });

  window.addEventListener('online', function(){ revive('online'); });

  /* ---------- 8. 申请持久化存储，降低被系统清理概率 ---------- */
  try{
    if(navigator.storage && navigator.storage.persist){
      navigator.storage.persist().catch(function(){});
    }
  }catch(e){}

  /* ---------- 9. 对外 API ---------- */
  window.KA = {
    /* 注册一个由保活层驱动的任务；every 毫秒执行一次，冻结后自动补 */
    on: function(name, fn, everyMs){
      if(typeof fn !== 'function') return;
      tasks.push({ name: String(name || 'task'), fn: fn, every: Math.max(1000, Number(everyMs) || 60000), last: Date.now() });
    },
    revive: revive,
    catchUp: catchUp,
    startWorker: startWorker,
    stopWorker: stopWorker,
    /* 当前标签是不是主标签（后台调度只在主标签跑） */
    isLeader: function(){ return isLeaderTab; },
    tabId: tabId,
    status: function(){
      return {
        kaOn: kaOn(),
        hidden: isHidden(),
        audioRunning: (function(){
          try{
            return !!(typeof _keepAliveAudio !== 'undefined' && _keepAliveAudio && !_keepAliveAudio.paused);
          }catch(e){ return null; }
        })(),
        tasks: tasks.length,
        ticks: stats.ticks,
        wakes: stats.wakes,
        revives: stats.revives,
        lastWakeGapMs: stats.lastWake,
        lastCatchUp: stats.lastCatchUp,
        worker: !!worker,
        leader: isLeaderTab
      };
    }
  };
  console.log('[KA] 保活增强层已加载');
})();
