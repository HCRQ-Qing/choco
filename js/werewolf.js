/* ============================================================
   群聊 · 狼人杀（本地单机 / AI 补位）
   - 4 人局 / 6 人局 / 8 人局
   - 夜晚：狼人击杀、预言家验人、女巫用药
   - 白天：发言、投票放逐、循环至分出胜负
   - 只有一个全局出口：window.openWerewolf
   ============================================================ */
(function(){
  if(window.__werewolfReady) return;
  window.__werewolfReady = true;

  var ROLE_CN = { wolf:'狼人', seer:'预言家', witch:'女巫', hunter:'猎人', villager:'村民' };
  var CONFIGS = {
    4: { wolf:1, seer:1, witch:0, hunter:0, villager:2 },
    6: { wolf:2, seer:1, witch:1, hunter:0, villager:2 },
    8: { wolf:2, seer:1, witch:1, hunter:1, villager:3 }
  };
  var SPEECH = [
    '我觉得今天要仔细看看大家的发言。',
    '我昨天睡得很沉，什么都没听见。',
    '先别急着投票，信息还不够。',
    '我怀疑有人在带节奏。',
    '我是好人，请相信我。',
    '昨晚的动静有点奇怪。',
    '我想再听一圈发言。',
    '如果没人说，我就先投一个。'
  ];
  var state = null;

  function rnd(a, b){ return a + Math.floor(Math.random() * (b - a + 1)); }
  function pick(a){ return a[Math.floor(Math.random() * a.length)]; }
  function shuffle(a){
    var arr = a.slice();
    for(var i = arr.length - 1; i > 0; i--){
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  function injectStyle(){
    if(document.getElementById('werewolfStyles')) return;
    var st = document.createElement('style');
    st.id = 'werewolfStyles';
    st.textContent = `
.ww-mask{position:fixed;inset:0;z-index:1600;background:#fff;display:flex;flex-direction:column;animation:wwIn .22s ease}
@keyframes wwIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.ww-head{display:flex;align-items:center;padding:14px 16px 12px;border-bottom:.7px solid #f0f0f0;flex:none}
.ww-title{flex:1;text-align:center;font-size:14px;letter-spacing:6px;text-indent:6px;color:#1a1a1a}
.ww-x{width:34px;height:34px;border:none;background:transparent;font-size:16px;color:#1a1a1a;cursor:pointer;font-family:inherit}
.ww-body{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:14px 16px 120px}
.ww-status{font-size:11.5px;color:#888;letter-spacing:1px;margin-bottom:12px;line-height:1.7}
.ww-grid{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px}
.ww-player{width:calc(50% - 4px);box-sizing:border-box;border:.8px solid #ececec;border-radius:12px;padding:10px 11px;display:flex;align-items:center;gap:8px}
.ww-player.dead{opacity:.42}
.ww-player.me{border-color:#1a1a1a}
.ww-av{width:30px;height:30px;border-radius:50%;background:#1a1a1a;color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;flex:none}
.ww-pname{font-size:12px;color:#1a1a1a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1}
.ww-prole{font-size:9.5px;color:#999;letter-spacing:.5px;flex:none}
.ww-dead-tag{font-size:9px;color:#bbb;letter-spacing:1px}
.ww-log-title{font-size:10px;letter-spacing:3px;color:#bbb;margin:8px 0 8px}
.ww-log{border:.8px solid #f0f0f0;border-radius:12px;padding:12px;max-height:260px;overflow-y:auto}
.ww-line{font-size:11.5px;line-height:1.85;color:#555;padding:2px 0;border-bottom:.6px dashed #f4f4f4}
.ww-line.key{color:#1a1a1a;font-weight:600}
.ww-line.sys{color:#999}
.ww-actions{position:absolute;left:0;right:0;bottom:0;background:#fff;border-top:.8px solid #f0f0f0;padding:12px 16px calc(14px + env(safe-area-inset-bottom))}
.ww-act-tip{font-size:11.5px;color:#888;letter-spacing:.6px;margin-bottom:10px;text-align:center}
.ww-btns{display:flex;flex-wrap:wrap;gap:8px;justify-content:center}
.ww-btn{padding:9px 14px;border:.8px solid #ddd;border-radius:20px;background:transparent;font-family:inherit;font-size:12px;color:#1a1a1a;cursor:pointer;letter-spacing:.5px}
.ww-btn:active{background:#f4f4f4}
.ww-btn.primary{background:#1a1a1a;color:#fff;border-color:#1a1a1a}
.ww-btn.danger{border-color:#1a1a1a}
.ww-center{padding:40px 20px;text-align:center}
.ww-big{font-size:17px;font-weight:600;letter-spacing:4px;text-indent:4px;color:#1a1a1a;margin-bottom:8px}
.ww-sub{font-size:12px;color:#888;line-height:1.9;margin-bottom:20px}
.ww-mode{display:flex;flex-direction:column;gap:12px;padding:22px 18px}
.ww-mode-card{border:.8px solid #e8e8e8;border-radius:14px;padding:15px 16px;cursor:pointer;background:#fff}
.ww-mode-card:active{background:#fafafa}
.ww-mode-t{font-size:13.5px;font-weight:600;color:#1a1a1a;letter-spacing:1px}
.ww-mode-d{font-size:11px;color:#999;line-height:1.8;margin-top:5px}
`;
    document.head.appendChild(st);
  }

  function getName(p){ return p && p.name ? p.name : '？'; }

  /* ---------- 入口 ---------- */
  function openWerewolf(){
    injectStyle();
    closeWW();
    var mask = document.createElement('div');
    mask.className = 'ww-mask';
    mask.id = 'werewolfMask';
    mask.innerHTML =
      '<div class="ww-head"><div style="width:34px"></div>' +
        '<div class="ww-title">狼 人 杀</div>' +
        '<button class="ww-x" type="button">✕</button></div>' +
      '<div class="ww-body" id="wwBody"></div>' +
      '<div class="ww-actions" id="wwActions" style="position:relative;border-top:.8px solid #f0f0f0"></div>';
    document.body.appendChild(mask);
    mask.querySelector('.ww-x').onclick = function(){ mask.remove(); };
    renderModeSelect();
  }
  function closeWW(){
    var el = document.getElementById('werewolfMask');
    if(el) el.remove();
  }
  function body(){ return document.getElementById('wwBody'); }
  function actions(){ return document.getElementById('wwActions'); }

  function renderModeSelect(){
    var b = body();
    if(!b) return;
    actions().innerHTML = '';
    b.innerHTML = '<div class="ww-mode">' +
      '<div style="text-align:center;margin-bottom:6px"><div class="ww-big">选 择 模 式</div>' +
      '<div class="ww-sub">你 + 群里的角色一起玩，不够的人数会自动补位。</div></div>' +
      modeCard(4, '4 人局', '1 狼人 · 1 预言家 · 2 村民') +
      modeCard(6, '6 人局', '2 狼人 · 1 预言家 · 1 女巫 · 2 村民') +
      modeCard(8, '8 人局', '2 狼人 · 1 预言家 · 1 女巫 · 1 猎人 · 3 村民') +
      '<div style="font-size:10.5px;color:#bbb;line-height:1.9;text-align:center;margin-top:6px">' +
        '夜晚狼人击杀、预言家验人、女巫用药；白天发言并投票放逐。<br>消灭所有狼人则好人胜利。</div>' +
    '</div>';
    b.querySelectorAll('[data-mode]').forEach(function(el){
      el.onclick = function(){ startGame(Number(el.dataset.mode)); };
    });
  }
  function modeCard(n, title, desc){
    return '<div class="ww-mode-card" data-mode="' + n + '">' +
      '<div class="ww-mode-t">' + title + '</div>' +
      '<div class="ww-mode-d">' + desc + '</div></div>';
  }

  /* ---------- 开局 ---------- */
  function startGame(n){
    var group = (typeof getGroupById === 'function') ? getGroupById(window.__curGroupId) : null;
    var mems = [];
    try{
      if(group && Array.isArray(group.members)){
        mems = group.members.map(function(rid){ return getRoleById(rid); }).filter(Boolean);
      }
    }catch(e){ mems = []; }

    var players = [];
    players.push({ id:'__me__', name:userName(), isUser:true, alive:true, role:null });
    var i = 0;
    while(players.length < n){
      var r = mems[i];
      if(r && r.name) players.push({ id:'r_' + (r.id || i), name:displayName(r), isUser:false, alive:true, role:null });
      else players.push({ id:'bot_' + i, name:'路人' + String.fromCharCode(65 + i % 26), isUser:false, alive:true, role:null });
      i++;
    }

    var cfg = CONFIGS[n];
    var roles = [];
    ['wolf','seer','witch','hunter','villager'].forEach(function(k){
      for(var j = 0; j < cfg[k]; j++) roles.push(k);
    });
    roles = shuffle(roles).slice(0, n);
    players = shuffle(players);
    players.forEach(function(p, idx){ p.role = roles[idx]; });

    state = {
      n: n,
      players: players,
      nightNo: 0,
      log: [],
      over: false,
      wolfTarget: null,
      witchSaved: false,
      poisonTarget: null,
      seerResult: null,
      antidote: true,
      poison: true
    };
    renderAll();
    addLog('游戏开始 · ' + n + ' 人局', 'sys');
    setTimeout(beginNight, 700);
  }

  function me(){
    return state ? state.players.find(function(p){ return p.isUser; }) : null;
  }
  function alive(){ return state.players.filter(function(p){ return p.alive; }); }
  function aliveWolves(){ return alive().filter(function(p){ return p.role === 'wolf'; }); }
  function roleAlive(role){ return alive().filter(function(p){ return p.role === role; }); }
  function byId(id){ return state.players.find(function(p){ return p.id === id; }); }
  function aliveOthers(p){ return alive().filter(function(x){ return x.id !== p.id; }); }

  function addLog(text, cls){
    if(!state) return;
    state.log.push({ text:String(text || ''), cls:cls || '' });
    renderLog();
  }

  function renderAll(){
    renderPlayers();
    renderLog();
  }

  function renderPlayers(){
    var b = body();
    if(!b || !state) return;
    var mine = me();
    var myRole = mine && mine.role ? ROLE_CN[mine.role] : '';
    var isEnc = state.modeSel !== false;

    var head = '<div class="ww-status">' +
      '第 ' + Math.max(1, state.nightNo) + (state.phase === 'night' ? ' 夜' : ' 天') +
      ' · 存活 ' + alive().length + ' / ' + state.n + ' 人' +
      (mine ? ' · 你是「' + myRole + '」' + (mine.alive ? '' : '（已出局）') : '') +
    '</div>';

    var grid = state.players.map(function(p){
      var roleTxt = (p.isUser || !p.alive) ? ROLE_CN[p.role] : '身份未知';
      var av = escapeHTML(String(p.name || '?').slice(0, 1));
      return '<div class="ww-player ' + (p.alive ? '' : 'dead') + (p.isUser ? ' me' : '') + '">' +
        '<div class="ww-av">' + av + '</div>' +
        '<div class="ww-pname">' + escapeHTML(p.name) + '</div>' +
        '<div class="ww-prole">' + escapeHTML(roleTxt) + (p.alive ? '' : ' · 出局') + '</div>' +
      '</div>';
    }).join('');

    b.innerHTML = head + '<div class="ww-grid">' + grid + '</div>' +
      '<div class="ww-log-title">L O G</div>' +
      '<div class="ww-log" id="wwLog">' + logHTML() + '</div>';
  }

  function logHTML(){
    if(!state) return '';
    return state.log.map(function(l){
      return '<div class="ww-line ' + l.cls + '">' + escapeHTML(l.text) + '</div>';
    }).join('');
  }

  function renderLog(){
    var el = document.getElementById('wwLog');
    if(!el){
      var b = body();
      if(b && state){
        /* 还没有日志容器（模式选择阶段）直接跳过 */
      }
      return;
    }
    el.innerHTML = logHTML();
    el.scrollTop = el.scrollHeight;
  }

  function setTip(tip){ actions().innerHTML = '<div class="ww-act-tip">' + tip + '</div><div class="ww-btns"></div>'; }

  function setActions(tip, buttons){
    actions().innerHTML = '<div class="ww-act-tip">' + escapeHTML(tip) + '</div><div class="ww-btns" id="wwBtns"></div>';
    var box = actions().querySelector('#wwBtns');
    (buttons || []).forEach(function(btn){
      var el = document.createElement('button');
      el.className = 'ww-btn' + (btn.cls ? ' ' + btn.cls : '');
      el.type = 'button';
      el.textContent = btn.label;
      el.onclick = function(){
        actions().innerHTML = '';
        btn.onClick && btn.onClick();
      };
      box.appendChild(el);
    });
  }

  /* 让玩家从候选里点一个人 */
  function askTarget(tip, candidates, cb){
    var buttons = candidates.map(function(p){
      return { label:p.name, onClick: function(){ cb(p); } };
    });
    buttons.push({ label:'放弃', cls:'', onClick: function(){ cb(null); } });
    setActions(tip, buttons);
  }

  /* ---------- 夜晚 ---------- */
  function beginNight(){
    if(!state || state.over) return;
    state.nightNo++;
    state.phase = 'night';
    state.wolfTarget = null;
    state.poisonTarget = null;
    state.witchSaved = false;
    state.seerResult = null;
    renderPlayers();
    addLog('第 ' + state.nightNo + ' 夜 · 天黑请闭眼', 'key');
    setTimeout(wolfStep, 500);
  }

  function wolfStep(){
    if(!state || state.over) return;
    var wolves = aliveWolves();
    var targets = alive().filter(function(p){ return p.role !== 'wolf'; });
    if(!wolves.length || !targets.length){ afterWolf(null); return; }
    var mine = me();
    if(mine && mine.alive && mine.role === 'wolf'){
      setTip('狼人请选择今晚要击杀的目标');
      askTarget('狼人请选择今晚要击杀的目标', targets, function(p){ afterWolf(p); });
    } else {
      var t = pick(targets);
      addLog('狼人在黑夜里做出了决定。', 'sys');
      setTimeout(function(){ afterWolf(t); }, 600);
    }
  }

  function afterWolf(target){
    state.wolfTarget = target ? target.id : null;
    seerStep();
  }

  function seerStep(){
    if(!state || state.over) return;
    var seer = roleAlive('seer')[0];
    var mine = me();
    if(!seer){ witchStep(); return; }
    if(mine && mine.alive && mine.role === 'seer'){
      askTarget('预言家请选择要查验的人', aliveOthers(mine), function(p){
        if(p){
          state.seerResult = { id:p.id, wolf:p.role === 'wolf' };
          addLog('你查验了「' + p.name + '」：' + (p.role === 'wolf' ? '狼人' : '好人'), 'key');
        } else {
          addLog('你今晚没有查验任何人。', 'sys');
        }
        setTimeout(witchStep, 500);
      });
    } else {
      var t = pick(aliveOthers(seer));
      if(t){ state.seerResult = { id:t.id, wolf:t.role === 'wolf' }; }
      setTimeout(witchStep, 500);
    }
  }

  function witchStep(){
    if(!state || state.over) return;
    var witch = roleAlive('witch')[0];
    var mine = me();
    if(!witch){ resolveNight(); return; }
    var hasAntidote = state.antidote;
    var hasPoison = state.poison;
    var victim = state.wolfTarget ? byId(state.wolfTarget) : null;

    if(mine && mine.alive && mine.role === 'witch'){
      var btns = [];
      if(hasAntidote && victim){
        btns.push({ label:'用解药救 ' + victim.name, cls:'primary', onClick:function(){
          state.witchSaved = true;
          state.antidote = false;
          addLog('你使用解药救下了 ' + victim.name + '。', 'key');
          setTimeout(resolveNight, 500);
        }});
      }
      if(hasPoison){
        btns.push({ label:'使用毒药', cls:'danger', onClick:function(){
          askTarget('女巫请选择要毒杀的人', alive(), function(p){
            if(p){
              state.poisonTarget = p.id;
              state.poison = false;
              addLog('你毒杀了 ' + p.name + '。', 'key');
            } else {
              addLog('你把毒药收了回去。', 'sys');
            }
            setTimeout(resolveNight, 500);
          });
        }});
      }
      btns.push({ label:'今晚不用药', onClick:function(){
        addLog('你今晚没有用药。', 'sys');
        setTimeout(resolveNight, 500);
      }});
      setActions('女巫请选择是否用药', btns);
    } else {
      /* AI 女巫 */
      setTip('夜晚行动中…');
      if(hasAntidote && victim && Math.random() < 0.7){
        state.witchSaved = true;
        state.antidote = false;
        addLog('女巫用了解药。', 'sys');
      } else if(hasPoison && Math.random() < 0.35){
        var others = alive().filter(function(p){ return p.id !== witch.id; });
        if(others.length){
          state.poisonTarget = pick(others).id;
          state.poison = false;
          addLog('女巫用了一瓶毒药。', 'sys');
        }
      }
      setTimeout(resolveNight, 700);
    }
  }

  function resolveNight(){
    if(!state || state.over) return;
    actions().innerHTML = '';
    var deaths = [];
    if(state.wolfTarget && !state.witchSaved) deaths.push(state.wolfTarget);
    if(state.poisonTarget && deaths.indexOf(state.poisonTarget) < 0) deaths.push(state.poisonTarget);

    if(!deaths.length){
      addLog('天亮了 · 昨晚是平安夜。', 'key');
    } else {
      var names = deaths.map(function(id){
        var p = byId(id);
        killPlayer(p);
        return p ? p.name : '';
      }).filter(Boolean);
      addLog('天亮了 · 昨晚出局：' + names.join('、'), 'key');
    }
    renderPlayers();
    setTimeout(function(){
      if(checkWin()) return;
      startDay();
    }, 900);
  }

  function killPlayer(p){
    if(!p || !p.alive) return;
    p.alive = false;
    /* 猎人自动带走一人 */
    if(p.role === 'hunter'){
      var others = alive().filter(function(x){ return x.id !== p.id; });
      if(others.length){
        var t = pick(others);
        t.alive = false;
        addLog('猎人 ' + p.name + ' 出局，带走了 ' + t.name + '。', 'sys');
      }
    }
  }

  /* ---------- 白天 ---------- */
  function startDay(){
    if(!state || state.over) return;
    state.phase = 'day';
    renderPlayers();
    addLog('第 ' + state.nightNo + ' 天 · 开始发言', 'sys');

    var speakers = alive();
    speakers.forEach(function(p){
      addLog(p.name + '：' + pick(SPEECH));
    });

    var mine = me();
    setTimeout(function(){
      if(state.over) return;
      if(mine && mine.alive){
        var cands = aliveOthers(mine);
        askTarget('请选择你要投票放逐的人', cands, function(p){ doVote(p); });
      } else {
        setTip('你已出局，观战中…');
        setTimeout(function(){ doVote(null); }, 1200);
      }
    }, 700);
  }

  function doVote(userPick){
    if(!state || state.over) return;
    var counts = {};
    var votes = {};
    var mine = me();
    var voters = alive();
    if(mine && mine.alive && userPick){
      counts[userPick.id] = (counts[userPick.id] || 0) + 1;
      votes[mine.id] = userPick.id;
    }
    voters.forEach(function(p){
      if(p.isUser) return;
      var cands = alive().filter(function(x){ return x.id !== p.id; });
      if(!cands.length) return;
      var target;
      if(p.role === 'wolf'){
        var goods = cands.filter(function(x){ return x.role !== 'wolf'; });
        target = randSafe(goods) || randSafe(cands);
      } else {
        target = randSafe(cands);
      }
      if(target){
        counts[target.id] = (counts[target.id] || 0) + 1;
        votes[p.id] = target.id;
      }
    });

    var max = 0, top = [];
    Object.keys(counts).forEach(function(id){
      if(counts[id] > max){ max = counts[id]; top = [id]; }
      else if(counts[id] === max){ top.push(id); }
    });

    if(!top.length || max === 0 || top.length > 1){
      addLog('投票结束 · 平票，本轮无人出局。', 'key');
    } else {
      var out = byId(top[0]);
      if(out){
        killPlayer(out);
        addLog('投票结果 · ' + out.name + ' 被放逐，身份是「' + ROLE_CN[out.role] + '」。', 'key');
      }
    }
    renderPlayers();
    setTimeout(function(){
      if(checkWin()) return;
      if(allWolvesDead()) return;
      beginNight();
    }, 900);
  }
  function randSafe(a){ return a && a.length ? pick(a) : null; }

  function allWolvesDead(){
    return state.players.filter(function(p){ return p.role === 'wolf'; }).every(function(p){ return !p.alive; });
  }

  /* ---------- 胜负 ---------- */
  function checkWin(){
    if(!state || state.over) return false;
    var wolves = state.players.filter(function(p){ return p.role === 'wolf' && p.alive; }).length;
    var goods = state.players.filter(function(p){ return p.role !== 'wolf' && p.alive; }).length;
    if(wolves === 0){ endGame('good'); return true; }
    if(wolves >= goods){ endGame('wolf'); return true; }
    return false;
  }

  function endGame(winner){
    if(!state) return;
    state.over = true;
    state.phase = 'over';
    var all = state.players.map(function(p){
      return p.name + '·' + ROLE_CN[p.role] + (p.alive ? '（存活）' : '（出局）');
    }).join('　');
    var title = winner === 'wolf' ? '狼人胜利' : '好人胜利';
    addLog('游戏结束 · ' + title, 'key');
    addLog('身份揭晓：' + all, 'sys');
    renderPlayers();
    actions().innerHTML =
      '<div class="ww-act-tip">' + escapeHTML(title) + '</div>' +
      '<div class="ww-btns">' +
        '<button class="ww-btn primary" type="button" data-act="again">再来一局</button>' +
        '<button class="ww-btn" type="button" data-act="back">返回</button>' +
      '</div>';
    actions().querySelector('[data-act="again"]').onclick = function(){
      var n = state.n;
      startGame(n);
    };
    actions().querySelector('[data-act="back"]').onclick = function(){ closeWW(); };
  }

  window.openWerewolf = openWerewolf;
})();
