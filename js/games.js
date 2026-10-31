/* ============================================================
   小游戏：2048 + 斗兽棋
   - 入口：聊天抽屉 → 小游戏
   - 仅一对一聊天可用
   ============================================================ */
(function(){
  if(document.getElementById('gamesScreenStyle')) return;

  var st = document.createElement('style');
  st.id = 'gamesScreenStyle';
  st.textContent = [
    '#gamesLobby{position:fixed;inset:0;z-index:1500;max-width:520px;margin:0 auto;background:#f7f5f0;display:none;flex-direction:column;font-family:"Songti SC","STSong","SimSun","宋体",serif;color:#1a1a1a}',
    '#gamesLobby.on{display:flex}',
    '#gamesLobby .gl-top{flex:none;display:flex;align-items:center;padding:22px 24px 12px}',
    '#gamesLobby .gl-back{width:36px;height:36px;border:none;background:transparent;font-size:24px;color:#1a1a1a;cursor:pointer;opacity:.5;font-family:inherit;padding:0 0 4px}',
    '#gamesLobby .gl-title{flex:1;text-align:center;font-size:15px;font-weight:300;letter-spacing:8px}',
    '#gamesLobby .gl-body{flex:1;overflow-y:auto;padding:20px 24px}',
    '#gamesLobby .gl-card{background:#fff;border-radius:16px;padding:22px 18px;margin-bottom:16px;box-shadow:0 2px 12px rgba(0,0,0,.05);cursor:pointer;display:flex;align-items:center;gap:16px;border:0.7px solid rgba(0,0,0,.06);transition:transform .15s}',
    '#gamesLobby .gl-card:active{transform:scale(.98)}',
    '#gamesLobby .gl-ic{width:56px;height:56px;border-radius:14px;flex:none;display:flex;align-items:center;justify-content:center;font-size:26px}',
    '#gamesLobby .gl-info{flex:1;min-width:0}',
    '#gamesLobby .gl-name{font-size:16px;font-weight:400;letter-spacing:1px}',
    '#gamesLobby .gl-desc{font-size:11px;color:#999;margin-top:5px;letter-spacing:.5px;line-height:1.5}',

    /* 2048 */
    '#game2048{position:fixed;inset:0;z-index:1501;max-width:520px;margin:0 auto;background:#faf8ef;display:none;flex-direction:column;font-family:"Songti SC","STSong",serif;color:#776e65}',
    '#game2048.on{display:flex}',
    '#game2048 .g-top{flex:none;display:flex;align-items:center;padding:18px 20px 10px}',
    '#game2048 .g-back{width:36px;height:36px;border:none;background:transparent;font-size:24px;color:#776e65;cursor:pointer;font-family:inherit;padding:0 0 4px}',
    '#game2048 .g-title{flex:1;text-align:center;font-size:28px;font-weight:700;letter-spacing:2px}',
    '#game2048 .g-score{display:flex;gap:10px;padding:0 20px 14px}',
    '#game2048 .g-sc-box{flex:1;background:#bbada0;border-radius:8px;padding:8px;text-align:center;color:#fff}',
    '#game2048 .g-sc-l{font-size:10px;letter-spacing:2px;opacity:.8}',
    '#game2048 .g-sc-v{font-size:20px;font-weight:700}',
    '#game2048 .g-board{flex:1;display:flex;align-items:center;justify-content:center;padding:10px 20px}',
    '#game2048 .g-grid{width:min(92vw,400px);aspect-ratio:1;background:#bbada0;border-radius:10px;padding:3%;display:grid;grid-template-columns:repeat(4,1fr);grid-template-rows:repeat(4,1fr);gap:3%;position:relative;touch-action:none}',
    '#game2048 .g-cell{background:rgba(238,228,218,.35);border-radius:6px}',
    '#game2048 .g-tile{position:absolute;display:flex;align-items:center;justify-content:center;font-weight:700;border-radius:6px;transition:transform .12s ease;background:#eee4da;color:#776e65;font-size:26px}',
    '#game2048 .g-tile[data-v="2"]{background:#eee4da;color:#776e65}',
    '#game2048 .g-tile[data-v="4"]{background:#ede0c8;color:#776e65}',
    '#game2048 .g-tile[data-v="8"]{background:#f2b179;color:#fff}',
    '#game2048 .g-tile[data-v="16"]{background:#f59563;color:#fff}',
    '#game2048 .g-tile[data-v="32"]{background:#f67c5f;color:#fff}',
    '#game2048 .g-tile[data-v="64"]{background:#f65e3b;color:#fff}',
    '#game2048 .g-tile[data-v="128"]{background:#edcf72;color:#fff;font-size:22px}',
    '#game2048 .g-tile[data-v="256"]{background:#edcc61;color:#fff;font-size:22px}',
    '#game2048 .g-tile[data-v="512"]{background:#edc850;color:#fff;font-size:22px}',
    '#game2048 .g-tile[data-v="1024"]{background:#edc53f;color:#fff;font-size:18px}',
    '#game2048 .g-tile[data-v="2048"]{background:#edc22e;color:#fff;font-size:18px}',
    '#game2048 .g-tile[data-v="4096"],#game2048 .g-tile[data-v="8192"]{background:#3c3a32;color:#fff;font-size:16px}',
    '#game2048 .g-ctrl{flex:none;padding:14px 20px 28px;display:flex;gap:10px;justify-content:center}',
    '#game2048 .g-btn{padding:10px 22px;border-radius:10px;border:none;background:#8f7a66;color:#fff;font-size:13px;letter-spacing:2px;cursor:pointer;font-family:inherit}',
    '#game2048 .g-overlay{position:absolute;inset:0;background:rgba(238,228,218,.73);border-radius:10px;display:none;flex-direction:column;align-items:center;justify-content:center;z-index:10}',
    '#game2048 .g-overlay.show{display:flex}',
    '#game2048 .g-over-t{font-size:32px;font-weight:700;color:#776e65;margin-bottom:14px}',

    /* 斗兽棋 */
    '#gameJungle{position:fixed;inset:0;z-index:1501;max-width:520px;margin:0 auto;background:#f0ebe0;display:none;flex-direction:column;font-family:"Songti SC","STSong",serif;color:#3a3a3a}',
    '#gameJungle.on{display:flex}',
    '#gameJungle .j-top{flex:none;display:flex;align-items:center;padding:18px 20px 10px}',
    '#gameJungle .j-back{width:36px;height:36px;border:none;background:transparent;font-size:24px;color:#3a3a3a;cursor:pointer;font-family:inherit;padding:0 0 4px}',
    '#gameJungle .j-title{flex:1;text-align:center;font-size:16px;font-weight:400;letter-spacing:6px}',
    '#gameJungle .j-turn{flex:none;text-align:center;padding:6px 20px;font-size:13px;letter-spacing:2px}',
    '#gameJungle .j-turn span.r{color:#c0392b;font-weight:700}',
    '#gameJungle .j-turn span.b{color:#2c3e50;font-weight:700}',
    '#gameJungle .j-board-wrap{flex:1;display:flex;align-items:center;justify-content:center;padding:10px}',
    '#gameJungle .j-board{width:min(92vw,440px);aspect-ratio:7/9;display:grid;grid-template-columns:repeat(7,1fr);grid-template-rows:repeat(9,1fr);gap:1px;background:#b8a88a;border:2px solid #8b7355;border-radius:6px;overflow:hidden;user-select:none}',
    '#gameJungle .j-cell{background:#e8dfc8;position:relative;display:flex;align-items:center;justify-content:center;font-size:22px;cursor:pointer}',
    '#gameJungle .j-cell.water{background:#7ec8e3}',
    '#gameJungle .j-cell.trap{background:#f5c6c6}',
    '#gameJungle .j-cell.den{background:#d4c5a0}',
    '#gameJungle .j-cell.sel{box-shadow:inset 0 0 0 3px #f39c12}',
    '#gameJungle .j-cell.move::after{content:"";position:absolute;width:30%;height:30%;border-radius:50%;background:rgba(243,156,18,.5)}',
    '#gameJungle .j-piece{width:82%;height:82%;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;color:#fff;box-shadow:0 2px 6px rgba(0,0,0,.2);border:2px solid rgba(255,255,255,.5)}',
    '#gameJungle .j-piece.r{background:linear-gradient(135deg,#e74c3c,#c0392b)}',
    '#gameJungle .j-piece.b{background:linear-gradient(135deg,#34495e,#2c3e50)}',
    '#gameJungle .j-ctrl{flex:none;padding:14px 20px 28px;display:flex;gap:10px;justify-content:center}',
    '#gameJungle .j-btn{padding:10px 22px;border-radius:10px;border:none;background:#8b7355;color:#fff;font-size:13px;letter-spacing:2px;cursor:pointer;font-family:inherit}',
    '#gameJungle .j-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:10;display:none;align-items:center;justify-content:center}',
    '#gameJungle .j-overlay.show{display:flex}',
    '#gameJungle .j-win{background:#fff;border-radius:16px;padding:28px 36px;text-align:center;box-shadow:0 10px 40px rgba(0,0,0,.3)}',
    '#gameJungle .j-win-t{font-size:20px;font-weight:700;margin-bottom:16px;letter-spacing:4px}'
  ].join('');
  document.head.appendChild(st);

  /* ===== 游戏大厅 ===== */
  var lobby = document.createElement('div');
  lobby.id = 'gamesLobby';
  lobby.innerHTML =
    '<div class="gl-top">' +
      '<button class="gl-back" id="glBack">‹</button>' +
      '<div class="gl-title">小 游 戏</div>' +
      '<div style="width:36px"></div>' +
    '</div>' +
    '<div class="gl-body">' +
      '<div class="gl-card" data-game="2048">' +
        '<div class="gl-ic" style="background:#edc22e;color:#fff">2048</div>' +
        '<div class="gl-info"><div class="gl-name">2048</div><div class="gl-desc">滑动合并相同数字，挑战 2048！</div></div>' +
      '</div>' +
      '<div class="gl-card" data-game="jungle">' +
        '<div class="gl-ic" style="background:#27ae60;color:#fff">🐾</div>' +
        '<div class="gl-info"><div class="gl-name">斗兽棋</div><div class="gl-desc">经典动物棋，大吃小、陷阱、河流规则</div></div>' +
      '</div>' +
    '</div>';
  document.body.appendChild(lobby);

  lobby.querySelector('#glBack').onclick = function(){ lobby.classList.remove('on'); };
  lobby.querySelectorAll('.gl-card').forEach(function(c){
    c.onclick = function(){
      var g = c.dataset.game;
      if(g === '2048'){ start2048(); }
      else if(g === 'jungle'){ startJungle(); }
    };
  });

  window.openGameLobby = function(){ lobby.classList.add('on'); };

  /* ===== 2048 ===== */
  var g2048 = document.createElement('div');
  g2048.id = 'game2048';
  g2048.innerHTML =
    '<div class="g-top">' +
      '<button class="g-back" id="g2048Back">‹</button>' +
      '<div class="g-title">2048</div>' +
      '<div style="width:36px"></div>' +
    '</div>' +
    '<div class="g-score">' +
      '<div class="g-sc-box"><div class="g-sc-l">SCORE</div><div class="g-sc-v" id="g2048Score">0</div></div>' +
      '<div class="g-sc-box"><div class="g-sc-l">BEST</div><div class="g-sc-v" id="g2048Best">0</div></div>' +
    '</div>' +
    '<div class="g-board"><div class="g-grid" id="g2048Grid"></div></div>' +
    '<div class="g-ctrl">' +
      '<button class="g-btn" id="g2048New">新 局</button>' +
    '</div>';
  document.body.appendChild(g2048);

  g2048.querySelector('#g2048Back').onclick = function(){ g2048.classList.remove('on'); };
  g2048.querySelector('#g2048New').onclick = function(){ init2048(); };

  var grid, score, best, over;
  var SIZE = 4;

  function init2048(){
    grid = Array.from({length:SIZE},function(){return Array(SIZE).fill(0);});
    score = 0;
    over = false;
    best = parseInt(localStorage.getItem('mj_2048_best')||'0',10);
    addRandom(); addRandom();
    render2048();
  }
  function addRandom(){
    var empty = [];
    for(var r=0;r<SIZE;r++)for(var c=0;c<SIZE;c++) if(!grid[r][c]) empty.push([r,c]);
    if(!empty.length) return;
    var p = empty[Math.floor(Math.random()*empty.length)];
    grid[p[0]][p[1]] = Math.random()<0.9?2:4;
  }
  function render2048(){
    var el = document.getElementById('g2048Grid');
    if(!el) return;
    document.getElementById('g2048Score').textContent = score;
    document.getElementById('g2048Best').textContent = best;
    /* 背景格 */
    el.innerHTML = '';
    for(var i=0;i<SIZE*SIZE;i++){
      var cell = document.createElement('div');
      cell.className = 'g-cell';
      el.appendChild(cell);
    }
    /* 数字块 */
    var rect = el.getBoundingClientRect();
    var cellSize = (rect.width * 0.94) / SIZE;
    var gap = rect.width * 0.03 / (SIZE+1) * SIZE;
    var step = cellSize + (rect.width*0.03/(SIZE+1));
    for(var r=0;r<SIZE;r++){
      for(var c=0;c<SIZE;c++){
        var v = grid[r][c];
        if(!v) continue;
        var t = document.createElement('div');
        t.className = 'g-tile';
        t.dataset.v = v;
        t.style.width = cellSize + 'px';
        t.style.height = cellSize + 'px';
        t.style.left = (c*(cellSize+rect.width*0.03/(SIZE+1)) + rect.width*0.03/(SIZE+1)) + 'px';
        t.style.top = (r*(cellSize+rect.width*0.03/(SIZE+1)) + rect.width*0.03/(SIZE+1)) + 'px';
        t.textContent = v;
        el.appendChild(t);
      }
    }
  }
  function move(dir){
    if(over) return;
    var moved = false;
    var get = function(r,c){ return grid[r][c]; };
    var set = function(r,c,v){ grid[r][c]=v; };
    function slideLine(line){
      var arr = line.filter(function(x){return x;});
      for(var i=0;i<arr.length-1;i++){
        if(arr[i]===arr[i+1]){ arr[i]*=2; score+=arr[i]; arr[i+1]=0; }
      }
      arr = arr.filter(function(x){return x;});
      while(arr.length<SIZE) arr.push(0);
      return arr;
    }
    var newGrid = Array.from({length:SIZE},function(){return Array(SIZE).fill(0);});
    if(dir==='left'){
      for(var r=0;r<SIZE;r++){
        var nl = slideLine(grid[r].slice());
        for(var c=0;c<SIZE;c++){ if(nl[c]!==grid[r][c]) moved=true; newGrid[r][c]=nl[c]; }
      }
    } else if(dir==='right'){
      for(var r=0;r<SIZE;r++){
        var nl2 = slideLine(grid[r].slice().reverse()).reverse();
        for(var c=0;c<SIZE;c++){ if(nl2[c]!==grid[r][c]) moved=true; newGrid[r][c]=nl2[c]; }
      }
    } else if(dir==='up'){
      for(var c=0;c<SIZE;c++){
        var col=[]; for(var r=0;r<SIZE;r++) col.push(grid[r][c]);
        var nc = slideLine(col);
        for(var r=0;r<SIZE;r++){ if(nc[r]!==grid[r][c]) moved=true; newGrid[r][c]=nc[r]; }
      }
    } else if(dir==='down'){
      for(var c=0;c<SIZE;c++){
        var col2=[]; for(var r=0;r<SIZE;r++) col2.push(grid[r][c]);
        var nc2 = slideLine(col2.reverse()).reverse();
        for(var r=0;r<SIZE;r++){ if(nc2[r]!==grid[r][c]) moved=true; newGrid[r][c]=nc2[r]; }
      }
    }
    if(moved){
      grid = newGrid;
      addRandom();
      if(score>best){ best=score; localStorage.setItem('mj_2048_best', best); }
      render2048();
      check2048Over();
    }
  }
  function check2048Over(){
    for(var r=0;r<SIZE;r++)for(var c=0;c<SIZE;c++){
      if(!grid[r][c]) return;
      if(c<SIZE-1 && grid[r][c]===grid[r][c+1]) return;
      if(r<SIZE-1 && grid[r][c]===grid[r+1][c]) return;
    }
    over = true;
    if(window.toast) toast('游戏结束！得分 ' + score);
  }
  function start2048(){
    lobby.classList.remove('on');
    g2048.classList.add('on');
    init2048();
  }
  /* 触摸滑动 */
  var tsx, tsy;
  g2048.addEventListener('touchstart', function(e){
    tsx = e.touches[0].clientX; tsy = e.touches[0].clientY;
  }, {passive:true});
  g2048.addEventListener('touchend', function(e){
    if(tsx==null) return;
    var dx = e.changedTouches[0].clientX - tsx;
    var dy = e.changedTouches[0].clientY - tsy;
    if(Math.abs(dx)<20 && Math.abs(dy)<20) return;
    if(Math.abs(dx)>Math.abs(dy)) move(dx>0?'right':'left');
    else move(dy>0?'down':'up');
    tsx=null;
  }, {passive:true});
  /* 键盘 */
  document.addEventListener('keydown', function(e){
    if(!g2048.classList.contains('on')) return;
    if(e.key==='ArrowLeft'){move('left');e.preventDefault();}
    else if(e.key==='ArrowRight'){move('right');e.preventDefault();}
    else if(e.key==='ArrowUp'){move('up');e.preventDefault();}
    else if(e.key==='ArrowDown'){move('down');e.preventDefault();}
  });

  /* ===== 斗兽棋 ===== */
  /* 动物等级：1象 2狮 3虎 4豹 5狼 6狗 7猫 8鼠
     大吃小，鼠吃象，同级互吃。陷阱使对方变0级。河流：狮虎可跳，鼠可游。 */
  var ANIMALS = {8:'鼠',7:'猫',6:'狗',5:'狼',4:'豹',3:'虎',2:'狮',1:'象'};
  var ROWS=9, COLS=7;
  /* 河流位置 */
  var WATER = [[3,1],[3,2],[3,4],[3,5],[4,1],[4,2],[4,4],[4,5],[5,1],[5,2],[5,4],[5,5]];
  /* 陷阱 */
  var TRAPS_R = [[0,2],[0,4],[1,3]];
  var TRAPS_B = [[8,2],[8,4],[7,3]];
  /* 兽穴 */
  var DEN_R = [0,3], DEN_B = [8,3];

  var jBoard, jTurn, jSel, jGameOver;

  function jungleInit(){
    jBoard = Array.from({length:ROWS},function(){return Array(COLS).fill(null);});
    /* 红方（下方） */
    jBoard[8][0]={s:'b',lv:1};jBoard[8][6]={s:'b',lv:1};
    jBoard[7][1]={s:'b',lv:3};jBoard[7][5]={s:'b',lv:2};
    jBoard[6][0]={s:'b',lv:4};jBoard[6][2]={s:'b',lv:6};jBoard[6][4]={s:'b',lv:7};jBoard[6][6]={s:'b',lv:5};
    /* 蓝方（上方） */
    jBoard[0][0]={s:'r',lv:1};jBoard[0][6]={s:'r',lv:1};
    jBoard[1][1]={s:'r',lv:3};jBoard[1][5]={s:'r',lv:2};
    jBoard[2][0]={s:'r',lv:4};jBoard[2][2]={s:'r',lv:6};jBoard[2][4]={s:'r',lv:7};jBoard[2][6]={s:'r',lv:5};
    jTurn = 'r';
    jSel = null;
    jGameOver = false;
    renderJungle();
  }
  function isWater(r,c){ return WATER.some(function(w){return w[0]===r&&w[1]===c;}); }
  function isTrap(r,c,s){
    if(s==='r') return TRAPS_B.some(function(t){return t[0]===r&&t[1]===c;});
    return TRAPS_R.some(function(t){return t[0]===r&&t[1]===c;});
  }
  function isDen(r,c,s){
    if(s==='r') return DEN_B[0]===r&&DEN_B[1]===c;
    return DEN_R[0]===r&&DEN_R[1]===c;
  }
  function canCapture(att, def){
    if(!def) return true;
    if(def.s===att.s) return false;
    var aLv = isTrap(defCell(att)[0],defCell(att)[1],att.s)?0:att.lv;
    var dLv = isTrap(defCell(def)[0],defCell(def)[1],def.s)?0:def.lv;
    /* 鼠吃象 */
    if(att.lv===8 && def.lv===1) return true;
    if(att.lv===1 && def.lv===8) return false;
    return aLv >= dLv;
  }
  function defCell(piece){
    for(var r=0;r<ROWS;r++)for(var c=0;c<COLS;c++) if(jBoard[r][c]===piece) return [r,c];
    return [-1,-1];
  }
  function getValidMoves(r,c){
    var p = jBoard[r][c];
    if(!p) return [];
    var moves = [];
    var dirs = [[-1,0],[1,0],[0,-1],[0,1]];
    dirs.forEach(function(d){
      var nr=r+d[0], nc=c+d[1];
      if(nr<0||nr>=ROWS||nc<0||nc>=COLS) return;
      var target = jBoard[nr][nc];
      /* 不能进自己的兽穴 */
      if(isDen(nr,nc,p.s)) return;
      if(isWater(nr,nc)){
        /* 只有鼠能游 */
        if(p.lv!==8) return;
        if(target && target.s===p.s) return;
        moves.push([nr,nc]);
      } else {
        if(target){
          if(target.s===p.s) return;
          if(canCapture(p,target)) moves.push([nr,nc]);
        } else {
          moves.push([nr,nc]);
        }
      }
    });
    /* 狮虎跳河 */
    if(p.lv===2||p.lv===3){
      /* 横向跳 */
      if(isWater(r,c-1)||isWater(r,c+1)){
        for(var dc=-1;dc<=1;dc+=2){
          var nc2=c;
          while(nc2+dc>=0 && nc2+dc<COLS && isWater(r,nc2+dc)) nc2+=dc;
          nc2+=dc;
          if(nc2>=0&&nc2<COLS){
            var t = jBoard[r][nc2];
            if(!t || (t.s!==p.s && canCapture(p,t))) moves.push([r,nc2]);
          }
        }
      }
      /* 纵向跳 */
      if((r>=1&&r<=7) && (isWater(r-1,c)||isWater(r+1,c))){
        for(var dr=-1;dr<=1;dr+=2){
          var nr2=r;
          while(nr2+dr>=0 && nr2+dr<ROWS && isWater(nr2+dr,c)) nr2+=dr;
          nr2+=dr;
          if(nr2>=0&&nr2<ROWS){
            var t2 = jBoard[nr2][c];
            if(!t2 || (t2.s!==p.s && canCapture(p,t2))) moves.push([nr2,c]);
          }
        }
      }
    }
    return moves;
  }

  var jEl = document.createElement('div');
  jEl.id = 'gameJungle';
  jEl.innerHTML =
    '<div class="j-top">' +
      '<button class="j-back" id="jBack">‹</button>' +
      '<div class="j-title">斗 兽 棋</div>' +
      '<div style="width:36px"></div>' +
    '</div>' +
    '<div class="j-turn" id="jTurn">当前：<span class="r">红方</span></div>' +
    '<div class="j-board-wrap"><div class="j-board" id="jBoard"></div></div>' +
    '<div class="j-ctrl"><button class="j-btn" id="jNew">新 局</button></div>' +
    '<div class="j-overlay" id="jOverlay"><div class="j-win"><div class="j-win-t" id="jWinText"></div><button class="j-btn" id="jWinOk">再 来 一 局</button></div></div>';
  document.body.appendChild(jEl);
  jEl.querySelector('#jBack').onclick = function(){ jEl.classList.remove('on'); };
  jEl.querySelector('#jNew').onclick = function(){ jungleInit(); };
  jEl.querySelector('#jWinOk').onclick = function(){
    jEl.querySelector('#jOverlay').classList.remove('show');
    jungleInit();
  };

  function renderJungle(){
    var bd = document.getElementById('jBoard');
    if(!bd) return;
    bd.innerHTML = '';
    for(var r=0;r<ROWS;r++){
      for(var c=0;c<COLS;c++){
        var cell = document.createElement('div');
        cell.className = 'j-cell';
        if(isWater(r,c)) cell.classList.add('water');
        else if(isTrap(r,c,'r')||isTrap(r,c,'b')) cell.classList.add('trap');
        else if(isDen(r,c,'r')||isDen(r,c,'b')) cell.classList.add('den');
        var p = jBoard[r][c];
        if(p){
          var pc = document.createElement('div');
          pc.className = 'j-piece ' + p.s;
          pc.textContent = ANIMALS[p.lv];
          cell.appendChild(pc);
        }
        if(jSel && jSel[0]===r && jSel[1]===c) cell.classList.add('sel');
        cell.dataset.r = r; cell.dataset.c = c;
        cell.onclick = (function(rr,cc){ return function(){ jClick(rr,cc); }; })(r,c);
        bd.appendChild(cell);
      }
    }
    /* 标记可走点 */
    if(jSel){
      var moves = getValidMoves(jSel[0],jSel[1]);
      moves.forEach(function(m){
        var idx = m[0]*COLS+m[1];
        var ch = bd.children[idx];
        if(ch) ch.classList.add('move');
      });
    }
    var tu = document.getElementById('jTurn');
    if(tu) tu.innerHTML = '当前：' + (jTurn==='r'?'<span class="r">红方</span>':'<span class="b">蓝方</span>');
  }
  function jClick(r,c){
    if(jGameOver) return;
    var p = jBoard[r][c];
    if(jSel){
      var moves = getValidMoves(jSel[0],jSel[1]);
      var canGo = moves.some(function(m){return m[0]===r&&m[1]===c;});
      if(canGo){
        /* 检查是否占领对方兽穴 */
        var mover = jBoard[jSel[0]][jSel[1]];
        if(isDen(r,c, mover.s==='r'?'b':'r')){
          jBoard[r][c] = mover;
          jBoard[jSel[0]][jSel[1]] = null;
          jGameOver = true;
          jSel = null;
          renderJungle();
          var wt = document.getElementById('jWinText');
          if(wt) wt.textContent = (mover.s==='r'?'红方':'蓝方') + ' 胜利！';
          jEl.querySelector('#jOverlay').classList.add('show');
          return;
        }
        jBoard[r][c] = mover;
        jBoard[jSel[0]][jSel[1]] = null;
        jSel = null;
        jTurn = jTurn==='r'?'b':'r';
        /* 检查一方是否无棋可走/无子 */
        if(!hasAnyPieces(jTurn)){
          jGameOver = true;
          var wt2 = document.getElementById('jWinText');
          if(wt2) wt2.textContent = (jTurn==='r'?'蓝方':'红方') + ' 胜利！';
          jEl.querySelector('#jOverlay').classList.add('show');
        }
        renderJungle();
        return;
      }
      /* 重新选自己的子 */
      if(p && p.s===jTurn){ jSel=[r,c]; renderJungle(); return; }
      jSel = null; renderJungle(); return;
    }
    if(p && p.s===jTurn){ jSel=[r,c]; renderJungle(); }
  }
  function hasAnyPieces(s){
    for(var r=0;r<ROWS;r++)for(var c=0;c<COLS;c++) if(jBoard[r][c]&&jBoard[r][c].s===s) return true;
    return false;
  }
  function startJungle(){
    lobby.classList.remove('on');
    jEl.classList.add('on');
    jungleInit();
  }
})();

