// js/diagnose.js
(function(){
  window.runDiagnose = async function() {
    let logs = [];
    const log = (msg) => { logs.push(msg); };
    log("================ choco 深度体检报告 ================");
    log("UA: " + navigator.userAgent);
    
    log("\n【1. 环境与存储超载】");
    try {
      if (window.indexedDB) log("IndexedDB: 支持"); else log("IndexedDB: 禁用");
    } catch(e) { log("IndexedDB 报错: " + e.message); }
    try {
      let total = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        total += (localStorage.getItem(k) || "").length;
      }
      log(`LocalStorage: ${(total/1024).toFixed(1)}KB (达 5000KB 会卡死)`);
      if (total > 4000 * 1024) log("⚠️ 警告：存储快满了，极易导致发不出消息！");
    } catch(e) { log("LocalStorage 报错: " + e.message); }

    log("\n【2. 隐形遮挡与跨域隔离 (点不了原因)】");
    try {
      const el = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
      if (!el) log("⚠️ 屏幕中央不可点击 (可能被完全遮挡)");
      else {
        log(`屏幕顶层元素: <${el.tagName.toLowerCase()}> class="${el.className}"`);
        if (el.tagName === 'IFRAME') log("🚨 致命：屏幕被 iframe 盖住，导致点击黑洞！");
      }
    } catch(e) { log("遮挡检测报错: " + e.message); }

    log("\n【3. 核心渲染与死锁】");
    log("chatInput 是否被只读锁死: " + (document.getElementById('chatInput')?.readOnly ? "🚨 是 (发不了消息)" : "否"));
    log("KA 保活主标签状态: " + (window.KA && window.KA.isLeader && window.KA.isLeader() ? "正常" : "🚨 抢主控死循环 (会卡死)"));
    
    // 新增：定时器炸弹检测
    try {
      let timerCount = 0;
      const originalSetInterval = window.setInterval;
      // 这里没法遍历活着的定时器，只能通过日志或 KA 任务数粗略估算
      if(window.KA && window.KA.status) {
        const st = window.KA.status();
        log(`保活定时器状态: Ticks=${st.ticks}, Revives=${st.revives}, Tasks=${st.tasks}`);
      }
    } catch(e) {}

    log("\n【4. 数据完整性与 ID 冲突检测】");
    try {
      if (typeof getFriends === 'function') {
        const friends = getFriends();
        log(`好友总数: ${friends.length}`);
        const ids = new Set();
        let dupCount = 0;
        friends.forEach(f => { if(ids.has(f.id)) dupCount++; ids.add(f.id); });
        if (dupCount > 0) log(`🚨 警告：发现 ${dupCount} 个角色 ID 重复，会导致聊天串号！`);
        
        if (window.__getCurMsgs) {
          const msgs = window.__getCurMsgs();
          log(`当前消息总数: ${msgs.length}`);
          // 消息 ID 去重
          const msgIds = new Set();
          let msgDup = 0;
          msgs.forEach(m => { if(msgIds.has(m.id)) msgDup++; msgIds.add(m.id); });
          if (msgDup > 0) log(`🚨 警告：发现 ${msgDup} 条重复 ID 的消息，会导致 UI 刷新异常！`);
        }
      }
    } catch(e) { log("数据检测报错: " + e.message); }

    log("\n【5. 网络资源加载状态】");
    try {
      const entries = performance.getEntriesByType("resource");
      const failed = entries.filter(e => e.duration === 0 || (e.responseStatus && e.responseStatus >= 400));
      if (failed.length > 0) {
        log(`⚠️ 有 ${failed.length} 个资源加载失败 (可能卡在加载画面):`);
        failed.slice(0, 5).forEach(f => log(`  - ${f.name.split('/').pop()} (状态:${f.responseStatus || '超时'})`));
        if (failed.length > 5) log("  ... 更多省略");
      } else {
        log("所有静态资源加载正常");
      }
    } catch(e) { log("网络检查报错: " + e.message); }

    // ====================== 展示面板 ======================
    let raw = logs.join("\n");
    console.log(raw);

    let panel = document.getElementById('diagPanel');
    if(!panel) {
      panel = document.createElement('div');
      panel.id = 'diagPanel';
      panel.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:#fff;display:flex;flex-direction:column;padding:20px;font-family:monospace;';
      panel.innerHTML = `
        <div style="font-size:18px;font-weight:bold;margin-bottom:10px;color:#333;">终极诊断报告</div>
        <textarea id="diagText" readonly style="flex:1;width:100%;border:1px solid #ccc;border-radius:8px;padding:10px;font-size:12px;line-height:1.5;background:#f9f9f9;resize:none;box-sizing:border-box;"></textarea>
        <div style="display:flex;gap:10px;margin-top:15px;">
          <button id="diagCopy" style="flex:1;padding:14px;background:#1a1a1a;color:#fff;border:none;border-radius:8px;font-size:15px;font-weight:bold;">一键复制</button>
          <button id="diagClose" style="flex:1;padding:14px;background:#f5f5f5;color:#333;border:none;border-radius:8px;font-size:15px;font-weight:bold;">关闭</button>
        </div>
      `;
      document.body.appendChild(panel);
      
      document.getElementById('diagCopy').onclick = function() {
        const text = document.getElementById('diagText');
        text.select();
        document.execCommand('copy');
        if (navigator.clipboard) navigator.clipboard.writeText(text.value);
        this.textContent = '已复制!';
        setTimeout(() => this.textContent = '一键复制', 2000);
      };

      document.getElementById('diagClose').onclick = function() {
        panel.remove();
      };
    }
    
    document.getElementById('diagText').value = raw;
    panel.style.display = 'flex';
  };
})();