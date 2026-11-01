// js/diagnose.js
(function(){
  window.runDiagnose = async function() {
    let logs = [];
    const log = (msg) => { logs.push(msg); };
    log("【环境信息】");
    log("UA: " + navigator.userAgent);
    
    log("\n【IndexedDB 检查】");
    try {
      if (window.indexedDB) {
        const req = indexedDB.open("choco_diagnose_test", 1);
        await new Promise((resolve, reject) => {
          req.onsuccess = () => { req.result.close(); indexedDB.deleteDatabase("choco_diagnose_test"); resolve(); };
          req.onerror = () => reject(req.error);
          setTimeout(() => reject(new Error("打开数据库超时(5秒)")), 5000);
        });
        log("IndexedDB: 正常");
      } else {
        log("IndexedDB: 浏览器不支持或隐私模式禁用");
      }
    } catch(e) {
      log("IndexedDB 报错: " + e.message);
    }

    log("\n【LocalStorage 检查】");
    try {
      let totalSize = 0;
      let keys = [];
      let limit = Math.min(localStorage.length, 100);
      for (let i = 0; i < limit; i++) {
        const key = localStorage.key(i);
        if(!key) continue;
        totalSize += (localStorage.getItem(key) || "").length;
        keys.push(key);
      }
      log(`LocalStorage: 正常 (存储键数: ${localStorage.length}, 预估大小: ${(totalSize/1024).toFixed(1)}KB)`);
      log("存储键名前100个: " + keys.join(", "));
    } catch(e) {
      log("LocalStorage 报错: " + e.message);
    }

    log("\n【核心对象检查】");
    log("window.app 存在: " + (window.app ? "是" : "否"));
    log("window.Chat 存在: " + (window.Chat ? "是" : "否"));
    log("window.IndexedDB 存在: " + (window.IndexedDB ? "是" : "否"));
    
    let raw = logs.join("\n");
    console.log(raw);

    // 创建面板
    let panel = document.getElementById('diagPanel');
    if(!panel) {
      panel = document.createElement('div');
      panel.id = 'diagPanel';
      panel.style.cssText = 'position:fixed;inset:0;z-index:999999;background:#fff;display:flex;flex-direction:column;padding:20px;font-family:monospace;';
      panel.innerHTML = `
        <div style="font-size:18px;font-weight:bold;margin-bottom:10px;color:#333;">设备诊断报告</div>
        <textarea id="diagText" readonly style="flex:1;width:100%;border:1px solid #ccc;border-radius:8px;padding:10px;font-size:12px;line-height:1.5;background:#f9f9f9;resize:none;box-sizing:border-box;"></textarea>
        <div style="display:flex;gap:10px;margin-top:15px;">
          <button id="diagCopy" style="flex:1;padding:14px;background:#1a1a1a;color:#fff;border:none;border-radius:8px;font-size:15px;font-weight:bold;">一键复制全部</button>
          <button id="diagDownload" style="flex:1;padding:14px;background:#4CAF50;color:#fff;border:none;border-radius:8px;font-size:15px;font-weight:bold;">导出 TXT</button>
          <button id="diagClose" style="flex:1;padding:14px;background:#f5f5f5;color:#333;border:none;border-radius:8px;font-size:15px;font-weight:bold;">关闭</button>
        </div>
      `;
      document.body.appendChild(panel);
      
      document.getElementById('diagCopy').onclick = function() {
        const text = document.getElementById('diagText');
        text.select();
        document.execCommand('copy');
        if (navigator.clipboard) {
          navigator.clipboard.writeText(text.value);
        }
        this.textContent = '已复制!';
        setTimeout(() => this.textContent = '一键复制全部', 2000);
      };
      
      document.getElementById('diagDownload').onclick = function() {
        const blob = new Blob([document.getElementById('diagText').value], {type: 'text/plain'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'choco_diagnose.txt';
        a.click();
        URL.revokeObjectURL(url);
      };

      document.getElementById('diagClose').onclick = function() {
        panel.remove();
      };
    }
    
    document.getElementById('diagText').value = raw;
    panel.style.display = 'flex';
  };
})();