(function(){
  if(window.__peekReady) return;
  window.__peekReady = true;
  var PEEK_ON_KEY = 'mj_peek_on_by_role_v1';
  var PEEK_GLOBAL_KEY = 'mj_peek_v1';
  function readRoleMap(){
    try{
      var m = JSON.parse(localStorage.getItem(PEEK_ON_KEY) || '{}');
      return (m && typeof m === 'object') ? m : {};
    }catch(e){ return {}; }
  }
  function writeRoleMap(m){
    try{ localStorage.setItem(PEEK_ON_KEY, JSON.stringify(m)); }catch(e){}
  }
  function getPeekOn(roleId){
    if(!roleId){
      try{ roleId = (typeof getCurrentRoleId === 'function') ? getCurrentRoleId() : ''; }catch(e){ roleId = ''; }
    }
    if(!roleId) return false;
    var m = readRoleMap();
    return !!m[roleId];
  }
  function setPeekOn(roleId, on){
    if(!roleId){
      try{ roleId = (typeof getCurrentRoleId === 'function') ? getCurrentRoleId() : ''; }catch(e){ roleId = ''; }
    }
    if(!roleId) return;
    var m = readRoleMap();
    m[roleId] = !!on;
    writeRoleMap(m);
    try{
      var g = JSON.parse(localStorage.getItem(PEEK_GLOBAL_KEY) || 'null');
      if(!g || typeof g !== 'object') g = { on:false, rate:0.05, danmaku:15 };
      g.on = !!on;
      localStorage.setItem(PEEK_GLOBAL_KEY, JSON.stringify(g));
    }catch(e){}
  }
  window.getPeekOn = getPeekOn;
  window.setPeekOn = setPeekOn;
    function getWords(){
    try{
      var g = getGroupsByOwner('public').find(function(x){ return x.id === 'g-danmaku'; });
      if(g && g.cats && g.cats[0] && Array.isArray(g.cats[0].list)){
        var arr = g.cats[0].list.map(cardText).map(function(s){ return String(s).trim(); }).filter(Boolean);
        if(arr.length) return arr;
      }
    }catch(e){}
    return ['你想干嘛？','为什么不理我？','为什么？','ta们是谁？','你在看谁？','不许看别人','回我一下好不好','你是不是烦我了','恨你','讨厌你','不要这样','别走','看着我','只能看我一个'];
  }
  function doFlash(){
    var layer = document.getElementById('peekFlashLayer');
    if(layer){
      layer.classList.remove('run');
      void layer.offsetWidth;
      layer.classList.add('run');
    }
    try{
      var ctx = new (window.AudioContext || window.webkitAudioContext)();
      var now = ctx.currentTime;
      var dur = 0.55;
      var buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
      var data = buf.getChannelData(0);
      for(var i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.5;
      var src = ctx.createBufferSource(); src.buffer = buf;
      var bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2000; bp.Q.value = 0.8;
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.22, now + 0.01);
      g.gain.setValueAtTime(0.22, now + dur * 0.5);
      g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      src.connect(bp); bp.connect(g); g.connect(ctx.destination);
      src.start(now); src.stop(now + dur);
    }catch(e){}
  }
  function doDanmaku(seconds){
    var layer = document.getElementById('peekDanmakuLayer');
    if(!layer) return;
    var words = getWords();
    var endTime = Date.now() + seconds * 1000;
    function spawn(){
      if(Date.now() > endTime) return;
      var el = document.createElement('div');
      el.className = 'dm-item';
      el.textContent = words[Math.floor(Math.random() * words.length)];
      el.style.top = (5 + Math.random() * 90) + '%';
      var dur = 1.8 + Math.random() * 1.2;
      el.style.setProperty('--dur', dur + 's');
      el.style.fontSize = (14 + Math.random() * 8) + 'px';
      if(Math.random() < 0.35) el.classList.add('rev');
      layer.appendChild(el);
      requestAnimationFrame(function(){ el.classList.add('run'); });
      setTimeout(function(){ el.remove(); }, dur * 1000 + 120);
    }
    function loop(){
      if(Date.now() > endTime) return;
      spawn();
      if(Math.random() < 0.3) spawn();
      setTimeout(loop, 80 + Math.random() * 120);
    }
    loop();
  }
  window.__peekFlash = doFlash;
  window.__peekDanmaku = doDanmaku;
    function ensureHtml(){
    if(document.getElementById('peekFlashMask')) return;
    var html =
      '<div class="modal" id="peekFlashMask"><div class="overlay"></div>' +
      '<div class="sheet" style="max-width:280px;border-radius:20px;padding:24px 22px 20px;text-align:center;border-top:4px solid #e02020;">' +
      '<div style="display:inline-block;background:#ffeaea;color:#e02020;font-size:10px;font-weight:700;padding:4px 10px;border-radius:12px;letter-spacing:2px;margin-bottom:14px;">⚠️ 光敏警告</div>' +
      '<h3 style="font-size:15px;font-weight:600;color:#1a1a1a;letter-spacing:1px;margin-bottom:10px;">是否开启闪屏特效？</h3>' +
      '<p style="font-size:13px;color:#666;line-height:1.8;margin-bottom:24px;">开启该功能后，部分操作会伴随<b style="color:#e02020;">闪光及黑白闪烁</b>。光敏性癫痫患者请谨慎操作。</p>' +
      '<div style="display:flex;justify-content:space-around;align-items:center;">' +
      '<button id="peekFlashCancel" type="button" style="background:transparent;border:none;font-size:13.5px;color:#999;letter-spacing:3px;cursor:pointer;">取 消</button>' +
      '<button id="peekFlashOk" type="button" style="background:transparent;border:none;font-size:13.5px;color:#1a1a1a;font-weight:600;letter-spacing:3px;cursor:pointer;">确 定</button>' +
      '</div></div></div>' +
      '<div class="modal" id="peekHorrorMask"><div class="overlay"></div>' +
      '<div class="sheet" style="max-width:280px;background:#0a0a0a;border:1px solid #2a0a0a;border-radius:20px;padding:30px 24px 22px;text-align:center;box-shadow:0 0 60px rgba(214,59,59,.35);">' +
      '<h3 style="font-size:15px;font-weight:600;color:#e02020;letter-spacing:5px;margin-bottom:12px;">偷 窥</h3>' +
      '<p style="font-size:12px;color:#9a9a9a;line-height:1.85;margin-bottom:24px;">开启后角色将会有权<b style="color:#e02020;font-weight:600;">偷窥你</b><br>并且<b style="color:#e02020;font-weight:600;">控制你的字卡网站</b><br>可能会删除你的其ta好友，谨慎开启！</p>' +
      '<div style="display:flex;justify-content:space-around;align-items:center;">' +
      '<button id="peekCloseBtn" type="button" style="background:transparent;border:none;font-size:13.5px;color:#666;letter-spacing:3px;cursor:pointer;">取 消</button>' +
      '<button id="peekOkBtn" type="button" style="background:transparent;border:none;font-size:13.5px;color:#e02020;font-weight:600;letter-spacing:3px;cursor:pointer;">确 定</button>' +
      '</div></div></div>' +
      '<div class="flash-layer" id="peekFlashLayer" style="position:fixed;inset:0;pointer-events:none;z-index:9998;opacity:0;"></div>' +
      '<div class="danmaku-layer" id="peekDanmakuLayer" style="position:fixed;inset:0;overflow:hidden;pointer-events:none;z-index:9999;"></div>' +
      '<style>.flash-layer.run{animation:peekFlashAnim .6s steps(1) 1;}@keyframes peekFlashAnim{0%{opacity:0}10%{opacity:1;background:#000}20%{opacity:0}30%{opacity:1;background:#fff}40%{opacity:0}50%{opacity:1;background:#000}60%{opacity:0}70%{opacity:1;background:#e02020}80%{opacity:0}100%{opacity:0}}.dm-item{position:absolute;left:0;white-space:nowrap;font-weight:600;color:#d32f2f;letter-spacing:1px;text-shadow:0 0 1px #d32f2f,0 0 4px rgba(211,47,47,0.6);opacity:0;will-change:transform,opacity;}.dm-item.run{animation:dmFly var(--dur,2s) linear forwards;}@keyframes dmFly{0%{transform:translateX(105vw);opacity:0}6%{opacity:1}92%{opacity:1}100%{transform:translateX(-105%);opacity:0}}.dm-item.rev{animation-name:dmFlyRev;}@keyframes dmFlyRev{0%{transform:translateX(-105%);opacity:0}6%{opacity:1}92%{opacity:1}100%{transform:translateX(105vw);opacity:0}}</style>';
    document.body.insertAdjacentHTML('beforeend', html);
  }
  function mountPeekIcon(){
    var grid = document.querySelector('#drawerFunc .func-grid');
    if(!grid) return;
    if(grid.querySelector('.peek-eye-btn')) return;
    var eye = document.createElement('div');
    eye.className = 'func-item peek-eye-btn';
    eye.innerHTML = '<div class="fi-box" style="border-color:#d63b3b"><span style="font-size:24px;line-height:1;">⚠️</span></div><span class="fi-label" style="color:#d63b3b">？</span>';
    eye.addEventListener('click', function(e){
      e.stopPropagation();
      e.stopImmediatePropagation();
      if(typeof closeAllThings === 'function') closeAllThings('drawer');
      var rid = '';
      try{ rid = (typeof getCurrentRoleId === 'function') ? getCurrentRoleId() : ''; }catch(err){ rid = ''; }
      if(!rid){ if(typeof toast === 'function') toast('找不到当前角色'); return; }
      if(getPeekOn(rid)){
        setPeekOn(rid, false);
        if(typeof toast === 'function') toast('已关闭偷窥');
        return;
      }
      var m = document.getElementById('peekFlashMask');
      if(m) m.classList.add('show');
    });
    grid.appendChild(eye);
  }
  function bindModals(){
    if(window.__peekModalBound) return;
    window.__peekModalBound = true;
    document.addEventListener('click', function(e){
      var t = e.target;
      if(!t || !t.closest) return;
      if(t.closest('#peekFlashCancel')){ document.getElementById('peekFlashMask').classList.remove('show'); return; }
      if(t.closest('#peekFlashOk')){
        document.getElementById('peekFlashMask').classList.remove('show');
        doFlash();
        setTimeout(function(){ var m = document.getElementById('peekHorrorMask'); if(m) m.classList.add('show'); }, 350);
        return;
      }
      if(t.closest('#peekCloseBtn')){ document.getElementById('peekHorrorMask').classList.remove('show'); return; }
      if(t.closest('#peekOkBtn')){
        document.getElementById('peekHorrorMask').classList.remove('show');
        var rid = '';
        try{ rid = (typeof getCurrentRoleId === 'function') ? getCurrentRoleId() : ''; }catch(err){ rid = ''; }
        if(rid){ setPeekOn(rid, true); if(typeof toast === 'function') toast('偷窥特权已开启'); }
        return;
      }
      var mask = t.closest('#peekFlashMask, #peekHorrorMask');
      if(mask && t === mask){ mask.classList.remove('show'); }
    }, true);
  }
  function init(){
    ensureHtml();
    bindModals();
    mountPeekIcon();
    document.addEventListener('click', function(e){
      if(e.target.closest && e.target.closest('#plusBtn')){ setTimeout(mountPeekIcon, 100); }
    }, true);
  }
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();