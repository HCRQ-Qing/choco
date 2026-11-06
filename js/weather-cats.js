/* ============================================================
   天气分类表 · 全站唯一来源
   谁在用：
     - video-pool.js → 建 g-weather 时从 WEATHER_CATS 读分类
     - app.js        → 抽卡时用 weatherCodeToCatId() 翻译
   以后加分类 / 改映射，只改这一个文件。
   ============================================================ */
(function(){
  if(window.__weatherCatsReady) return;
  window.__weatherCatsReady = true;

  /* 16 个分类
     id     跟 cardStore 里 g-weather.cats[].id 对齐
     name   用天气预报的原词
     list   默认字卡，只在分类为空时补，不动用户已加的
     legacy 老的“雨”大类，保留数据、不参与抽卡 */
  var WEATHER_CATS = [
    { id:'cw-sunny',      name:'晴',      legacy:false, list:[
      '今天天气真好，晒晒太阳','阳光不错，出去走走吧','晴天心情也跟着好',
      '这么晴朗，适合和你一起出去','太阳好大，记得涂防晒'
    ]},
    { id:'cw-cloudy',     name:'多云',    legacy:false, list:[
      '今天多云，还挺舒服的','云有点厚，不过不闷','天不算晴也不算阴，刚刚好',
      '多云的日子适合发呆'
    ]},
    { id:'cw-overcast',   name:'阴',      legacy:false, list:[
      '今天阴沉沉的，别影响心情','天色有点闷，记得开窗通风',
      '阴天让人想赖床','阴天也别忘了笑一下'
    ]},
    { id:'cw-rain-light', name:'小雨',    legacy:false, list:[
      '外面下小雨了，记得带伞','毛毛雨，别嫌麻烦还是撑一下',
      '小雨天路滑，慢点走','下着小雨，空气倒是清爽'
    ]},
    { id:'cw-rain-mid',   name:'中雨',    legacy:false, list:[
      '今天中雨，出门记得带伞','雨不算小，别淋湿了',
      '中雨天，鞋子选防水的','听着雨声，有点想你了'
    ]},
    { id:'cw-rain-heavy', name:'大雨',    legacy:false, list:[
      '雨很大，能不出门就别出门','外面下大了，注意安全',
      '大雨天路滑，慢一点','这雨下得真大，你那边呢'
    ]},
    { id:'cw-rain-storm', name:'暴雨',    legacy:false, list:[
      '暴雨预警，尽量待在室内','雨太大了，注意积水和用电安全',
      '暴雨天别往低洼处走','这雨大得吓人，你还好吗'
    ]},
    { id:'cw-thunder',    name:'雷阵雨',  legacy:false, list:[
      '打雷了，别站树下','雷阵雨，出门带把伞',
      '刚才那声雷好响','雷雨天关好门窗'
    ]},
    { id:'cw-snow-light', name:'小雪',    legacy:false, list:[
      '下小雪了，注意保暖','雪不大，但路会滑',
      '飘雪了，好美','小雪天，多穿一件'
    ]},
    { id:'cw-snow-mid',   name:'中雪',    legacy:false, list:[
      '中雪了，出门慢点','雪有点厚了，注意脚下',
      '下雪了，想和你一起看','雪天记得戴手套'
    ]},
    { id:'cw-snow-heavy', name:'大雪',    legacy:false, list:[
      '大雪预警，注意保暖','雪下得好大，尽量别出远门',
      '外面白茫茫一片','大雪天，路上小心'
    ]},
    { id:'cw-fog',        name:'雾',      legacy:false, list:[
      '今天有雾，出门小心','雾气很重，开车慢一点','雾天视线不好，注意安全',
      '雾里的城市像一幅水墨画'
    ]},
    { id:'cw-wind',       name:'大风',    legacy:false, list:[
      '今天风大，穿厚一点','风好大，帽子差点吹跑','刮风了，注意别着凉',
      '风把云都吹散了'
    ]},
    { id:'cw-hot',        name:'高温',    legacy:false, list:[
      '今天高温，多喝水','外面太热了，别在外面待太久','高温天气，注意防暑',
      '这么热，来杯冰饮吧','热到融化，你也注意身体'
    ]},
    { id:'cw-storm',      name:'台风暴雨',legacy:false, list:[
      '台风预警，注意安全','暴雨天尽量别出门','风大雨大，待在家里最好',
      '台风来了，把窗户关好','暴雨天气，注意排水和用电安全'
    ]},
    /* 老版本的“雨”大类：保留数据、不参与抽卡 */
    { id:'cw-rain',       name:'雨（旧）', legacy:true,  list:[] }
  ];

  /* 天气代码 → 分类 id
     code  WMO 天气代码
     temp  摄氏温度（没有就传 null）
     wind  风速 m/s（没有就传 null）
     优先级：台风暴雨 > 高温 > 代码表
     legacy 分类永远不会被返回 */
  function weatherCodeToCatId(code, temp, wind){
    var c = Number(code);
    var t = (typeof temp === 'number') ? temp : null;
    var w = (typeof wind === 'number') ? wind : null;

    /* ① 台风暴雨：雷暴代码 + 风力 ≥ 10 级（约 24.5 m/s） */
    if(c >= 95 && c <= 99 && w !== null && w >= 24.5){
      return 'cw-storm';
    }

    /* ② 高温：≥ 35°C，且不是台风暴雨 */
    if(t !== null && t >= 35){
      return 'cw-hot';
    }

    /* ③ 雾 */
    if(c === 45 || c === 48) return 'cw-fog';

    /* ④ 雷阵雨：95~99 但风力没到 10 级 */
    if(c >= 95 && c <= 99) return 'cw-thunder';

    /* ⑤ 雨：为了治国内“阴天报毛毛雨”的毛病，毛毛雨/小雨（51~57, 61）降级为阴天 */
    if(c >= 51 && c <= 57) return 'cw-overcast';   /* 毛毛雨直接算阴天 */
    if(c === 61) return 'cw-overcast';             /* 小雨直接算阴天 */
    if(c === 63) return 'cw-rain-light';           /* 中雨算小雨 */
    if(c === 65) return 'cw-rain-mid';             /* 大雨算中雨 */
    if(c === 66 || c === 67) return 'cw-rain-heavy'; /* 冻雨算大雨 */
    if(c === 80) return 'cw-rain-light';           /* 小阵雨 */
    if(c === 81) return 'cw-rain-mid';             /* 阵雨 */
    if(c === 82) return 'cw-rain-heavy';           /* 强阵雨 */

    /* ⑥ 雪：71~77 雪，85~86 阵雪 */
    if(c === 71 || c === 77) return 'cw-snow-light';
    if(c === 73) return 'cw-snow-mid';
    if(c === 75) return 'cw-snow-heavy';
    if(c === 85) return 'cw-snow-mid';
    if(c === 86) return 'cw-snow-heavy';

    /* ⑦ 大风：风力 ≥ 6 级（约 10.8 m/s），且不是雨雪天 */
    if(w !== null && w >= 10.8) return 'cw-wind';

    /* ⑧ 晴 / 多云 / 阴 */
    if(c === 0) return 'cw-sunny';
    if(c === 1 || c === 2) return 'cw-cloudy';
    if(c === 3) return 'cw-overcast';

    /* 兜底：不认识的代码当多云，别让抽卡断掉 */
    return 'cw-cloudy';
  }

  window.WeatherCats = {
    getCats: function(){ return WEATHER_CATS.slice(); },
    weatherCodeToCatId: weatherCodeToCatId
  };
})();