// ==========================================
// ECR 留言区独立模块
// ==========================================
(function(){
  'use strict';

  window.ECR_CHAT = {
    msgs: [],
    addMsg: function(msg) {
      if(!msg.time) msg.time = Date.now();
      this.msgs.push(msg);
      this.render();
    },
    
    // 清空留言（切换下一题时用）
    clear: function() {
      this.msgs = [];
      this.render();
    },

    render: function() {
      var box = document.getElementById('ecrChatArea');
      if(!box) return;

      var lastTs = 0;
      var html = '';
      var self = this;
      this.msgs.forEach(function(m) {
        var isUser = m.role === 'user';
        var side = isUser ? 'user' : 'char';
        var bubbleClass = isUser ? 'message-sent msg-out message-bubble-user' : 'message-received msg-in message-bubble-char';

        var timeHTML = '<div class="ecr-time-sep">' + self._fmtTime(m.time) + '</div>';

        var activeHTML = '';
        if(!isUser && m.active){
          activeHTML = '<div class="ecr-active-row"><span class="ecr-active-line"></span><span class="ecr-active-text">主动</span></div>';
        }

        var inner = '';
        if(m.voice){
          inner = '<div class="bubble ' + bubbleClass + '" data-side="' + side + '">▶ 语音 ' + m.voice + '"</div>';
        } else if(m.sticker) {
          inner = '<div class="bubble ' + bubbleClass + '" data-side="' + side + '" style="padding:0;background:transparent;border:none"><img src="' + m.sticker + '" style="max-width:100px;border-radius:6px;display:block"></div>';
        } else if(m.kind === 'pinyin' || m.pinyin) {
          inner = '<div class="bubble text-bubble ' + bubbleClass + '" data-side="' + side + '">' + escapeHTML(m.pinyin || '') + '</div><div class="py-tag"><span class="pfx">单字字卡：</span><b><span class="py-word">' + escapeHTML(m.han || '') + '</span></b></div>';
        } else {
          inner = '<div class="bubble ' + bubbleClass + '" data-side="' + side + '">' + escapeHTML(m.text || '') + '</div>';
        }

        var bodyInner = timeHTML + activeHTML + inner;
        if(isUser){
          bodyInner += self._readTagOf(m);
        }

        html += '<div class="ecr-msg-wrap ' + (isUser ? 'me' : 'other') + '"><div class="msg ' + side + '"><div class="msg-body">' + bodyInner + '</div></div></div>';
      });

      html += '<div class="ecr-typing-bar' + (self._typingOn ? ' show' : '') + '">对方正在输入 <span class="dots"><span></span><span></span><span></span></span></div>';

      box.innerHTML = html;
      box.scrollTop = box.scrollHeight;

      box.querySelectorAll('.ecr-voice-bubble').forEach(function(el){
        el.onclick = function(){
          var url = el.dataset.url;
          if(!url) { toast('语音加载中或已失效'); return; }
          var a = new Audio(url);
          a.play().catch(function(){ toast('播放失败'); });
        };
      });
    },

    _typingOn: false,

    typingOn: function(){
      this._typingOn = true;
      var bar = document.querySelector('#ecrChatArea .ecr-typing-bar');
      if(bar) bar.classList.add('show');
      var box = document.getElementById('ecrChatArea');
      if(box) box.scrollTop = box.scrollHeight;
    },

    typingOff: function(){
      this._typingOn = false;
      var bar = document.querySelector('#ecrChatArea .ecr-typing-bar');
      if(bar) bar.classList.remove('show');
    },

    _fmtTime: function(ts){
      try{
        var d = new Date(ts);
        var now = new Date();
        var sameDay = d.toDateString() === now.toDateString();
        var hh = String(d.getHours()).padStart(2,'0');
        var mm = String(d.getMinutes()).padStart(2,'0');
        if(sameDay) return hh + ':' + mm;
        var y = new Date(now.getTime() - 86400000);
        if(d.toDateString() === y.toDateString()) return '昨天 ' + hh + ':' + mm;
        return (d.getMonth()+1) + '月' + d.getDate() + '日 ' + hh + ':' + mm;
      }catch(e){ return ''; }
    },

    _readTagOf: function(m){
      if(!m || m.role !== 'user') return '';
      if(m.readNoReply) return '<div class="read-flush noreply">已读不回</div>';
      return '';
    }
  };
})();