/* ============================================================
   群聊飞行棋（openGroupLudo）
   ------------------------------------------------------------
   - 群成员 + 我，最多 4 方，每人 1 枚棋子
   - 掷到 6 起飞；每回合按骰子前进
   - 绕场一圈（40 格）先到终点者获胜
   - 同一格撞到别人 → 对方回机场重新起飞
   - 角色自动掷骰，用户点按钮掷
   ============================================================ */
(function(){
  'use strict';
  var mask = null;
  var state = null;
  var gen = 0;                 /* 每次重开/关闭 +1，用来作废旧定时器 */
  var PERIM = 40;

  function cellPos(i){
    if(i < 11) return [0, i];
    if(i < 21) return [i - 10, 10];
    if(i < 31) return [10, 10 - (i - 20)];
    return [10 - (i - 30), 0];
  }

  function ensureMask(){
    if(mask) return mask;
    mask = document.createElement('div');
    mask.id = 'gchLudo';
    mask.style.cssText =
      'position:fixed;inset:0;z-index:2147483000;background:#fff;max-width:520px;margin:0 auto;' +
      'display:none;flex-direction:column;overflow:hidden;font-family:inherit;color:#1a1a1a';
    document.body.appendChild(mask);
    return mask;
  }

  function buildBoard(){
    var map = {};
    for(var i = 0; i < PERIM; i++){
      var p = cellPos(i);
      map[p[0] * 11 + p[1]] = i;
    }
    var html = '<div style="display:grid;grid-template-columns:repeat(11,1fr);grid-template-rows:repeat(11,1fr);gap:2px;' +
      'width:min(88vw,342px);aspect-ratio:1/1;margin:0 auto">';
    for(var r = 0; r < 11; r++){
      for(var c = 0; c < 11; c++){
        var k = r * 11 + c;
        if(map[k] !== undefined){
          var idx = map[k];
          var bg = '#ffffff';
          if(idx === 0) bg = '#eef7ee';
          else if(idx === PERIM - 1) bg = '#fdf3e7';
          html += '<div class="ld-cell" data-idx="' + idx + '" style="position:relative;display:flex;align-items:center;' +
            'justify-content:center;background:' + bg + ';border:0.6px solid rgba(0,0,0,.12);border-radius:4px;overflow:hidden"></div>';
        } else {
          html += '<div></div>';
        }
      }
    }
    html += '</div>';
    return html;
  }

  function initState(){
    var players = [];
    var uname = (typeof userName === 'function') ? userName() : '我';
    players.push({ name: uname, isUser: true, color: '#1a1a1a', pos: -1, started: false, done: false });
    var g = (typeof getGroupById === 'function') ? getGroupById(window.__curGroupId) : null;
    var colors = ['#e57373', '#64b5f6', '#81c784'];
    var mem = (g && g.members || []).slice(0, 3);
    mem.forEach(function(rid, i){
      var r = (typeof getRoleById === 'function') ? getRoleById(rid) : null;
      if(!r) return;
      players.push({
        name: (typeof displayName === 'function' ? displayName(r) : r.name) || '?',
        isUser: false,
        color: colors[i % 3],
        pos: -1, started: false, done: false
      });
    });
    return { players: players, turn: 0, busy: false, over: false, logs: [] };
  }

  function log(t){
    if(!state) return;
    state.logs.unshift(t);
    if(state.logs.length > 30) state.logs.length = 30;
    var box = mask.querySelector('#ldLog');
    if(box){
      box.innerHTML = state.logs.map(function(s){ return '<div>' + escapeHTML(s) + '</div>'; }).join('');
    }
  }

  function renderHangar(){
    var box = mask.querySelector('#ldHangar');
    if(!box || !state) return;
    box.innerHTML = state.players.map(function(p){
      if(p.done) return '<span style="color:' + p.color + '">🏁 ' + escapeHTML(p.name) + ' 已到终点</span>';
      if(p.started) return '<span style="color:' + p.color + '">● ' + escapeHTML(p.name) + ' 第 ' + (p.pos + 1) + ' 格</span>';
      return '<span>○ ' + escapeHTML(p.name) + ' 待起飞</span>';
    }).join('');
  }

  function renderPieces(){
    if(!mask || !state) return;
    mask.querySelectorAll('.ld-cell').forEach(function(cell){ cell.innerHTML = ''; });
    state.players.forEach(function(p){
      if(!p.started) return;
      var idx = p.done ? PERIM - 1 : p.pos;
      var cell = mask.querySelector('.ld-cell[data-idx="' + idx + '"]');
      if(!cell) return;
      var dot = document.createElement('div');
      dot.style.cssText = 'width:66%;aspect-ratio:1/1;border-radius:50%;background:' + p.color +
        ';border:1.5px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.2)';
      cell.appendChild(dot);
    });
  }

  function renderInfo(){
    var info = mask.querySelector('#ldInfo');
    if(!info || !state) return;
    if(state.over){
      var w = state.players.find(function(x){ return x.done; });
      info.innerHTML = '<div style="font-size:15px;letter-spacing:2px">🏁 ' + escapeHTML(w ? w.name : '') + ' 获胜</div>';
      return;
    }
    var p = state.players[state.turn];
    var diceShown = (typeof state.lastDice === 'number') ? state.lastDice : '🎲';
    info.innerHTML = '<div style="font-size:12px;color:#999;letter-spacing:1px">' +
      (p && p.isUser ? '轮到你掷骰子' : '轮到 ' + escapeHTML(p ? p.name : '') + ' 掷骰子') +
      '</div><div id="ldDice" style="font-size:30px;line-height:1.3;font-weight:300;letter-spacing:2px">' + diceShown + '</div>';
  }

  function rollFor(p){
    var dice = 1 + Math.floor(Math.random() * 6);
    state.lastDice = dice;
    var diceEl = mask.querySelector('#ldDice');
    if(diceEl) diceEl.textContent = dice;
    if(!p.started){
      if(dice === 6){ p.started = true; p.pos = 0; log(p.name + ' 掷出 6，起飞！'); }
      else log(p.name + ' 掷出 ' + dice + '，还没起飞');
      return;
    }
    p.pos += dice;
    if(p.pos >= PERIM){
      p.pos = PERIM - 1;
      p.done = true;
      log(p.name + ' 掷出 ' + dice + '，到达终点！');
      return;
    }
    log(p.name + ' 掷出 ' + dice + '，走到第 ' + (p.pos + 1) + ' 格');
    /* 撞子：同格的其他已起飞玩家回机场 */
    state.players.forEach(function(q){
      if(q === p || !q.started || q.done) return;
      if(q.pos === p.pos){
        q.pos = -1; q.started = false;
        log(p.name + ' 把 ' + q.name + ' 撞回了机场');
      }
    });
  }

  function nextTurn(token){
    if(!state || state.over || token !== gen) return;
    state.busy = false;
    state.turn = (state.turn + 1) % state.players.length;
    renderInfo();
    var p = state.players[state.turn];
    if(p && !p.isUser){
      setTimeout(function(){
        if(!state || state.over || token !== gen) return;
        if(state.players[state.turn] !== p) return;
        doRoll(p);
      }, 800 + Math.random() * 700);
    }
  }

  function doRoll(p){
    if(!state || state.busy || state.over) return;
    state.busy = true;
    var token = gen;
    renderInfo();
    rollFor(p);
    renderHangar();
    renderPieces();
    renderInfo();
    if(p.done){
      state.over = true;
      renderInfo();
      var btn = mask.querySelector('#ldRoll');
      if(btn) btn.style.opacity = '.4';
      return;
    }
    setTimeout(function(){ nextTurn(token); }, 700);
  }

  function restart(){
    gen++;
    state = initState();
    var btn = mask.querySelector('#ldRoll');
    if(btn) btn.style.opacity = '1';
    renderHangar();
    renderPieces();
    renderInfo();
    log('新的一局开始，掷到 6 才能起飞');
  }

  window.openGroupLudo = function(){
    if(typeof getGroupById === 'function' && !getGroupById(window.__curGroupId)){
      if(typeof toast === 'function') toast('先打开一个群聊再玩飞行棋');
      return;
    }
    var m = ensureMask();
    if(!m.__built){
      m.__built = true;
      m.innerHTML =
        '<div style="flex:none;display:flex;align-items:center;gap:10px;padding:18px 18px 8px">' +
          '<button id="ldBack" type="button" style="width:36px;height:36px;flex:none;border:none;background:transparent;font-size:22px;opacity:.6">‹</button>' +
          '<div style="flex:1;text-align:center;font-size:15px;font-weight:300;letter-spacing:6px">飞 行 棋</div>' +
          '<div style="width:36px;flex:none"></div>' +
        '</div>' +
        '<div id="ldHangar" style="flex:none;display:flex;gap:12px;justify-content:center;flex-wrap:wrap;padding:0 16px 8px;font-size:11px;color:#999"></div>' +
        '<div style="flex:none;padding:0 12px">' + buildBoard() + '</div>' +
        '<div id="ldInfo" style="flex:none;text-align:center;padding:12px 18px 2px"></div>' +
        '<div id="ldLog" style="flex:1;overflow-y:auto;padding:4px 20px;font-size:11.5px;color:#999;line-height:1.75"></div>' +
        '<div style="flex:none;padding:10px 18px 20px;display:flex;gap:10px">' +
          '<button id="ldRoll" type="button" style="flex:1;height:46px;border:none;border-radius:23px;background:#1a1a1a;color:#fff;font-size:14px;letter-spacing:4px">掷 骰 子</button>' +
          '<button id="ldRestart" type="button" style="flex:none;width:94px;height:46px;border:0.6px solid rgba(0,0,0,.15);border-radius:23px;background:#fff;color:#1a1a1a;font-size:13px">重开</button>' +
        '</div>';
      m.querySelector('#ldBack').onclick = function(){
        gen++;
        m.style.display = 'none';
        if(state) state.over = true;
      };
      m.querySelector('#ldRestart').onclick = function(){ restart(); };
      m.querySelector('#ldRoll').onclick = function(){
        if(!state) return;
        var p = state.players[state.turn];
        if(!p) return;
        if(!p.isUser){
          if(typeof toast === 'function') toast('轮到 ' + p.name + ' 了');
          return;
        }
        doRoll(p);
      };
    }
    m.style.display = 'flex';
    restart();
  };
})();
