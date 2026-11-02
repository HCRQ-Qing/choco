(function(){
  'use strict';

  var LOCK_TIMEOUT = 10000;
  var running = {};
  var timers = {};

  function releaseLock(roleId){
    if(timers[roleId]){ clearTimeout(timers[roleId]); delete timers[roleId]; }
    delete running[roleId];
  }

  var ReplyRunner = {
    isRunning: function(roleId){ return !!running[roleId]; },
    release: function(roleId){ releaseLock(roleId); },
    start: function(roleId, fn){
      if(running[roleId]) return false;
      running[roleId] = true;
      timers[roleId] = setTimeout(function(){
        console.warn('[ReplyRunner] 超时强制解锁：' + roleId);
        releaseLock(roleId);
      }, LOCK_TIMEOUT);
      var finished = false;
      try{
        fn(function(){
          if(finished) return;
          finished = true;
          releaseLock(roleId);
        });
      }catch(e){
        console.error('[ReplyRunner] fn 抛错', e);
        if(!finished){ finished = true; releaseLock(roleId); }
      }
      return true;
    }
  };
  window.ReplyRunner = ReplyRunner;

  var _replyQueue = [];
  var _replyQueueRunning = false;

  function armReplyTimer(msg){
    if(!msg || !msg.id) return;
    if(_replyQueue.some(function(x){ return x.id === msg.id; })) return;
    _replyQueue.push({ id: msg.id, armedAt: Date.now() });
    _drainReplyQueue();
  }

  function findMsg(id){
    var arr = window.__getCurMsgs ? window.__getCurMsgs() : [];
    for(var i = 0; i < arr.length; i++){ if(arr[i] && arr[i].id === id) return arr[i]; }
    return null;
  }

  function _drainReplyQueue(){
    if(_replyQueueRunning) return;
    if(!_replyQueue.length) return;

    while(_replyQueue.length){
      var item0 = _replyQueue[0];
      var m0 = findMsg(item0.id);
      if(!m0 || m0.recalled || m0.sys || m0.namecard || m0.replyHandled === true){
        _replyQueue.shift();
        continue;
      }
      break;
    }
    if(!_replyQueue.length) return;

    _replyQueueRunning = true;
    var item = _replyQueue.shift();
    var cur = findMsg(item.id);
    if(!cur){
      _replyQueueRunning = false;
      _drainReplyQueue();
      return;
    }

    var r = window.getReply ? window.getReply() : {};
    var dMin = (typeof r.minDelay === 'number') ? r.minDelay : 1000;
    var dMax = (typeof r.maxDelay === 'number') ? Math.max(dMin, r.maxDelay) : 10000;
    var delayMs = dMin + Math.random() * (dMax - dMin);

    setTimeout(function(){
      var released = false;
      function _release(){
        if(released) return;
        released = true;
        _replyQueueRunning = false;
        try{ _drainReplyQueue(); }catch(e){ console.error('drain 重入失败', e); }
      }

      try{
        var now = findMsg(item.id);
        if(!now || now.recalled || now.sys || now.namecard){ _release(); return; }

        if(now.readState === 'unread' && window._applyReadStateUpTo){
          try{ window._applyReadStateUpTo(now, 'read'); }catch(e){ console.error(e); }
        }

        var rr = window.getReply ? window.getReply() : {};
        var noReplyAllowed = (rr.noReplyOn !== false);
        var noReplyProb = (typeof rr.noReplyRate === 'number') ? rr.noReplyRate : 0.25;
        var isNoReply = noReplyAllowed && (Math.random() < noReplyProb);

        if(isNoReply){
          var mNow = findMsg(item.id);
          if(mNow){
            mNow.readState = 'noReply';
            mNow.readNoReply = true;
            mNow.readAt = Date.now();
            mNow.replyHandled = true;
            if(window.saveMsgs) window.saveMsgs();
            try{ if(window._refreshReadFlushText) window._refreshReadFlushText(); }catch(e){}
          }
          _release();
          return;
        }

        var timeout = setTimeout(function(){
          console.warn('[回复线] triggerReply 超时未回调，强制解锁');
          try{ ReplyRunner.release(roleIdOfCur()); }catch(e){}
          _release();
        }, LOCK_TIMEOUT + 2000);

        function roleIdOfCur(){
          try{ return (window.getCurrentRoleId && window.getCurrentRoleId()) || 'r1'; }catch(e){ return 'r1'; }
        }

        try{
          window.triggerReply(function(){
            clearTimeout(timeout);
            var mNow2 = findMsg(item.id);
            if(mNow2 && mNow2.replyHandled !== true){
              mNow2.replyHandled = true;
              if(window.saveMsgs) window.saveMsgs();
            }
            _release();
          });
        }catch(e){
          clearTimeout(timeout);
          console.error('triggerReply 抛错', e);
          _release();
        }
      }catch(e){
        console.error('回复线出错', e);
        _release();
      }
    }, delayMs);
  }
  window._drainReplyQueue = _drainReplyQueue;
  window.armReplyTimer = armReplyTimer;
  
  var pendingReply = {};

  function triggerReply(onFinish){
    var roleId = (window.getCurrentRoleId && window.getCurrentRoleId()) || 'r1';

    if(ReplyRunner.isRunning(roleId)){
      pendingReply[roleId] = true;
      if(typeof onFinish === 'function') pendingReply[roleId + '__finish'] = onFinish;
      if(typeof onFinish === 'function'){ try{ onFinish(); }catch(e){} }
      return;
    }
    pendingReply[roleId] = false;

    ReplyRunner.start(roleId, function(done){
      runReplyChain(function(){
        if(pendingReply[roleId]){
          pendingReply[roleId] = false;
          done();
          if(typeof onFinish === 'function'){ try{ onFinish(); }catch(e){} }
          setTimeout(function(){ triggerReply(); }, 300);
        } else {
          done();
          if(typeof onFinish === 'function'){ try{ onFinish(); }catch(e){} }
        }
      });
    });
  }
  window.triggerReply = triggerReply;

  function runReplyChain(onDone){
    var r = window.getReply ? window.getReply() : {};
    var role = window.getRole ? window.getRole() : {};
    var roleId = (window.getCurrentRoleId && window.getCurrentRoleId()) || 'r1';
    var dMin = (typeof r.minDelay === 'number') ? r.minDelay : 1000;
    var dMax = (typeof r.maxDelay === 'number') ? Math.max(dMin, r.maxDelay) : 10000;
    var delay = dMin + Math.random() * (dMax - dMin);

    if(!window.__chainTimers) window.__chainTimers = {};
    if(window.__chainTimers[roleId]){
      window.__chainTimers[roleId].forEach(function(t){ clearTimeout(t); });
    }
    window.__chainTimers[roleId] = [];
    var _chainTok = Symbol('chain');
    window.__chainToken = window.__chainToken || {};
    window.__chainToken[roleId] = _chainTok;

    function stillSameRole(){
      return ((window.getCurrentRoleId && window.getCurrentRoleId()) || 'r1') === roleId;
    }

    var typingAt = Math.random() * dMin;
    var _typingTimer = setTimeout(function(){
      if(window.__chainToken[roleId] !== _chainTok){ onDone(); return; }
      if(!stillSameRole()){ onDone(); return; }
      try{
        var arr = window.__getCurMsgs ? window.__getCurMsgs() : [];
        var changed = false;
        arr.forEach(function(mm){
          if(!mm || mm.role !== 'user') return;
          if(mm.recalled || mm.sys || mm.namecard) return;
          if(mm.readState === 'unread'){ mm.readState = 'read'; mm.readAt = Date.now(); changed = true; }
        });
        if(changed){
          if(window.saveMsgs) window.saveMsgs();
          if(stillSameRole() && window.__forceRenderChat){ window.__forceRenderChat(); }
          if(stillSameRole() && window.renderChatFull){ window.renderChatFull(false); }
        }
      }catch(e){}
      if(window.showTypingBar) window.showTypingBar();
    }, typingAt);
    window.__chainTimers[roleId].push(_typingTimer);
    var emitAt = Math.max(typingAt, delay - typingAt);

    var res;
    try{ res = window.genReply ? window.genReply() : null; }
    catch(e){ console.error('genReply 出错', e); onDone(); return; }
    if(!res || !res[0] || res[0].kind !== 'bubbles'){ if(window.hideTypingBar) window.hideTypingBar(); onDone(); return; }

    var _emitTimer = setTimeout(function(){
      if(window.__chainToken[roleId] !== _chainTok){ onDone(); return; }
      if(!stillSameRole()){ onDone(); return; }
      try{ if(window.hideTypingBar) window.hideTypingBar(); }catch(e){}
      if(!window.buildMsgsFromBubbles || !window.appendMsgToRole){ onDone(); return; }
      var outMsgs = window.buildMsgsFromBubbles(res[0].bubbles, roleId, null);
      if(!outMsgs.length){ onDone(); return; }
      var targets = outMsgs.slice();
      var idx = 0;
      var r2 = window.getReply ? window.getReply() : {};
      var bMin = (typeof r2.minDelay === 'number') ? r2.minDelay : 1000;
      var bMax = (typeof r2.maxDelay === 'number') ? Math.max(bMin, r2.maxDelay) : 10000;
      if(!window.__bubbleTimers) window.__bubbleTimers = {};
      if(window.__bubbleTimers[roleId]){
        window.__bubbleTimers[roleId].forEach(function(t){ clearTimeout(t); });
      }
      window.__bubbleTimers[roleId] = [];
      var _tok = Symbol('bubble');
      window.__bubbleToken = window.__bubbleToken || {};
      window.__bubbleToken[roleId] = _tok;
      function emitOne(){
        if(window.__bubbleToken[roleId] !== _tok){ onDone(); return; }
        if(!stillSameRole()){ onDone(); return; }
        if(idx >= targets.length){ onDone(); return; }
        if(window.showTypingBar) window.showTypingBar();
        var wait = bMin + Math.random() * (bMax - bMin);
        var _t = setTimeout(function(){
          if(window.__bubbleToken[roleId] !== _tok){ onDone(); return; }
          if(!stillSameRole()){ onDone(); return; }
          if(window.hideTypingBar) window.hideTypingBar();
          var m = targets[idx++];
          try{
            var rr = window.getReply ? window.getReply(roleId) : {};
            var qOn = (rr.quoteOn !== false);
            var qRate = (typeof rr.quoteRate === 'number') ? rr.quoteRate : 0.08;
            if(qOn && Math.random() < qRate && window.buildQuoteTarget){
              var _qt = window.buildQuoteTarget(roleId);
              if(_qt) m.quote = _qt;
            } else if(m.quote){
              delete m.quote;
            }
          }catch(e){}
          var _id = window.appendMsgToRole(roleId, m);
          if(_id && window.tryRoleReaction){ try{ window.tryRoleReaction(roleId, _id); }catch(e){} }
          if(idx >= targets.length){
            if(window.hideTypingBar) window.hideTypingBar();
            onDone();
            return;
          }
          var _gap = setTimeout(function(){
            if(window.__bubbleToken[roleId] !== _tok){ onDone(); return; }
            emitOne();
          }, 120);
          window.__bubbleTimers[roleId].push(_gap);
        }, wait);
        window.__bubbleTimers[roleId].push(_t);
      }
      emitOne();
    }, Math.max(0, delay - typingAt));
  }
  window.runReplyChain = runReplyChain;
})();