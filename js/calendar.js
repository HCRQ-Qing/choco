/* ============================================================
   日历页 + 编辑桌面 · 数据层 + 渲染 + 天气 + 农历
   ============================================================ */

/* ---------- 1. 农历数据表（1900 - 2100） ---------- */
const LUNAR_INFO = [
0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,0x09ad0,0x055d2,
0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,0x0d6a0,0x0ada2,0x095b0,0x14977,
0x04970,0x0a4b0,0x0b4b5,0x06a50,0x06d40,0x1ab54,0x02b60,0x09570,0x052f2,0x04970,
0x06566,0x0d4a0,0x0ea50,0x06e95,0x05ad0,0x02b60,0x186e3,0x092e0,0x1c8d7,0x0c950,
0x0d4a0,0x1d8a6,0x0b550,0x056a0,0x1a5b4,0x025d0,0x092d0,0x0d2b2,0x0a950,0x0b557,
0x06ca0,0x0b550,0x15355,0x04da0,0x0a5b0,0x14573,0x052b0,0x0a9a8,0x0e950,0x06aa0,
0x0aea6,0x0ab50,0x04b60,0x0aae4,0x0a570,0x05260,0x0f263,0x0d950,0x05b57,0x056a0,
0x096d0,0x04dd5,0x04ad0,0x0a4d0,0x0d4d4,0x0d250,0x0d558,0x0b540,0x0b6a0,0x195a6,
0x095b0,0x049b0,0x0a974,0x0a4b0,0x0b27a,0x06a50,0x06d40,0x0af46,0x0ab60,0x09570,
0x04af5,0x04970,0x064b0,0x074a3,0x0ea50,0x06b58,0x05ac0,0x0ab60,0x096d5,0x092e0,
0x0c960,0x0d954,0x0d4a0,0x0da50,0x07552,0x056a0,0x0abb7,0x025d0,0x092d0,0x0cab5,
0x0a950,0x0b4a0,0x0baa4,0x0ad50,0x055d9,0x04ba0,0x0a5b0,0x15176,0x052b0,0x0a930,
0x07954,0x06aa0,0x0ad50,0x05b52,0x04b60,0x0a6e6,0x0a4e0,0x0d260,0x0ea65,0x0d530,
0x05aa0,0x076a3,0x096d0,0x04afb,0x04ad0,0x0a4d0,0x1d0b6,0x0d250,0x0d520,0x0dd45,
0x0b5a0,0x056d0,0x055b2,0x049b0,0x0a577,0x0a4b0,0x0aa50,0x1b255,0x06d20,0x0ada0,
0x14b63,0x09370,0x049f8,0x04970,0x064b0,0x168a6,0x0ea50,0x06b20,0x1a6c4,0x0aae0,
0x0a2e0,0x0d2e3,0x0c960,0x0d557,0x0d4a0,0x0da50,0x05d55,0x056a0,0x0a6d0,0x055d4,
0x052d0,0x0a9b8,0x0a950,0x0b4a0,0x0b6a6,0x0ad50,0x055a0,0x0aba4,0x0a5b0,0x052b0,
0x0b273,0x06930,0x07337,0x06aa0,0x0ad50,0x14b55,0x04b60,0x0a570,0x054e4,0x0d160,
0x0e968,0x0d520,0x0daa0,0x16aa6,0x056d0,0x04ae0,0x0a9d4,0x0a2d0,0x0d150,0x0f252,
0x0d520
];
const LUNAR_MONTH_CN = ['正','二','三','四','五','六','七','八','九','十','冬','腊'];
const LUNAR_DAY_CN = ['初一','初二','初三','初四','初五','初六','初七','初八','初九','初十',
  '十一','十二','十三','十四','十五','十六','十七','十八','十九','二十',
  '廿一','廿二','廿三','廿四','廿五','廿六','廿七','廿八','廿九','三十'];
const LUNAR_DAY_CN_S = ['初','十','廿','卅'];

function lunarYearDays(y){
  let sum = 348;
  for(let i = 0x8000; i > 0x8; i >>= 1){
    sum += (LUNAR_INFO[y - 1900] & i) ? 1 : 0;
  }
  return sum + leapDays(y);
}
function leapMonth(y){
  return LUNAR_INFO[y - 1900] & 0xf;
}
function leapDays(y){
  if(leapMonth(y)){
    return (LUNAR_INFO[y - 1900] & 0x10000) ? 30 : 29;
  }
  return 0;
}
function monthDays(y, m){
  return (LUNAR_INFO[y - 1900] & (0x10000 >> m)) ? 30 : 29;
}
function solarToLunar(y, m, d){
  if(y < 1900 || y > 2100) return null;
  let offset = (Date.UTC(y, m - 1, d) - Date.UTC(1900, 0, 31)) / 86400000;
  let i;
  for(i = 1900; i < 2101 && offset > 0; i++){
    offset -= lunarYearDays(i);
  }
  if(offset < 0){ offset += lunarYearDays(i - 1); i--; }
  const lunarYear = i;
  const leap = leapMonth(i);
  let isLeap = false;
  let j;
  for(j = 1; j < 13 && offset > 0; j++){
    if(leap > 0 && j === (leap + 1) && !isLeap){
      --j;
      isLeap = true;
      offset -= leapDays(lunarYear);
    } else {
      offset -= monthDays(lunarYear, j);
    }
    if(isLeap && j === (leap + 1)) isLeap = false;
  }
  if(offset === 0 && leap > 0 && j === (leap + 1)){
    if(isLeap){ isLeap = false; }
    else { isLeap = true; --j; }
  }
  if(offset < 0){ offset += monthDays(lunarYear, j); --j; }
  const lunarMonth = j;
  const lunarDay = offset + 1;
  return {
    year: lunarYear,
    month: lunarMonth,
    day: lunarDay,
    isLeap: isLeap,
    monthCn: (isLeap ? '闰' : '') + LUNAR_MONTH_CN[lunarMonth - 1] + '月',
    dayCn: LUNAR_DAY_CN[lunarDay - 1]
  };
}
function lunarToSolar(ly, lm, ld, isLeap){
  if(ly < 1900 || ly > 2100) return null;
  let offset = 0;
  let i;
  for(i = 1900; i < ly; i++){
    offset += lunarYearDays(i);
  }
  const leap = leapMonth(ly);
  let isLeapMonth = false;
  for(i = 1; i < 13; i++){
    if(leap > 0 && i === (leap + 1) && !isLeapMonth){
      --i;
      isLeapMonth = true;
      if(isLeap){
        offset += leapDays(ly);
      }
    } else {
      if(isLeapMonth && i === (leap + 1)) isLeapMonth = false;
      if(isLeap && i === lm && isLeapMonth){ break; }
      if(i === lm && !isLeap){ break; }
      offset += monthDays(ly, i);
    }
  }
  offset += (ld - 1);
  const baseUTC = Date.UTC(1900, 0, 31);
  const targetUTC = baseUTC + offset * 86400000;
  const d = new Date(targetUTC);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

/* ---------- 2. 节气（简化版：只算 24 节气的公历日） ---------- */
const SOLAR_TERMS = ['小寒','大寒','立春','雨水','惊蛰','春分','清明','谷雨','立夏','小满',
  '芒种','夏至','小暑','大暑','立秋','处暑','白露','秋分','寒露','霜降','立冬','小雪','大雪','冬至'];
const SOLAR_TERM_DAYS = [
  5,20,4,19,5,20,4,20,5,21,5,21,7,22,7,23,7,23,8,23,7,22,7,22
];
function getSolarTerm(y, m, d){
  const baseDay = SOLAR_TERM_DAYS[(m - 1) * 2];
  const baseDay2 = SOLAR_TERM_DAYS[(m - 1) * 2 + 1];
  if(d === baseDay) return SOLAR_TERMS[(m - 1) * 2];
  if(d === baseDay2) return SOLAR_TERMS[(m - 1) * 2 + 1];
  return '';
}

/* ---------- 3. 节日（公历 + 农历 + 节气） ---------- */
const SOLAR_FESTIVALS = {
  '1-1':'元旦','2-14':'情人节','3-8':'妇女节','3-12':'植树节','4-1':'愚人节',
  '5-1':'劳动节','5-4':'青年节','6-1':'儿童节','7-1':'建党节','8-1':'建军节',
  '9-10':'教师节','10-1':'国庆节','12-24':'平安夜','12-25':'圣诞节'
};
const LUNAR_FESTIVALS = {
  '1-1':'春节','1-15':'元宵节','2-2':'龙抬头','5-5':'端午节','7-7':'七夕',
  '7-15':'中元节','8-15':'中秋节','9-9':'重阳节','12-8':'腊八节','12-23':'小年'
};

/* ---------- 4. 特殊日期存储 ---------- */
const CAL_SPECIAL_KEY = 'mj_cal_special_v1';
function getSpecialDates(){
  let a = lsGet(CAL_SPECIAL_KEY, null);
  if(!Array.isArray(a)) a = [];
  return a;
}
function saveSpecialDates(a){ lsSet(CAL_SPECIAL_KEY, a); }

/* ---------- 5. 日程 / 待办存储 ---------- */
const CAL_TODO_KEY = 'mj_cal_todo_v1';
function getTodos(){
  let a = lsGet(CAL_TODO_KEY, null);
  if(!Array.isArray(a)) a = [];
  return a;
}
function saveTodos(a){ lsSet(CAL_TODO_KEY, a); }

/* ---------- 6. 天气配置 + 缓存 ---------- */
const CAL_WEATHER_KEY = 'mj_cal_weather_v1';
function getWeatherCfg(){
  let c = lsGet(CAL_WEATHER_KEY, null);
  if(!c || typeof c !== 'object') c = {};
  if(typeof c.city !== 'string') c.city = '';
  if(typeof c.lat !== 'number') c.lat = 0;
  if(typeof c.lon !== 'number') c.lon = 0;
  if(typeof c.autoLocate !== 'boolean') c.autoLocate = true;
  if(!c.cache || typeof c.cache !== 'object') c.cache = null;
  return c;
}
function saveWeatherCfg(c){ lsSet(CAL_WEATHER_KEY, c); }

/* 天气代码 → 中文 + 图标 key（更精细） */
function weatherCodeToText(code){
  const c = Number(code);
  if(c === 0) return { text: '晴', icon: 'sunny' };
  if(c === 1) return { text: '大部晴朗', icon: 'sunny' };
  if(c === 2) return { text: '局部多云', icon: 'cloudy' };
  if(c === 3) return { text: '阴', icon: 'cloudy' };
  if(c === 45) return { text: '雾', icon: 'fog' };
  if(c === 48) return { text: '冻雾', icon: 'fog' };
  if(c === 51) return { text: '小毛毛雨', icon: 'rain' };
  if(c === 53) return { text: '毛毛雨', icon: 'rain' };
  if(c === 55) return { text: '大毛毛雨', icon: 'rain' };
  if(c === 56) return { text: '冻毛毛雨', icon: 'rain' };
  if(c === 57) return { text: '强冻毛毛雨', icon: 'rain' };
  if(c === 61) return { text: '小雨', icon: 'rain' };
  if(c === 63) return { text: '中雨', icon: 'rain' };
  if(c === 65) return { text: '大雨', icon: 'rain' };
  if(c === 66) return { text: '冻雨', icon: 'rain' };
  if(c === 67) return { text: '强冻雨', icon: 'rain' };
  if(c === 71) return { text: '小雪', icon: 'snow' };
  if(c === 73) return { text: '中雪', icon: 'snow' };
  if(c === 75) return { text: '大雪', icon: 'snow' };
  if(c === 77) return { text: '雪粒', icon: 'snow' };
  if(c === 80) return { text: '小阵雨', icon: 'rain' };
  if(c === 81) return { text: '阵雨', icon: 'rain' };
  if(c === 82) return { text: '强阵雨', icon: 'rain' };
  if(c === 85) return { text: '小阵雪', icon: 'snow' };
  if(c === 86) return { text: '强阵雪', icon: 'snow' };
  if(c === 95) return { text: '雷暴', icon: 'storm' };
  if(c === 96) return { text: '雷暴伴小冰雹', icon: 'storm' };
  if(c === 99) return { text: '雷暴伴大冰雹', icon: 'storm' };
  return { text: '未知', icon: 'cloudy' };
}

/* 天气图标 SVG */
function weatherIconSVG(icon){
  const icons = {
    sunny: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/></svg>',
    cloudy: '<svg viewBox="0 0 24 24"><path d="M17 14a4 4 0 0 0-1-7.9 6 6 0 0 0-11.4 2A3.5 3.5 0 0 0 5 14h12z"/></svg>',
    fog: '<svg viewBox="0 0 24 24"><path d="M17 13a4 4 0 0 0-1-7.9 6 6 0 0 0-11.4 2A3.5 3.5 0 0 0 5 13h12z"/><line x1="6" y1="17" x2="18" y2="17"/><line x1="8" y1="20" x2="16" y2="20"/></svg>',
    rain: '<svg viewBox="0 0 24 24"><path d="M17 14a4 4 0 0 0-1-7.9 6 6 0 0 0-11.4 2A3.5 3.5 0 0 0 5 14h12z"/><line x1="8" y1="17" x2="8" y2="20"/><line x1="12" y1="17" x2="12" y2="21"/><line x1="16" y1="17" x2="16" y2="20"/></svg>',
    snow: '<svg viewBox="0 0 24 24"><path d="M17 14a4 4 0 0 0-1-7.9 6 6 0 0 0-11.4 2A3.5 3.5 0 0 0 5 14h12z"/><circle cx="8" cy="18" r="0.8" fill="currentColor" stroke="none"/><circle cx="12" cy="19" r="0.8" fill="currentColor" stroke="none"/><circle cx="16" cy="18" r="0.8" fill="currentColor" stroke="none"/></svg>',
    storm: '<svg viewBox="0 0 24 24"><path d="M17 14a4 4 0 0 0-1-7.9 6 6 0 0 0-11.4 2A3.5 3.5 0 0 0 5 14h12z"/><polyline points="11,15 9,19 13,19 11,23"/></svg>'
  };
  return icons[icon] || icons.cloudy;
}

/* 从 Open-Meteo 拉天气（更全面） */
function fetchWeather(lat, lon, cityName){
  const url = 'https://api.open-meteo.com/v1/forecast?latitude=' + lat +
    '&longitude=' + lon +
    '&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,precipitation' +
    '&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max' +
    '&timezone=auto&forecast_days=3';
  return fetch(url).then(r => r.json()).then(data => {
    if(!data || !data.current) throw new Error('天气数据异常');
    const cur = data.current;
    const daily = data.daily || {};
    const wInfo = weatherCodeToText(cur.weather_code);
    const result = {
      city: cityName || '当前位置',
      temp: Math.round(cur.temperature_2m),
      feels: cur.apparent_temperature != null ? Math.round(cur.apparent_temperature) : null,
      code: cur.weather_code,
      text: wInfo.text,
      icon: wInfo.icon,
      humidity: cur.relative_humidity_2m || 0,
      wind: cur.wind_speed_10m || 0,
      windDir: cur.wind_direction_10m || 0,
      precip: cur.precipitation || 0,
      tmax: daily.temperature_2m_max ? Math.round(daily.temperature_2m_max[0]) : '',
      tmin: daily.temperature_2m_min ? Math.round(daily.temperature_2m_min[0]) : '',
      daily: (daily.time || []).map((t, i) => ({
        date: t,
        code: daily.weather_code[i],
        tmax: Math.round(daily.temperature_2m_max[i]),
        tmin: Math.round(daily.temperature_2m_min[i]),
        pop: daily.precipitation_probability_max ? daily.precipitation_probability_max[i] : 0
      })),
      fetchedAt: Date.now()
    };
    const cfg = getWeatherCfg();
    cfg.cache = result;
    saveWeatherCfg(cfg);
    return result;
  });
}

/* 风向角度 → 中文 */
function windDirText(deg){
  const dirs = ['北','东北','东','东南','南','西南','西','西北'];
  return dirs[Math.round(deg / 45) % 8];
}

/* 浏览器定位 */
function locateUser(){
  return new Promise((resolve, reject) => {
    if(!navigator.geolocation){ reject(new Error('不支持定位')); return; }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      err => reject(err),
      { timeout: 10000, maximumAge: 3600000 }
    );
  });
}

/* 刷新天气（主入口） */
/* 城市名 → 经纬度（Open-Meteo Geocoding API） */
function geocodeCity(name){
  const url = 'https://geocoding-api.open-meteo.com/v1/search?name=' +
    encodeURIComponent(name) + '&count=1&language=zh&format=json';
  return fetch(url).then(r => r.json()).then(data => {
    if(!data || !data.results || !data.results.length){
      throw new Error('找不到城市：' + name);
    }
    const r = data.results[0];
    return { lat: r.latitude, lon: r.longitude, city: r.name || name };
  });
}

/* 反向地理编码：经纬度 → 城市名（用 Open-Meteo Geocoding） */
function reverseGeocode(lat, lon){
  const url = 'https://geocoding-api.open-meteo.com/v1/reverse?latitude=' + lat +
    '&longitude=' + lon + '&language=zh&format=json';
  return fetch(url).then(r => r.json()).then(data => {
    if(data && data.results && data.results.length){
      const r = data.results[0];
      return r.name || r.admin1 || r.country || '当前位置';
    }
    return '当前位置';
  }).catch(() => '当前位置');
}

/* 定位失败时的默认城市（广东） */
const DEFAULT_WEATHER = { lat: 23.1291, lon: 113.2644, city: '广东' };

function refreshWeather(force){
  const cfg = getWeatherCfg();
  const now = Date.now();
  if(!force && cfg.cache && (now - cfg.cache.fetchedAt < 30 * 60 * 1000)){
    renderBigCardWeather(cfg.cache);
    return Promise.resolve(cfg.cache);
  }
  function doFetch(lat, lon, city){
    return fetchWeather(lat, lon, city).then(w => {
      renderBigCardWeather(w);
      return w;
    }).catch(e => {
      console.error('天气获取失败', e);
      if(cfg.cache) renderBigCardWeather(cfg.cache);
      else renderBigCardWeather(null, '获取失败');
      return null;
    });
  }

  /* 1. 有城市名 + 有坐标 → 直接用 */
  if(cfg.city && cfg.lat && cfg.lon){
    return doFetch(cfg.lat, cfg.lon, cfg.city);
  }

  /* 2. 有城市名但没坐标 → 用 geocoding 查 */
  if(cfg.city){
    return geocodeCity(cfg.city).then(pos => {
      cfg.lat = pos.lat;
      cfg.lon = pos.lon;
      cfg.city = pos.city;
      saveWeatherCfg(cfg);
      return doFetch(pos.lat, pos.lon, pos.city);
    }).catch(e => {
      console.warn('城市名解析失败，用默认城市', e);
      cfg.lat = DEFAULT_WEATHER.lat;
      cfg.lon = DEFAULT_WEATHER.lon;
      cfg.city = DEFAULT_WEATHER.city;
      saveWeatherCfg(cfg);
      return doFetch(cfg.lat, cfg.lon, cfg.city);
    });
  }

  /* 3. 自动定位 */
  if(cfg.autoLocate){
    return locateUser().then(pos => {
      cfg.lat = pos.lat;
      cfg.lon = pos.lon;
      saveWeatherCfg(cfg);
      /* 先用坐标拉天气，城市名异步反查后更新 */
      return doFetch(pos.lat, pos.lon, '定位中…').then(w => {
        reverseGeocode(pos.lat, pos.lon).then(city => {
          cfg.city = city;
          if(w) w.city = city;
          saveWeatherCfg(cfg);
          renderBigCardWeather(w || cfg.cache);
        });
        return w;
      });
    }).catch(e => {
      console.warn('定位失败，用默认城市', e);
      /* 定位失败 → 用默认城市兜底 */
      cfg.lat = DEFAULT_WEATHER.lat;
      cfg.lon = DEFAULT_WEATHER.lon;
      cfg.city = DEFAULT_WEATHER.city;
      saveWeatherCfg(cfg);
      return doFetch(cfg.lat, cfg.lon, cfg.city);
    });
  }

  /* 4. 什么都没有 → 用默认城市 */
  cfg.lat = DEFAULT_WEATHER.lat;
  cfg.lon = DEFAULT_WEATHER.lon;
  cfg.city = DEFAULT_WEATHER.city;
  saveWeatherCfg(cfg);
  return doFetch(cfg.lat, cfg.lon, cfg.city);
}

/* 渲染大卡片天气区 */
function renderBigCardWeather(w, errText){
  const main = document.getElementById('calBigWMain');
  const sub = document.getElementById('calBigWSub');
  const detail = document.getElementById('calBigWDetail');
  const fc = document.getElementById('calBigWForecast');
  const icoBox = document.getElementById('calBigWIcon');
  if(!main || !sub || !icoBox) return;
  if(!w){
    main.textContent = errText || '未获取';
    sub.textContent = '点右侧刷新';
    if(detail) detail.textContent = '';
    if(fc) fc.innerHTML = '';
    icoBox.innerHTML = weatherIconSVG('cloudy');
    return;
  }
  main.textContent = w.text + ' · ' + w.temp + '°C';
  /* 体感温度 */
  const feels = (w.feels != null) ? (' 体感 ' + w.feels + '°') : '';
  sub.textContent = '最高 ' + w.tmax + '° / 最低 ' + w.tmin + '° · ' + w.city + feels;
  /* 详细信息：湿度、风力、降水 */
  if(detail){
    const parts = [];
    if(w.humidity != null) parts.push('💧 ' + w.humidity + '%');
    if(w.wind != null) parts.push('🌬 ' + windDirText(w.windDir || 0) + ' ' + Math.round(w.wind) + 'km/h');
    if(w.precip != null && w.precip > 0) parts.push('🌧 ' + w.precip + 'mm');
    detail.textContent = parts.join('  ');
  }
  /* 3日预报 */
  if(fc && w.daily && w.daily.length){
    const dayNames = ['今天','明天','后天'];
    fc.innerHTML = w.daily.slice(0,3).map((d, i) => {
      const wi = weatherCodeToText(d.code);
      return '<div class="bc-fc-item">' +
        '<div class="bc-fc-day">' + (dayNames[i] || d.date.slice(5)) + '</div>' +
        '<div class="bc-fc-ico">' + weatherIconSVG(wi.icon) + '</div>' +
        '<div class="bc-fc-pop">' + (d.pop || 0) + '%</div>' +
        '<div class="bc-fc-temp">' + d.tmin + '°~' + d.tmax + '°</div>' +
      '</div>';
    }).join('');
  }
  icoBox.innerHTML = weatherIconSVG(w.icon);
}

/* ---------- 7. 大卡片日期 / 时间 / 农历渲染 ---------- */
function renderBigCardDate(){
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth() + 1, d = now.getDate();
  const week = ['SUN','MON','TUE','WED','THU','FRI','SAT'][now.getDay()];

  const dateEl = document.getElementById('calBigDate');
  if(dateEl) dateEl.textContent = m + '月' + d + '日';
  const weekEl = document.getElementById('calBigWeek');
  if(weekEl) weekEl.textContent = week;

  const hh = String(now.getHours()).padStart(2,'0');
  const mm = String(now.getMinutes()).padStart(2,'0');
  const timeEl = document.getElementById('calBigTime');
  if(timeEl) timeEl.innerHTML = hh + ':' + mm + '<small>' + (now.getHours() < 12 ? 'AM' : 'PM') + '</small>';

  const lunarEl = document.getElementById('calBigLunarText');
  if(lunarEl){
    const lunar = solarToLunar(y, m, d);
    const term = getSolarTerm(y, m, d);
    let text = '农历 ';
    if(lunar) text += lunar.monthCn + lunar.dayCn;
    else text += '—';
    if(term) text += ' · ' + term;
    lunarEl.textContent = text;
  }
}

/* ---------- 8. 月历渲染 ---------- */
let calCurrentYear = 0;
let calCurrentMonth = 0;

function renderCalendar(y, m){
  calCurrentYear = y;
  calCurrentMonth = m;

  const titleEl = document.getElementById('calTitle');
  if(titleEl){
    titleEl.innerHTML = m + ' 月<small>' + y + '</small>';
  }

  const grid = document.getElementById('calGrid');
  if(!grid) return;
  const firstDay = new Date(y, m - 1, 1).getDay();
  const totalDays = new Date(y, m, 0).getDate();
  const prevTotalDays = new Date(y, m - 1, 0).getDate();

  const today = new Date();
  const isThisMonth = (today.getFullYear() === y && today.getMonth() + 1 === m);
  const todayDate = today.getDate();

  const todos = getTodos();

  const heads = ['S','M','T','W','T','F','S'];
  let html = heads.map(h => '<div class="cal-cell head">' + h + '</div>').join('');

  for(let i = 0; i < firstDay; i++){
    html += '<div class="cal-cell other">' + (prevTotalDays - firstDay + i + 1) + '</div>';
  }

  function pad(n){ return String(n).padStart(2,'0'); }
  const dateKey = (yy,mm,dd) => yy + '-' + pad(mm) + '-' + pad(dd);

  for(let d = 1; d <= totalDays; d++){
    const key = dateKey(y, m, d);
    const inBand = todos.some(t => t.type === 'range' && t.start && t.end && key >= t.start && key <= t.end);
    const bandStart = todos.some(t => t.type === 'range' && t.start === key);
    const bandEnd = todos.some(t => t.type === 'range' && t.end === key);
    const bandSingle = todos.some(t => t.type === 'range' && t.start === key && t.end === key);

    const cls = ['cal-cell'];
    if(inBand) cls.push('has-band');
    if(bandStart) cls.push('band-start');
    if(bandEnd) cls.push('band-end');
    if(bandSingle) cls.push('band-single');
    if(isThisMonth && d === todayDate) cls.push('today');

    let sub = '';
    const lunar = solarToLunar(y, m, d);
    if(lunar){
      if(lunar.day === 1) sub = lunar.monthCn;
      else sub = LUNAR_DAY_CN_S[Math.floor((lunar.day - 1) / 10)] + LUNAR_DAY_CN[lunar.day - 1].slice(1);
    }
    const term = getSolarTerm(y, m, d);
    if(term) sub = term;
    const solarFest = SOLAR_FESTIVALS[m + '-' + d];
    if(solarFest) sub = solarFest;
    if(lunar){
      const lunarFest = LUNAR_FESTIVALS[lunar.month + '-' + lunar.day];
      if(lunarFest && !lunar.isLeap) sub = lunarFest;
    }

    let inner = '';
    if(inBand){
      inner = '<span style="position:relative;z-index:1">' + d + '</span>';
    } else {
      inner = String(d);
    }
    inner += '<div class="lunar">' + (sub || '') + '</div>';
    if(isThisMonth && d === todayDate) inner += '<div class="today-dot"></div>';

    html += '<div class="' + cls.join(' ') + '">' + inner + '</div>';
  }

  const used = firstDay + totalDays;
  const remain = (7 - used % 7) % 7;
  for(let i = 1; i <= remain; i++){
    html += '<div class="cal-cell other">' + i + '</div>';
  }

  grid.innerHTML = html;

  grid.querySelectorAll('.cal-cell:not(.head):not(.other)').forEach(el => {
    el.addEventListener('click', () => {
      const day = parseInt(el.textContent, 10);
      if(isNaN(day)) return;
      console.log('点击了', y + '-' + m + '-' + day);
    });
  });
}

/* ---------- 9. 大卡片事件标签 ---------- */
function renderBigCardEvents(){
  const box = document.getElementById('calBigEvents');
  if(!box) return;
  const now = new Date();
  const todayKey = now.getFullYear() + '-' +
    String(now.getMonth()+1).padStart(2,'0') + '-' +
    String(now.getDate()).padStart(2,'0');

  const items = [];

  const special = getSpecialDates();
  special.forEach(s => {
    let hit = false;
    if(s.type === 'solar' && s.date === (now.getMonth()+1) + '-' + now.getDate()) hit = true;
    if(s.type === 'lunar'){
      const lunar = solarToLunar(now.getFullYear(), now.getMonth()+1, now.getDate());
      if(lunar && lunar.month === s.month && lunar.day === s.day && !lunar.isLeap) hit = true;
    }
    if(hit){
      items.push({
        icon: s.category === 'birthday' ? 'cake' : (s.category === 'love' ? 'heart' : 'star'),
        text: s.name
      });
    }
  });

  const todos = getTodos();
  todos.forEach(t => {
    if(t.type === 'range' && t.start && t.end && todayKey >= t.start && todayKey <= t.end){
      const total = Math.round((new Date(t.end) - new Date(t.start)) / 86400000) + 1;
      const passed = Math.round((new Date(todayKey) - new Date(t.start)) / 86400000) + 1;
      items.push({
        icon: 'book',
        text: t.title + ' ' + passed + '/' + total
      });
    }
  });

  if(!items.length){
    box.innerHTML = '<div class="bc-ev-empty">今天没有特别的日子</div>';
    return;
  }

  const icons = {
    cake: '<svg viewBox="0 0 24 24"><rect x="4" y="10" width="16" height="11" rx="1"/><rect x="3" y="7" width="18" height="3.5" rx="0.8"/><path d="M12 7v14"/><path d="M12 7c-1.5 -2.5 -3.5 -3 -4.5 -1.8c-1 1.2 .5 3 4.5 1.8z"/><path d="M12 7c1.5 -2.5 3.5 -3 4.5 -1.8c1 1.2 -.5 3 -4.5 1.8z"/></svg>',
    heart: '<svg viewBox="0 0 24 24"><path d="M12 20.5S4 15.3 4 9.7A4.5 4.5 0 0 1 8.5 5.2c1.5 0 2.8.8 3.5 1.9.7-1.1 2-1.9 3.5-1.9A4.5 4.5 0 0 1 20 9.7c0 5.6-8 10.8-8 10.8z"/></svg>',
    star: '<svg viewBox="0 0 24 24"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 17l-5.2 2.6 1-5.8L3.5 9.7l5.9-.9z"/></svg>',
    book: '<svg viewBox="0 0 24 24"><path d="M4 19.3A2.3 2.3 0 0 1 6.3 17H20"/><path d="M6.3 2H20v20H6.3A2.3 2.3 0 0 1 4 19.7V4.3A2.3 2.3 0 0 1 6.3 2z"/><path d="M9 7h7"/><path d="M9 11h5"/></svg>'
  };

  box.innerHTML = items.map(it => (
    '<span class="bc-ev">' + (icons[it.icon] || icons.star) + escapeHTML(it.text) + '</span>'
  )).join('');
}

/* ---------- 10. 本月事件列表 ---------- */
function renderMonthEvents(){
  const box = document.getElementById('calMonthEvents');
  if(!box) return;
  const y = calCurrentYear, m = calCurrentMonth;
  const now = new Date();
  const todayZero = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  const items = [];

  getSpecialDates().forEach(s => {
    let solar;
    if(s.type === 'solar'){
      const parts = s.date.split('-');
      solar = { year: y, month: parseInt(parts[0],10), day: parseInt(parts[1],10) };
    } else if(s.type === 'lunar'){
      const r = lunarToSolar(y, s.month, s.day, false);
      if(r) solar = r;
    }
    if(!solar || solar.month !== m) return;
    const ts = new Date(solar.year, solar.month - 1, solar.day).getTime();
    const daysLeft = Math.round((ts - todayZero) / 86400000);
    let sub;
    if(daysLeft === 0) sub = '就是今天';
    else if(daysLeft > 0) sub = '还有 ' + daysLeft + ' 天';
    else sub = '已经 ' + (-daysLeft) + ' 天';
    items.push({
      icon: s.category === 'birthday' ? 'cake' : (s.category === 'love' ? 'heart' : 'star'),
      title: s.name,
      sub: solar.month + '月' + solar.day + '日 · ' + (s.type === 'lunar' ? '农历' : '公历') + ' · ' + sub,
      sort: ts
    });
  });

  getTodos().forEach(t => {
    if(t.type !== 'range') return;
    const startParts = t.start.split('-').map(Number);
    const endParts = t.end.split('-').map(Number);
    const monthStart = new Date(y, m - 1, 1).getTime();
    const monthEnd = new Date(y, m, 0).getTime();
    const sTs = new Date(startParts[0], startParts[1]-1, startParts[2]).getTime();
    const eTs = new Date(endParts[0], endParts[1]-1, endParts[2]).getTime();
    if(eTs < monthStart || sTs > monthEnd) return;
    const total = Math.round((eTs - sTs) / 86400000) + 1;
    const passed = Math.max(0, Math.min(total, Math.round((todayZero - sTs) / 86400000) + 1));
    items.push({
      icon: 'book',
      title: t.title,
      sub: startParts[1] + '月' + startParts[2] + '日 - ' + endParts[1] + '月' + endParts[2] + '日',
      prog: passed + ' / ' + total,
      sort: sTs
    });
  });

  if(!items.length){
    box.innerHTML = '<div class="ce-empty">这个月没有特殊日子</div>';
    return;
  }
  items.sort((a, b) => a.sort - b.sort);

  const icons = {
    cake: '<svg viewBox="0 0 24 24"><rect x="4" y="10" width="16" height="11" rx="1"/><rect x="3" y="7" width="18" height="3.5" rx="0.8"/><path d="M12 7v14"/><path d="M12 7c-1.5 -2.5 -3.5 -3 -4.5 -1.8c-1 1.2 .5 3 4.5 1.8z"/><path d="M12 7c1.5 -2.5 3.5 -3 4.5 -1.8c1 1.2 -.5 3 -4.5 1.8z"/></svg>',
    heart: '<svg viewBox="0 0 24 24"><path d="M12 20.5S4 15.3 4 9.7A4.5 4.5 0 0 1 8.5 5.2c1.5 0 2.8.8 3.5 1.9.7-1.1 2-1.9 3.5-1.9A4.5 4.5 0 0 1 20 9.7c0 5.6-8 10.8-8 10.8z"/></svg>',
    star: '<svg viewBox="0 0 24 24"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 17l-5.2 2.6 1-5.8L3.5 9.7l5.9-.9z"/></svg>',
    book: '<svg viewBox="0 0 24 24"><path d="M4 19.3A2.3 2.3 0 0 1 6.3 17H20"/><path d="M6.3 2H20v20H6.3A2.3 2.3 0 0 1 4 19.7V4.3A2.3 2.3 0 0 1 6.3 2z"/><path d="M9 7h7"/><path d="M9 11h5"/></svg>'
  };

  box.innerHTML = items.map(it => (
    '<div class="ce-item">' +
      '<div class="ico">' + (icons[it.icon] || icons.star) + '</div>' +
      '<div class="txt">' +
        '<div class="tt">' + escapeHTML(it.title) + '</div>' +
        '<div class="sub">' + escapeHTML(it.sub) + '</div>' +
      '</div>' +
      (it.prog ? '<div class="prog-txt">' + it.prog + '</div>' : '') +
    '</div>'
  )).join('');
}

/* ---------- 11. 刷新整页日历 ---------- */
function refreshCalendarPage(){
  renderBigCardDate();
  renderBigCardEvents();
  renderCalendar(calCurrentYear || new Date().getFullYear(), calCurrentMonth || new Date().getMonth() + 1);
  renderMonthEvents();
}

/* ---------- 12. 编辑桌面：tab 切换 ---------- */
let deCurrentTab = 'date';
function renderDeskEdit(tab){
  deCurrentTab = tab || deCurrentTab;
  const body = document.getElementById('deBody');
  if(!body) return;
  document.querySelectorAll('#deTabs .de-tab').forEach(t => {
    t.classList.toggle('on', t.dataset.deTab === deCurrentTab);
  });
  if(deCurrentTab === 'date') renderDeDate(body);
  else if(deCurrentTab === 'todo') renderDeTodo(body);
  else if(deCurrentTab === 'weather') renderDeWeather(body);
  else if(deCurrentTab === 'role') renderDeRole(body);
  else if(deCurrentTab === 'setting') renderDeSetting(body);
}

/* ---- 日期 tab ---- */
function renderDeDate(body){
  const list = getSpecialDates();
  const icons = {
    birthday: '<svg viewBox="0 0 24 24"><rect x="4" y="10" width="16" height="11" rx="1"/><rect x="3" y="7" width="18" height="3.5" rx="0.8"/><path d="M12 7v14"/><path d="M12 7c-1.5 -2.5 -3.5 -3 -4.5 -1.8c-1 1.2 .5 3 4.5 1.8z"/><path d="M12 7c1.5 -2.5 3.5 -3 4.5 -1.8c1 1.2 -.5 3 -4.5 1.8z"/></svg>',
    love: '<svg viewBox="0 0 24 24"><path d="M12 20.5S4 15.3 4 9.7A4.5 4.5 0 0 1 8.5 5.2c1.5 0 2.8.8 3.5 1.9.7-1.1 2-1.9 3.5-1.9A4.5 4.5 0 0 1 20 9.7c0 5.6-8 10.8-8 10.8z"/></svg>',
    star: '<svg viewBox="0 0 24 24"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 17l-5.2 2.6 1-5.8L3.5 9.7l5.9-.9z"/></svg>'
  };
  let html = '<div class="de-sec"><span class="tt">特 殊 日 期</span><span class="act" id="deAddSpecial">＋ 添加</span></div>';
  if(!list.length){
    html += '<div class="de-empty">还没有特殊日期<br><span class="plus" id="deAddSpecialEmpty">＋ 添加生日 / 纪念日</span></div>';
  } else {
    html += list.map(s => {
      let dateText = '';
      if(s.type === 'solar'){
        dateText = '公历 ' + s.date.replace('-', '月') + '日';
      } else {
        dateText = '农历 ' + LUNAR_MONTH_CN[s.month-1] + '月' + LUNAR_DAY_CN[s.day-1];
      }
      return '<div class="de-row" data-sid="' + s.id + '">' +
        '<div class="r-ic">' + (icons[s.category] || icons.star) + '</div>' +
        '<div class="r-main">' +
          '<div class="r-tt">' + escapeHTML(s.name) + '</div>' +
          '<div class="r-sub">' + dateText + '</div>' +
        '</div>' +
        '<button class="r-del" data-del-sid="' + s.id + '" type="button">✕</button>' +
      '</div>';
    }).join('');
  }
  body.innerHTML = html;

  body.querySelectorAll('[data-del-sid]').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const id = btn.dataset.delSid;
      if(!confirm('删除这条特殊日期？')) return;
      const arr = getSpecialDates().filter(x => x.id !== id);
      saveSpecialDates(arr);
      renderDeskEdit('date');
      refreshCalendarPage();
    };
  });
  const addFn = () => openAddSpecialDialog();
  const a1 = body.querySelector('#deAddSpecial'); if(a1) a1.onclick = addFn;
  const a2 = body.querySelector('#deAddSpecialEmpty'); if(a2) a2.onclick = addFn;
}

function openAddSpecialDialog(){
  uniAsk({
    title: '名称',
    sub: 'SPECIAL · 例如：梦角生日',
    value: '',
    placeholder: '生日 / 纪念日 / …'
  }).then(name => {
    if(name === null) return;
    const n = String(name).trim();
    if(!n){ toast('名称不能为空'); return; }
    uniAsk({
      title: '日期',
      sub: '格式 月-日，例如 8-15',
      value: '',
      placeholder: '8-15'
    }).then(dstr => {
      if(dstr === null) return;
      const t = String(dstr).trim();
      const m = t.match(/^(\d{1,2})\s*[-月]\s*(\d{1,2})/);
      if(!m){ toast('格式不对'); return; }
      const mm = parseInt(m[1],10), dd = parseInt(m[2],10);
      if(mm < 1 || mm > 12 || dd < 1 || dd > 31){ toast('日期不合法'); return; }
      const mask = document.createElement('div');
      mask.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.4);display:flex;align-items:flex-end;justify-content:center';
      mask.innerHTML = '<div style="width:100%;max-width:520px;background:#fff;border-radius:22px 22px 0 0;padding:22px 20px calc(20px + env(safe-area-inset-bottom));">'
        + '<div style="font-size:15px;font-weight:300;letter-spacing:4px;color:#1a1a1a;text-align:center;padding-bottom:16px;border-bottom:0.6px solid #f0f0f0;margin-bottom:8px">这 是 什 么 日 期</div>'
        + '<div class="de-row" data-type="solar" style="cursor:pointer"><div class="r-main"><div class="r-tt">公历 ' + mm + '月' + dd + '日</div><div class="r-sub">每年这一天</div></div><div class="r-arr">›</div></div>'
        + '<div class="de-row" data-type="lunar" style="cursor:pointer"><div class="r-main"><div class="r-tt">农历 ' + mm + '月' + dd + '日</div><div class="r-sub">每年农历这一天</div></div><div class="r-arr">›</div></div>'
        + '<div class="de-row" data-type="birthday" style="cursor:pointer"><div class="r-main"><div class="r-tt">生日</div><div class="r-sub">标记为生日</div></div><div class="r-arr">›</div></div>'
        + '<div class="de-row" data-type="love" style="cursor:pointer"><div class="r-main"><div class="r-tt">恋爱纪念日</div><div class="r-sub">标记为纪念日</div></div><div class="r-arr">›</div></div>'
        + '</div>';
      document.body.appendChild(mask);
      mask.addEventListener('click', (e) => {
        const row = e.target.closest('[data-type]');
        if(!row){ if(e.target === mask) mask.remove(); return; }
        const type = row.dataset.type;
        let item;
        if(type === 'birthday'){
          item = { id: uid(), name: n, type: 'solar', date: mm + '-' + dd, category: 'birthday' };
        } else if(type === 'love'){          item = { id: uid(), name: n, type: 'solar', date: mm + '-' + dd, category: 'love' };
        } else if(type === 'lunar'){
          item = { id: uid(), name: n, type: 'lunar', month: mm, day: dd, category: 'star' };
        } else {
          item = { id: uid(), name: n, type: 'solar', date: mm + '-' + dd, category: 'star' };
        }
        const arr = getSpecialDates();
        arr.push(item);
        saveSpecialDates(arr);
        mask.remove();
        renderDeskEdit('date');
        refreshCalendarPage();
        toast('已添加');
      });
    });
  });
}

/* ---- 待办 tab ---- */
function renderDeTodo(body){
  const list = getTodos();
  let html = '<div class="de-sec"><span class="tt">待 办 / 日 程</span><span class="act" id="deAddTodo">＋ 添加</span></div>';
  if(!list.length){
    html += '<div class="de-empty">还没有待办<br><span class="plus" id="deAddTodoEmpty">＋ 添加一条</span></div>';
  } else {
    html += list.map(t => {
      if(t.type === 'range'){
        const total = Math.round((new Date(t.end) - new Date(t.start)) / 86400000) + 1;
        const passed = Math.max(0, Math.min(total, Math.round((Date.now() - new Date(t.start).getTime()) / 86400000) + 1));
        const pct = Math.round(passed / total * 100);
        return '<div class="de-todo-item" data-tid="' + t.id + '">' +
          '<div class="ti-tt">' + escapeHTML(t.title) + '</div>' +
          '<div class="ti-sub">' + t.start + ' → ' + t.end + '</div>' +
          '<div class="ti-prog"><div class="ti-prog-bar" style="width:' + pct + '%"></div></div>' +
        '</div>';
      } else {
        const done = t.done ? 'done' : '';
        return '<div class="de-todo-item ' + done + '" data-tid="' + t.id + '">' +
          '<div class="ti-tt"><span class="ck">✓</span>' + escapeHTML(t.title) + '</div>' +
          '<div class="ti-sub">' + (t.date || '') + '</div>' +
        '</div>';
      }
    }).join('');
  }
  body.innerHTML = html;

  body.querySelectorAll('.de-todo-item').forEach(el => {
    el.onclick = (e) => {
      if(e.target.classList.contains('r-del')) return;
      const id = el.dataset.tid;
      const arr = getTodos();
      const t = arr.find(x => x.id === id);
      if(!t) return;
      if(t.type !== 'range'){
        t.done = !t.done;
        saveTodos(arr);
        renderDeskEdit('todo');
        refreshCalendarPage();
      }
    };
  });

  const addFn = () => openAddTodoDialog();
  const a1 = body.querySelector('#deAddTodo'); if(a1) a1.onclick = addFn;
  const a2 = body.querySelector('#deAddTodoEmpty'); if(a2) a2.onclick = addFn;
}

function openAddTodoDialog(){
  uniAsk({
    title: '待办名称',
    sub: 'TODO · 例如：期末复习',
    value: '',
    placeholder: '写下要做的事'
  }).then(name => {
    if(name === null) return;
    const n = String(name).trim();
    if(!n){ toast('名称不能为空'); return; }
    const mask = document.createElement('div');
    mask.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.4);display:flex;align-items:flex-end;justify-content:center';
    mask.innerHTML = '<div style="width:100%;max-width:520px;background:#fff;border-radius:22px 22px 0 0;padding:22px 20px calc(20px + env(safe-area-inset-bottom));">'
      + '<div style="font-size:15px;font-weight:300;letter-spacing:4px;color:#1a1a1a;text-align:center;padding-bottom:16px;border-bottom:0.6px solid #f0f0f0;margin-bottom:8px">待 办 类 型</div>'
      + '<div class="de-row" data-type="single"><div class="r-main"><div class="r-tt">单日待办</div><div class="r-sub">某一天要做的事</div></div><div class="r-arr">›</div></div>'
      + '<div class="de-row" data-type="range"><div class="r-main"><div class="r-tt">跨天日程</div><div class="r-sub">持续多天，日历上显示进度</div></div><div class="r-arr">›</div></div>'
      + '</div>';
    document.body.appendChild(mask);
    mask.addEventListener('click', (e) => {
      const row = e.target.closest('[data-type]');
      if(!row){ if(e.target === mask) mask.remove(); return; }
      const type = row.dataset.type;
      mask.remove();
      if(type === 'single'){
        uniAsk({ title:'日期', sub:'格式 2026-10-15', value: new Date().toISOString().slice(0,10), placeholder:'2026-10-15' }).then(d => {
          if(d === null) return;
          const dt = String(d).trim();
          if(!/^\d{4}-\d{2}-\d{2}$/.test(dt)){ toast('格式不对'); return; }
          const arr = getTodos();
          arr.push({ id: uid(), type: 'single', title: n, date: dt, done: false });
          saveTodos(arr);
          renderDeskEdit('todo');
          refreshCalendarPage();
          toast('已添加');
        });
      } else {
        uniAsk({ title:'开始日期', sub:'格式 2026-10-01', value: new Date().toISOString().slice(0,10), placeholder:'2026-10-01' }).then(d1 => {
          if(d1 === null) return;
          const start = String(d1).trim();
          if(!/^\d{4}-\d{2}-\d{2}$/.test(start)){ toast('开始日期格式不对'); return; }
          uniAsk({ title:'结束日期', sub:'格式 2026-10-20', value: start, placeholder:'2026-10-20' }).then(d2 => {
            if(d2 === null) return;
            const end = String(d2).trim();
            if(!/^\d{4}-\d{2}-\d{2}$/.test(end)){ toast('结束日期格式不对'); return; }
            if(end < start){ toast('结束不能早于开始'); return; }
            const arr = getTodos();
            arr.push({ id: uid(), type: 'range', title: n, start: start, end: end });
            saveTodos(arr);
            renderDeskEdit('todo');
            refreshCalendarPage();
            toast('已添加');
          });
        });
      }
    });
  });
}

/* ---- 天气 tab ---- */
function renderDeWeather(body){
  const cfg = getWeatherCfg();
  const cache = cfg.cache;
  let html = '<div class="de-sec"><span class="tt">天 气 设 置</span><span class="tt-en">WEATHER</span></div>';
  html += '<div class="de-city-row"><span class="lbl">城市</span><input type="text" id="deCityInput" placeholder="例如：广州" value="' + escapeHTML(cfg.city || '') + '"></div>';
  html += '<div class="de-sw-row"><div class="sw-main"><div class="t1">自动定位</div><div class="t2">打开时尝试用浏览器定位</div></div><label class="switch"><input type="checkbox" id="deAutoLocate" ' + (cfg.autoLocate ? 'checked' : '') + '><span class="slider"></span></label></div>';
  if(cache){
    html += '<div class="de-sec"><span class="tt">最 近 一 次</span><span class="tt-en">CACHED</span></div>';
    html += '<div class="de-row"><div class="r-ic">' + weatherIconSVG(cache.icon) + '</div><div class="r-main"><div class="r-tt">' + cache.text + ' · ' + cache.temp + '°C</div><div class="r-sub">' + cache.city + ' · ' + new Date(cache.fetchedAt).toLocaleString('zh-CN', {month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}) + '</div></div></div>';
  }
  html += '<button class="de-primary-btn" id="deWeatherRefresh">刷 新 天 气</button>';
  body.innerHTML = html;

  const cityInput = body.querySelector('#deCityInput');
  if(cityInput){
    cityInput.onchange = () => {
      const v = cityInput.value.trim();
      const c = getWeatherCfg();
      c.city = v;
      if(!v){
        c.lat = 0;
        c.lon = 0;
        saveWeatherCfg(c);
        toast('已清空城市');
        return;
      }
      /* 有城市名 → 用 geocoding 查坐标 */
      toast('正在查坐标…');
      geocodeCity(v).then(pos => {
        c.lat = pos.lat;
        c.lon = pos.lon;
        c.city = pos.city;
        saveWeatherCfg(c);
        toast('已保存：' + pos.city);
        /* 立刻拉一次天气 */
        refreshWeather(true).then(() => {
          renderDeskEdit('weather');
        });
      }).catch(e => {
        console.warn('城市名查不到', e);
        c.lat = 0;
        c.lon = 0;
        saveWeatherCfg(c);
        toast('找不到「' + v + '」，请换个写法');
      });
    };
  }
  const autoLocate = body.querySelector('#deAutoLocate');
  if(autoLocate){
    autoLocate.onchange = () => {
      const c = getWeatherCfg();
      c.autoLocate = autoLocate.checked;
      saveWeatherCfg(c);
      toast(autoLocate.checked ? '已开启自动定位' : '已关闭自动定位');
    };
  }
  const btn = body.querySelector('#deWeatherRefresh');
  if(btn){
    btn.onclick = () => {
      btn.textContent = '获 取 中…';
      refreshWeather(true).then(() => {
        btn.textContent = '刷 新 天 气';
        renderDeskEdit('weather');
      });
    };
  }
}

/* ---- 角色 tab ---- */
function renderDeRole(body){
  const friends = getFriends().filter(f => !f.hidden && !f.builtin);
  let html = '<div class="de-sec"><span class="tt">角 色 状 态</span><span class="tt-en">ROLE STATUS</span></div>';
  if(!friends.length){
    html += '<div class="de-empty">还没有角色</div>';
  } else {
    html += friends.map(f => {
      const status = f.status || 'online';
      const avRadius = (beautyCfg.avatarShape === 'circle') ? '50%' : '12%';
      return '<div class="de-role-item" data-rid="' + f.id + '">' +
        '<div class="de-role-av" style="border-radius:' + avRadius + '">' + avatarHTML(f.avatar) + '</div>' +
        '<div class="de-role-info">' +
          '<div class="de-role-name">' + escapeHTML(f.name) + '</div>' +
          '<div class="de-role-status-row">' +
            '<button class="de-status-chip ' + (status === 'online'  ? 'on' : '') + '" data-st="online"  data-rid="' + f.id + '" type="button">在线</button>' +
            '<button class="de-status-chip ' + (status === 'offline' ? 'on' : '') + '" data-st="offline" data-rid="' + f.id + '" type="button">离线</button>' +
            '<button class="de-status-chip ' + (status === 'busy'    ? 'on' : '') + '" data-st="busy"    data-rid="' + f.id + '" type="button">勿扰</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('');
  }
  body.innerHTML = html;

  body.querySelectorAll('.de-status-chip').forEach(btn => {
    btn.onclick = () => {
      const rid = btn.dataset.rid;
      const st = btn.dataset.st;
      const friends2 = getFriends();
      const f = friends2.find(x => x.id === rid);
      if(!f) return;
      f.status = st;
      saveFriends(friends2);
      renderDeRole(body);
      toast('已更新状态');
    };
  });
}

/* ---- 设置 tab ---- */
function renderDeSetting(body){
  const dotColor = lsGet('mj_today_dot_color', '#666');
  const colors = ['#1a1a1a','#444','#666','#999','#ccc','#DD1440','#1e40af','#166534'];
  let html = '';
  html += '<div class="de-sec"><span class="tt">今 天 小 圆 点</span><span class="tt-en">TODAY DOT</span></div>';
  html += '<div class="de-color-row">';
  html += '<span class="de-color-lbl">颜色</span>';
  colors.forEach(c => {
    html += '<button class="de-color-dot ' + (c === dotColor ? 'on' : '') + '" data-color="' + c + '" type="button" style="background:' + c + '"></button>';
  });
  html += '<button class="de-color-hex" id="deColorHex" type="button">自 定 义</button>';
  html += '</div>';

  html += '<div class="de-sec"><span class="tt">字 卡 联 动</span><span class="tt-en">CARD LINK</span></div>';
  const wOn = lsGet('mj_weather_card_on', true);
  const fOn = lsGet('mj_festival_card_on', true);
  const sOn = lsGet('mj_special_card_on', true);
  html += '<div class="de-sw-row"><div class="sw-main"><div class="t1">天气字卡</div><div class="t2">角色根据今日天气说话</div></div><label class="switch"><input type="checkbox" id="deSwWeather" ' + (wOn ? 'checked' : '') + '><span class="slider"></span></label></div>';
  html += '<div class="de-sw-row"><div class="sw-main"><div class="t1">节日字卡</div><div class="t2">到节日时角色自动说祝福</div></div><label class="switch"><input type="checkbox" id="deSwFestival" ' + (fOn ? 'checked' : '') + '><span class="slider"></span></label></div>';
  html += '<div class="de-sw-row"><div class="sw-main"><div class="t1">特殊日期字卡</div><div class="t2">生日 / 纪念日当天自动祝福</div></div><label class="switch"><input type="checkbox" id="deSwSpecial" ' + (sOn ? 'checked' : '') + '><span class="slider"></span></label></div>';

  body.innerHTML = html;

  body.querySelectorAll('.de-color-dot').forEach(btn => {
    btn.onclick = () => {
      const c = btn.dataset.color;
      lsSet('mj_today_dot_color', c);
      applyTodayDotColor();
      renderDeSetting(body);
    };
  });
  const hexBtn = body.querySelector('#deColorHex');
  if(hexBtn){
    hexBtn.onclick = () => {
      uniAsk({
        title: '自定义颜色',
        sub: 'HEX · 例如 #666666',
        value: dotColor,
        placeholder: '#666666',
        maxlength: 9
      }).then(v => {
        if(v === null) return;
        const s = String(v).trim();
        if(!/^#[0-9a-fA-F]{3,8}$/.test(s)){ toast('格式不对'); return; }
        lsSet('mj_today_dot_color', s);
        applyTodayDotColor();
        renderDeSetting(body);
      });
    };
  }
  const swW = body.querySelector('#deSwWeather'); if(swW) swW.onchange = () => { lsSet('mj_weather_card_on', swW.checked); toast(swW.checked ? '已开启天气字卡' : '已关闭天气字卡'); };
  const swF = body.querySelector('#deSwFestival'); if(swF) swF.onchange = () => { lsSet('mj_festival_card_on', swF.checked); toast(swF.checked ? '已开启节日字卡' : '已关闭节日字卡'); };
  const swS = body.querySelector('#deSwSpecial'); if(swS) swS.onchange = () => { lsSet('mj_special_card_on', swS.checked); toast(swS.checked ? '已开启特殊日期字卡' : '已关闭特殊日期字卡'); };
}

/* 应用今天小圆点颜色 */
function applyTodayDotColor(){
  const c = lsGet('mj_today_dot_color', '#666');
  document.documentElement.style.setProperty('--today-dot', c);
  document.querySelectorAll('#calGrid .today-dot').forEach(el => {
    el.style.background = c;
  });
}

/* ---------- 13. 初始化 ---------- */
function initCalendarPage(){
  calCurrentYear = new Date().getFullYear();
  calCurrentMonth = new Date().getMonth() + 1;
  refreshCalendarPage();
  refreshWeather(false);
  applyTodayDotColor();
}

/* 全局事件绑定 */
document.addEventListener('click', function(e){
  /* 右上角 EDIT 入口 → 进编辑桌面 */
  if(e.target.closest('#calEditEntry')){
    e.preventDefault();
    e.stopPropagation();
    showScreen('deskEditScreen');
    renderTopBar({
      host: 'utopHostDeskEdit',
      title: '编 辑 桌 面',
      onBack: function(){
        document.querySelectorAll('.screen.on').forEach(function(s){ s.classList.remove('on'); });
      }
    });
    renderDeskEdit('date');
    return;
  }
  /* 刷新按钮 → 只刷新天气，绝不进编辑 */
  if(e.target.closest('#calBigWRefresh')){
    e.preventDefault();
    e.stopPropagation();
    refreshWeather(true);
    return;
  }
  if(e.target.closest('#calPrevMonth')){
    e.preventDefault(); e.stopPropagation();
    let m = calCurrentMonth - 1, y = calCurrentYear;
    if(m < 1){ m = 12; y--; }
    renderCalendar(y, m);
    renderMonthEvents();
    return;
  }
  if(e.target.closest('#calNextMonth')){
    e.preventDefault(); e.stopPropagation();
    let m = calCurrentMonth + 1, y = calCurrentYear;
    if(m > 12){ m = 1; y++; }
    renderCalendar(y, m);
    renderMonthEvents();
    return;
  }
 
  const deTab = e.target.closest('#deTabs .de-tab');
  if(deTab){
    e.preventDefault(); e.stopPropagation();
    renderDeskEdit(deTab.dataset.deTab);
    return;
  }
}, true);

/* 每分钟刷新大卡片时间 */
setInterval(() => {
  const stack = document.getElementById('pageStack');
  if(!stack) return;
  const w = window.innerWidth || 1;
  const idx = Math.round(-stack.getBoundingClientRect().left / w);
  if(idx === 2){
    renderBigCardDate();
    renderBigCardEvents();
  }
}, 60 * 1000);

document.addEventListener('visibilitychange', function(){
  if(document.visibilityState === 'visible'){
    /* ★ 回到前台：保活不自动停，只在开关关闭时由开关处理 */
    renderBigCardDate();
    renderBigCardEvents();

    /* ★ 回到前台：先处理"角色自己切换回复设置"的邀请
       - 如果有到期的邀请，立刻结算 + 弹一条系统通知
       - 通知文案："Ta 在后台想好了，接下来继续切换" */
    try{
      if(typeof resumeRoleSelfSetOnForeground === 'function'){
        resumeRoleSelfSetOnForeground();
      }
    }catch(e){ console.error('回前台补跑邀请失败', e); }

    /* ★ 回到前台先结算试卷卡，再重绘聊天 */
    try{
      if(typeof settleQuizCards === 'function' && settleQuizCards()){
        if(typeof renderChat === 'function') renderChat();
      }
    }catch(e){ console.error('回到前台结算试卷失败', e); }

    /* ★ 回到前台：如果保活开关是开的，但音频被浏览器暂停了，立刻拉回来 */
    try{
      if(getKeepAliveOn() && (!_keepAliveRunning || !_keepAliveAudio || _keepAliveAudio.paused)){
        startKeepAlive();
      }
    }catch(e){}

    /* 页面回到前台：把挂起期间漏掉的消息，补弹一次系统通知 */
    try{
      var LAST_SEEN_KEY = 'mj_last_seen_at_v1';
      var lastSeen = lsGet(LAST_SEEN_KEY, 0);
      var nowTs = Date.now();
      if(lastSeen > 0){
        var ids = getAllRoleIds();
        var missed = [];
        ids.forEach(function(rid){
          var role = getRoleById(rid);
          if(!role || role.hidden) return;
          var arr = lsGet('mj_msgs_' + rid, null);
          if(!Array.isArray(arr)) return;
          arr.forEach(function(m){
            if(!m || m.sys || m.recalled) return;
            if(m.time <= lastSeen) return;
            if(m.time > nowTs) return;
            var txt = m.text || (m.sticker ? '[表情图]' : (m.voice ? '[语音]' : ''));
            if(!txt) return;
            missed.push({ role: role, text: txt, time: m.time });
          });
        });
        /* 按时间正序，最多补 3 条，避免回来刷一屏 */
        missed.sort(function(a,b){ return a.time - b.time; });
        missed.slice(0, 3).forEach(function(item, i){
          setTimeout(function(){
            showSystemNotify(item.role.name || '角色', item.text);
          }, i * 600);
        });
      }
      lsSet(LAST_SEEN_KEY, nowTs);
    }catch(e){ console.error('补弹通知出错', e); }
  } else {
    /* 页面切到后台：记下时间点，回来时用它算漏了什么 */
    try{ lsSet('mj_last_seen_at_v1', Date.now()); }catch(e){}

    /* ★ 关键修复：切后台时反复顶几次保活，
       - 有些内核在切后台瞬间会暂停 audio / 挂起 AudioContext
       - 每 500ms 顶一次，顶 10 秒，把活拉回来
       - 只要开关是开的，就不允许它死掉 */
    if(getKeepAliveOn()){
      try{ startKeepAlive(); }catch(e){}
      if(window.__kaForegroundPump) clearInterval(window.__kaForegroundPump);
      let _pump = 0;
      window.__kaForegroundPump = setInterval(function(){
        _pump++;
        try{
          if(!getKeepAliveOn()){ clearInterval(window.__kaForegroundPump); window.__kaForegroundPump = null; return; }
          if(!_keepAliveRunning || !_keepAliveAudio || _keepAliveAudio.paused){
            startKeepAlive();
          }
          if(_keepAliveAudioCtx && _keepAliveAudioCtx.state === 'suspended'){
            _keepAliveAudioCtx.resume().catch(function(){});
          }
        }catch(e){}
        if(_pump >= 20){ clearInterval(window.__kaForegroundPump); window.__kaForegroundPump = null; }
      }, 500);
    }

    /* ============================================================
       ★ 切后台时，把"接下来 6 小时内该弹的通知"算出来，
         一次性塞给 SW，让 SW 自己到点弹。
         这样即使 page 侧 JS 被冻，通知还是能出来。
       ============================================================ */
    try{
      if(!getSysNotifyOn()) return;
      if(typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
      if(!navigator.serviceWorker || !navigator.serviceWorker.controller) return;

      var nowTs = Date.now();
      var HORIZON = 6 * 60 * 60 * 1000;   /* 只算未来 6 小时 */
      var items = [];
      var curId = (typeof getCurrentRoleId === 'function') ? getCurrentRoleId() : '';
      var ids = (typeof getAllRoleIds === 'function') ? getAllRoleIds() : [];

      ids.forEach(function(rid){
        var role = getRoleById(rid);
        if(!role || role.hidden) return;
        if(rid === curId) return;

        var r = (typeof replyMap !== 'undefined' && replyMap[rid]) ? replyMap[rid] : null;
        if(!r) return;

        /* ---- 主动发消息：按 activeRate 平均间隔估算 ---- */
        if(r.activeOn !== false && typeof r.activeRate === 'number' && r.activeRate > 0){
          var gap = 60 * 1000 / r.activeRate;    /* 平均多少毫秒发一条 */
          var t = nowTs + gap * (0.5 + Math.random() * 0.5);
          while(t < nowTs + HORIZON && items.length < 30){
            /* 从角色的普通字卡池抽一条当预览文本 */
            var text = '';
            try{
              var pub = getAllNormalCards('public');
              var own = getAllNormalCards(rid);
              var pool = own.concat(pub);
              if(pool.length) text = pool[Math.floor(Math.random() * pool.length)];
            }catch(e){}
            if(!text) text = '在吗？';
            items.push({
              at: Math.floor(t),
              title: role.name || '角色',
              body: String(text).slice(0, 60),
              tag: 'mj-msg-' + Math.floor(t).toString(36),
              roleId: rid
            });
            t += gap;
          }
        }
      });

      if(items.length){
        navigator.serviceWorker.controller.postMessage({
          type: 'schedule-batch',
          items: items
        });
        console.log('[通知] 已塞给 SW：' + items.length + ' 条');
      }
    }catch(e){ console.error('切后台塞通知失败', e); }
  }
});

/* ============================================================
   ★ 日历在功能页内切换
   - 点功能页的「日历」app → 功能页原地变成日历页
   - 日历页左上角有「‹」按钮 → 退回功能页
   - 功能页 pageStack 左右滑动照常可用
   - 不打开新的 .screen，所以其他二级页不受影响
   ============================================================ */
function openDeskCalendar(){
  const desk = document.getElementById('page-desk');
  if(!desk) return;
  /* ★ 每次进入都强制重建，避免被外部恢复过 / 被 pageStack 移动过 / 结构残留 */
  desk._calInited = true;
  /* 直接清空 desk，然后重新注入日历结构 */
  desk.innerHTML = '';
  {

    /* 2. 换成日历页结构 */
    desk.innerHTML =
      '<div class="cal-topbar" style="display:flex;align-items:center;padding:18px 22px 4px;">' +
        '<button class="cal-desk-back" id="calDeskBack" type="button" style="width:38px;height:38px;flex:none;border:none;background:transparent;color:#1a1a1a;font-size:22px;line-height:1;display:flex;align-items:center;justify-content:center;padding:0 0 4px;font-family:inherit;cursor:pointer;opacity:.55;transition:opacity .18s ease;">‹</button>' +
        '<div style="flex:1"></div>' +
        '<button class="cal-edit-entry" id="calEditEntry" type="button" style="border:none;background:transparent;color:#1a1a1a;font-family:Georgia,serif;font-size:11px;letter-spacing:4px;text-indent:4px;font-weight:400;padding:6px 2px;cursor:pointer;opacity:.55;">EDIT</button>' +
      '</div>' +
      '<div class="cal-page-wrap">' +
        '<div class="big-card" id="calBigCard">' +
          '<div class="bc-head">' +
            '<div class="bc-date-wrap">' +
              '<span class="bc-date" id="calBigDate">--月--日</span>' +
              '<small id="calBigWeek">---</small>' +
            '</div>' +
            '<div class="bc-time" id="calBigTime">--:--<small id="calBigAmpm"></small></div>' +
          '</div>' +
          '<div class="bc-lunar" id="calBigLunar">' +
            '<svg viewBox="0 0 24 24"><path d="M12 3v18"/><path d="M5 8l7-5 7 5"/><path d="M5 16l7 5 7-5"/></svg>' +
            '<span id="calBigLunarText">农历 —</span>' +
          '</div>' +
          '<div class="bc-weather" id="calBigWeather">' +
            '<div class="bc-w-ico" id="calBigWIcon">' +
              '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/></svg>' +
            '</div>' +
            '<div class="bc-w-txt">' +
              '<div class="bc-w-main" id="calBigWMain">天气加载中…</div>' +
              '<div class="bc-w-sub" id="calBigWSub">正在获取定位</div>' +
              '<div class="bc-w-detail" id="calBigWDetail"></div>' +
            '</div>' +
            '<button class="bc-w-refresh" id="calBigWRefresh" type="button" title="刷新天气">' +
              '<svg viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-3-6.7"/><polyline points="21 4 21 10 15 10"/></svg>' +
            '</button>' +
            '<div class="bc-w-forecast" id="calBigWForecast"></div>' +
          '</div>' +
          '<div class="bc-events" id="calBigEvents"></div>' +
        '</div>' +
        '<div class="cal-head">' +
          '<button class="cal-arrow" id="calPrevMonth" type="button">' +
            '<svg viewBox="0 0 24 24"><polyline points="15,6 9,12 15,18"/></svg>' +
          '</button>' +
          '<div class="cal-title" id="calTitle">— 月<small id="calTitleYear">----</small></div>' +
          '<button class="cal-arrow" id="calNextMonth" type="button">' +
            '<svg viewBox="0 0 24 24"><polyline points="9,6 15,12 9,18"/></svg>' +
          '</button>' +
        '</div>' +
        '<div class="cal-grid" id="calGrid"></div>' +
        '<div class="cal-events">' +
          '<div class="ce-head">This Month</div>' +
          '<div id="calMonthEvents"></div>' +
        '</div>' +
      '</div>';

    /* 3. 把日历页根节点换成可滑动的 flex 布局 */
    desk.style.display = 'flex';
    desk.style.flexDirection = 'column';
    desk.style.overflow = 'hidden';

    /* 4. 给日历区加滚动能力（跟原来 #page-calendar 一样） */
    const wrap = desk.querySelector('.cal-page-wrap');
    if(wrap){
      /* 让整个 desk 可以垂直滚动 */
      desk.style.overflowY = 'auto';
      desk.style.overflowX = 'hidden';
      desk.style.webkitOverflowScrolling = 'touch';
      desk.style.scrollbarWidth = 'none';
      desk.style.padding = '0';
      desk.style.background = '#ffffff';
    }

    /* 5. 返回按钮 */
    const back = desk.querySelector('#calDeskBack');
    if(back){
      back.addEventListener('click', function(e){
        e.preventDefault();
        e.stopPropagation();
        closeDeskCalendar();
      });
    }
  }

  /* 每次进入都刷新一次日期
     ★ 补充：把万年历 / 天气 / 事件列表都刷一遍
     ★ 如果还没初始化过 calCurrentYear / calCurrentMonth，就按今天初始化 */
  try{
    if(typeof initCalendarPage === 'function'){
      initCalendarPage();
    } else {
      refreshCalendarPage();
    }
  }catch(e){ console.error('日历刷新失败', e); }
  try{ refreshWeather(false); }catch(e){}
}

function closeDeskCalendar(){
  const desk = document.getElementById('page-desk');
  if(!desk) return;
  /* 恢复功能页结构：重新注入原始 HTML */
  desk.innerHTML =
    '<div class="desk-top"><div class="desk-title">功 能 页<small>FUNCTIONS</small></div><div class="desk-clock" id="deskClock">--:--</div></div>' +
    '<div class="desk-grid">' +
      '<div class="desk-app" data-open="music"><div class="da-ic"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.4"/></svg></div><div class="da-name">音乐</div></div>' +
      '<div class="desk-app" data-open="divine"><div class="da-ic"><svg viewBox="0 0 24 24"><path d="M2.5 12 C5 7.5 8.5 5.5 12 5.5 C15.5 5.5 19 7.5 21.5 12 C19 16.5 15.5 18.5 12 18.5 C8.5 18.5 5 16.5 2.5 12 Z"/><circle cx="12" cy="12" r="3.2"/></svg></div><div class="da-name">占卜记录</div></div>' +
      '<div class="desk-app" data-open="behavior"><div class="da-ic"><svg viewBox="0 0 24 24"><path d="M4 4h16v16H4z"/><path d="M8 9h8"/><path d="M8 13h5"/></svg></div><div class="da-name">角色行为</div></div>' +
      '<div class="desk-app" data-open="relation"><div class="da-ic"><svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="2"/><circle cx="19" cy="5" r="2"/><circle cx="19" cy="19" r="2"/><path d="M6.7 11.3l10.6-5.6"/><path d="M6.7 12.7l10.6 5.6"/><path d="M12 12h0"/></svg></div><div class="da-name">关系网</div></div>' +
      '<div class="desk-app" data-open="moments"><div class="da-ic"><svg viewBox="0 0 24 24"><rect x="3" y="4.5" width="18" height="15" rx="2.5"/><circle cx="8.5" cy="10" r="1.6"/><path d="M3.5 17l5-5 4 4 3-3 5 5"/></svg></div><div class="da-name">动态</div></div>' +
      '<div class="desk-app" data-open="groupchat"><div class="da-ic"><svg viewBox="0 0 24 24"><circle cx="8" cy="9" r="3"/><circle cx="16" cy="9" r="3"/><path d="M3 19c0-2.8 2.2-5 5-5s5 2.2 5 5"/><path d="M13 19c0-2.8 2.2-5 5-5s3 .6 3 2"/></svg></div><div class="da-name">群聊</div></div>' +
      '<div class="desk-app" data-open="videopool"><div class="da-ic"><svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M10 9l5 3-5 3z"/></svg></div><div class="da-name">共享池</div></div>' +
      '<div class="desk-app" data-open="forcevideo"><div class="da-ic"><svg viewBox="0 0 24 24"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg></div><div class="da-name">让Ta刷</div></div>' +
      '<div class="desk-app" data-open="gameres"><div class="da-ic"><svg viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="11" rx="5"/><path d="M7 11v4"/><path d="M5 13h4"/><circle cx="16" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="18.5" cy="14" r="1" fill="currentColor" stroke="none"/></svg></div><div class="da-name">游戏资源</div></div>' +
      '<div class="desk-app" data-open="msgstat"><div class="da-ic"><svg viewBox="0 0 24 24"><path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M22 20H2"/></svg></div><div class="da-name">消息统计</div></div>' +
      '<div class="desk-app" data-open="memory"><div class="da-ic"><svg viewBox="0 0 24 24"><path d="M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 11c0 5.5-7 10-7 10z"/></svg></div><div class="da-name">回忆</div></div>' +
      '<div class="desk-app" data-open="calendar"><div class="da-ic"><svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18"/><path d="M8 3v4"/><path d="M16 3v4"/><circle cx="8" cy="14" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="14" r="1" fill="currentColor" stroke="none"/><circle cx="16" cy="14" r="1" fill="currentColor" stroke="none"/></svg></div><div class="da-name">日历</div></div>' +
    '</div>';/* 恢复滚动 / 布局属性 */
  desk.style.display = '';
  desk.style.flexDirection = '';
  desk.style.overflow = '';
  desk.style.overflowY = '';
  desk.style.overflowX = '';
  desk.style.webkitOverflowScrolling = '';
  desk.style.scrollbarWidth = '';
  desk.style.padding = '';
  desk.style.background = '';

  /* 重新绑定 desk-app 点击（含新的 calendar） */
  $$('#page-desk .desk-app').forEach(el=>{
    el.addEventListener('click', ()=>{
      const k = el.dataset.open;
      if(k === 'calendar'){ openDeskCalendar(); return; }
      if(k === 'beauty') openBeauty();
      else if(k === 'divine'){ renderDivineRecords(); showScreen('divineRecordScreen'); }
      else if(k === 'behavior'){ behaviorKeyword=''; const si=$('#bhSearchInput'); if(si) si.value=''; renderBehavior(); showScreen('behaviorScreen'); }
      else if(k === 'relation'){ relationKeyword=''; const ri=$('#relSearchInput'); if(ri) ri.value=''; openRelationScreen(); }
      else if(k === 'music'){ openMusicScreen(); }
      else if(k === 'moments'){ if(typeof window.openMoments === 'function') window.openMoments(); }
      else if(k === 'friends'){ if(window.__goPage) window.__goPage(0); }
      else if(k === 'videopool'){ openVideoPool(); }
      else if(k === 'forcevideo'){ forceSendVideo(); }
      else if(k === 'memory'){ openMemoryScreen(); }
      else if(k === 'groupchat'){ openGroupList(); }
    });
  });

  /* 重建时钟 */
  function updateClock(){
    const d = new Date();
    const el = document.getElementById('deskClock');
    if(el) el.textContent = String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
  }
  updateClock();
  if(window.__deskClockTimer) clearInterval(window.__deskClockTimer);
  window.__deskClockTimer = setInterval(updateClock, 1000);
}

/* ============================================================
   音乐页 · 外壳（HTML 结构 + CSS + JS 骨架）
   - 完整可用的 UI，下一组替换点补"上传 mp3 + 播放"逻辑
   - 打开方式：功能页 → 点「音乐」
   - 关闭方式：左上角「‹」
   ============================================================ */
(function ensureMusicScreen(){
  if(document.getElementById('musicScreen')) return;

  /* ---- 1. CSS ---- */
  var st = document.createElement('style');
  st.id = 'musicScreenStyle';
  st.textContent = [
    '#musicScreen{position:fixed;inset:0;z-index:1200;max-width:520px;margin:0 auto;background:#fff;display:none;flex-direction:column;overflow:hidden;',
      'font-family:"Songti SC","STSong","SimSun","宋体",serif;color:#1a1a1a;',
      '-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;}',
    '#musicScreen.on{display:flex}',
    '#musicScreen .ms-top{flex:none;display:flex;align-items:center;gap:12px;padding:22px 24px 14px}',
    '#musicScreen .ms-back{width:36px;height:36px;flex:none;border:none;background:transparent;',
      'color:#1a1a1a;font-size:22px;line-height:1;display:flex;align-items:center;justify-content:center;',
      'padding:0 0 4px;font-family:inherit;cursor:pointer;opacity:.55;transition:opacity .18s ease}',
    '#musicScreen .ms-back:active{opacity:1}',
    '#musicScreen .ms-title{flex:1;font-size:15px;font-weight:300;letter-spacing:8px;text-align:center;color:#1a1a1a;padding-left:8px}',
    '#musicScreen .ms-add{width:36px;height:36px;flex:none;border:none;background:transparent;',
      'color:#1a1a1a;font-size:22px;line-height:1;display:flex;align-items:center;justify-content:center;',
      'padding:0;cursor:pointer;font-family:inherit;opacity:.55;transition:opacity .18s ease}',
    '#musicScreen .ms-add:active{opacity:1}',

    '#musicScreen .ms-chips{flex:none;display:flex;gap:8px;padding:0 24px 20px}',
    '#musicScreen .ms-chip{padding:6px 14px;font-size:12px;letter-spacing:2.5px;color:#aaa;',
      'background:transparent;border:0.7px solid rgba(0,0,0,.12);border-radius:14px;cursor:pointer;',
      'font-family:inherit;font-weight:300;transition:all .2s ease}',
    '#musicScreen .ms-chip:active{background:#f5f5f5}',
    '#musicScreen .ms-chip.on{color:#fff;background:#1a1a1a;border-color:#1a1a1a;font-weight:400}',

    '#musicScreen .ms-mode-row{flex:none;display:flex;gap:24px;padding:0 24px 16px;border-bottom:0.6px dashed #f0f0f0}',
    '#musicScreen .ms-mode{padding:4px 0;font-size:11.5px;color:#bbb;letter-spacing:2px;',
      'background:transparent;border:none;cursor:pointer;position:relative;font-family:inherit;font-weight:300}',
    '#musicScreen .ms-mode.on{color:#1a1a1a;font-weight:400}',
    '#musicScreen .ms-mode.on::after{content:"";position:absolute;left:50%;bottom:-6px;',
      'transform:translateX(-50%);width:16px;height:1.5px;background:#1a1a1a;border-radius:2px}',

    '#musicScreen .ms-now{flex:none;padding:28px 28px 10px;text-align:center}',
    '#musicScreen .ms-cover{width:108px;height:108px;margin:0 auto 20px;border-radius:50%;',
      'background:radial-gradient(circle at center,#2a2a2a 0%,#2a2a2a 17%,#1a1a1a 18%,#1a1a1a 23%,#2a2a2a 24%,#2a2a2a 41%,#1a1a1a 42%,#1a1a1a 47%,#2a2a2a 48%,#2a2a2a 65%,#1a1a1a 66%);',
      'display:flex;align-items:center;justify-content:center;position:relative;box-shadow:0 6px 20px rgba(0,0,0,.16)}',
    '#musicScreen .ms-cover.spinning{animation:msSpin 8s linear infinite}',
    '@keyframes msSpin{from{transform:rotate(0)}to{transform:rotate(360deg)}}',
    '#musicScreen .ms-cover::before{content:"";position:absolute;width:26px;height:26px;border-radius:50%;background:#fff}',
    '#musicScreen .ms-cover::after{content:"";position:absolute;width:6px;height:6px;border-radius:50%;background:#1a1a1a}',
    '#musicScreen .ms-now-name{font-size:15px;letter-spacing:1px;color:#1a1a1a;font-weight:300;',
      'margin-bottom:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:0 10px}',
    '#musicScreen .ms-now-sub{font-size:9.5px;letter-spacing:4px;color:#c8c8c8;font-family:Georgia,serif;font-weight:300}',

    '#musicScreen .ms-progress{flex:none;padding:18px 28px 6px;display:flex;align-items:center;gap:12px}',
    '#musicScreen .ms-time{font-size:10px;color:#bbb;font-family:Georgia,serif;flex:none;min-width:36px;letter-spacing:.5px}',
    '#musicScreen .ms-time.r{text-align:right}',
    '#musicScreen .ms-pbar{flex:1;height:1px;background:#ececec;border-radius:2px;position:relative;cursor:pointer}',
    '#musicScreen .ms-pfill{position:absolute;left:0;top:0;bottom:0;width:0%;background:#1a1a1a;border-radius:2px}',
    '#musicScreen .ms-pbar::after{content:"";position:absolute;width:8px;height:8px;border-radius:50%;',
      'background:#1a1a1a;top:50%;transform:translate(-50%,-50%);left:var(--ms-pos,0%);pointer-events:none;transition:left .1s linear}',

    '#musicScreen .ms-controls{flex:none;display:flex;align-items:center;justify-content:center;gap:30px;padding:14px 0 22px}',
    '#musicScreen .ms-ctl{width:44px;height:44px;border:none;background:transparent;color:#1a1a1a;cursor:pointer;',
      'padding:0;display:flex;align-items:center;justify-content:center}',
    '#musicScreen .ms-ctl:active{opacity:.5}',
    '#musicScreen .ms-ctl.play{width:56px;height:56px;border-radius:50%;background:#1a1a1a;color:#fff;box-shadow:0 2px 12px rgba(0,0,0,.14)}',
    '#musicScreen .ms-ctl svg{width:16px;height:16px;fill:currentColor}',
    '#musicScreen .ms-ctl.play svg{width:20px;height:20px}',

    '#musicScreen .ms-list{flex:1;overflow-y:auto;padding:8px 24px 40px;scrollbar-width:none;border-top:0.6px dashed #f0f0f0}',
    '#musicScreen .ms-list::-webkit-scrollbar{display:none}',
    '#musicScreen .ms-item{display:flex;align-items:center;gap:14px;padding:16px 2px;',
      'border-bottom:0.6px dashed rgba(0,0,0,.06);cursor:pointer}',
    '#musicScreen .ms-item:active{background:rgba(0,0,0,.015)}',
    '#musicScreen .ms-item.on .ms-n{font-weight:500;letter-spacing:1px}',
    '#musicScreen .ms-item .ms-idx{width:22px;flex:none;font-size:10px;color:#d8d8d8;',
      'font-family:Georgia,serif;text-align:right;letter-spacing:1px}',
    '#musicScreen .ms-item.on .ms-idx{color:#1a1a1a}',
    '#musicScreen .ms-item .ms-info{flex:1;min-width:0}',
    '#musicScreen .ms-item .ms-n{font-size:14px;letter-spacing:.5px;font-weight:300;',
      'white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '#musicScreen .ms-item .ms-s{font-size:10px;color:#bbb;margin-top:5px;letter-spacing:.5px;font-family:Georgia,serif}',
    '#musicScreen .ms-item .ms-del{width:26px;height:26px;flex:none;border:none;background:transparent;',
      'color:#d0d0d0;font-size:12px;cursor:pointer;padding:0;display:flex;align-items:center;justify-content:center}',
    '#musicScreen .ms-item .ms-del:active{color:#1a1a1a}',
    '#musicScreen .ms-empty{text-align:center;color:#bbb;font-size:13px;padding:70px 30px;',
      'line-height:2.2;letter-spacing:1.5px;font-weight:300}',
    '#musicScreen .ms-empty .big{display:block;font-size:26px;color:#e0e0e0;margin-bottom:20px;letter-spacing:0}',
    '#musicScreen input[type=file]{display:none}'
  ].join('');
  document.head.appendChild(st);

  /* ---- 2. HTML ---- */
  var wrap = document.createElement('div');
  wrap.className = 'screen';
  wrap.id = 'musicScreen';
  wrap.innerHTML =
    '<div class="ms-top">' +
      '<button class="ms-back" id="msBack" type="button">‹</button>' +
      '<div class="ms-title">音 乐</div>' +
      '<button class="ms-add" id="msAdd" type="button">＋</button>' +
    '</div>' +
    '<div class="ms-chips">' +
      '<button class="ms-chip on" data-g="list" type="button">歌 单</button>' +
      '<button class="ms-chip" data-g="bgm" type="button">B G M</button>' +
    '</div>' +
    '<div class="ms-mode-row" id="msModeRow" style="display:none">' +
      '<button class="ms-mode on" data-mode="loop" type="button">循 环</button>' +
      '<button class="ms-mode" data-mode="linear" type="button">直 线</button>' +
      '<button class="ms-mode" data-mode="shuffle" type="button">随 机</button>' +
    '</div>' +
    '<div class="ms-now">' +
      '<div class="ms-cover" id="msCover"></div>' +
      '<div class="ms-now-name" id="msNowName">还没选歌</div>' +
      '<div class="ms-now-sub" id="msNowSub">NO TRACK SELECTED</div>' +
    '</div>' +
    '<div class="ms-progress">' +
      '<span class="ms-time" id="msCur">0:00</span>' +
      '<div class="ms-pbar" id="msPbar"><div class="ms-pfill" id="msPfill"></div></div>' +
      '<span class="ms-time r" id="msDur">0:00</span>' +
    '</div>' +
    '<div class="ms-controls">' +
      '<button class="ms-ctl" id="msPrev" type="button">' +
        '<svg viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>' +
      '</button>' +
      '<button class="ms-ctl play" id="msPlay" type="button">' +
        '<svg id="msIcoPlay" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>' +
        '<svg id="msIcoPause" viewBox="0 0 24 24" style="display:none"><path d="M6 5h4v14H6zm8 0h4v14h-4z"/></svg>' +
      '</button>' +
      '<button class="ms-ctl" id="msNext" type="button">' +
        '<svg viewBox="0 0 24 24"><path d="M16 6h2v12h-2zM6 18l8.5-6L6 6z"/></svg>' +
      '</button>' +
    '</div>' +
    '<div class="ms-list" id="msList"></div>' +
    '<input type="file" id="msFilePick" accept="audio/*" multiple>';
  document.body.appendChild(wrap);

  /* ---- 3. JS 逻辑（上传 + 播放 + 持久化 + BGM 自动播）---- */
  var _msLists = { list: [], bgm: [] };
  var _msState = { group:'list', idx:{list:-1,bgm:-1}, mode:'loop', armed:false };
  var _msAudio = new Audio();
  _msAudio.preload = 'metadata';

  /* IndexedDB key：所有音频 Blob 存在这里，localStorage 只存元数据 */
  var MS_IDB_PREFIX = 'music_';
  var MS_META_KEY = 'mj_music_v1';   /* { list:[{id,name,size,dur,key}], bgm:[...] } */

  /* ---- IndexedDB 小工具（复用全局 __idb） ---- */
  function msIdbSet(k, blob){
    return (window.__idb && __idb.set) ? __idb.set(k, blob) : Promise.reject(new Error('IndexedDB 未就绪'));
  }
  function msIdbGetURL(k){
    return (window.__idb && __idb.toURL) ? __idb.toURL(k) : Promise.resolve(null);
  }
  function msIdbDel(k){
    return (window.__idb && __idb.del) ? __idb.del(k) : Promise.resolve();
  }

  /* ---- 元数据：读写 ---- */
  function msLoadMeta(){
    try{
      var raw = localStorage.getItem(MS_META_KEY);
      if(!raw) return { list:[], bgm:[] };
      var m = JSON.parse(raw);
      if(!m || typeof m !== 'object') return { list:[], bgm:[] };
      if(!Array.isArray(m.list)) m.list = [];
      if(!Array.isArray(m.bgm))  m.bgm  = [];
      return m;
    }catch(e){ return { list:[], bgm:[] }; }
  }
  function msSaveMeta(m){
    try{ localStorage.setItem(MS_META_KEY, JSON.stringify(m)); }catch(e){}
  }

  /* ---- 从 IndexedDB 恢复所有音频 URL，塞进 _msLists ---- */
  function msRestoreAll(){
    var meta = msLoadMeta();
    _msLists.list = meta.list.slice();
    _msLists.bgm  = meta.bgm.slice();
    /* 异步补上可播 URL */
    _msLists.list.forEach(function(t){
      if(t.key) msIdbGetURL(t.key).then(function(u){ if(u) t.url = u; });
    });
    _msLists.bgm.forEach(function(t){
      if(t.key) msIdbGetURL(t.key).then(function(u){ if(u) t.url = u; });
    });
  }

  /* ---- 工具 ---- */
  function msFmt(s){
    if(!isFinite(s)) return '0:00';
    var m = Math.floor(s/60), sec = Math.floor(s%60);
    return m + ':' + (sec<10?'0':'') + sec;
  }
  function msEscape(s){
    return String(s).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }
  function msPickShuffle(arr, excludeIdx){
    if(arr.length <= 1) return 0;
    var cand = [];
    for(var i=0;i<arr.length;i++){ if(i!==excludeIdx) cand.push(i); }
    return cand[Math.floor(Math.random()*cand.length)];
  }

  /* ---- 播放控制 ---- */
  function msPlayAt(g, i){
    var arr = _msLists[g];
    if(i < 0 || i >= arr.length) return;
    var t = arr[i];
    if(!t.url){
      msIdbGetURL(t.key).then(function(u){
        if(!u){ toast && toast('音频加载失败'); return; }
        t.url = u;
        msPlayAt(g, i);
      });
      return;
    }
    _msState.group = g;
    _msState.idx[g] = i;
    _msAudio.src = t.url;
    _msAudio.play().then(function(){
      var cv = document.getElementById('msCover');
      if(cv) cv.classList.add('spinning');
      var ip = document.getElementById('msIcoPlay');
      var ipause = document.getElementById('msIcoPause');
      if(ip) ip.style.display = 'none';
      if(ipause) ipause.style.display = '';
    }).catch(function(){});
    msUpdateNow();
    window.renderMusicScreen();
  }

  function msUpdateNow(){
    var g = _msState.group;
    var idx = _msState.idx[g];
    var nameEl = document.getElementById('msNowName');
    var subEl  = document.getElementById('msNowSub');
    var cv = document.getElementById('msCover');
    var ip = document.getElementById('msIcoPlay');
    var ipause = document.getElementById('msIcoPause');
    if(idx < 0 || !_msLists[g][idx]){
      if(nameEl) nameEl.textContent = '还没选歌';
      if(subEl)  subEl.textContent  = 'NO TRACK SELECTED';
      if(cv) cv.classList.remove('spinning');
      if(ip) ip.style.display = '';
      if(ipause) ipause.style.display = 'none';
      return;
    }
    var t = _msLists[g][idx];
    if(nameEl) nameEl.textContent = t.name;
    if(subEl)  subEl.textContent  = (g === 'bgm' ? 'BGM · ' : 'PLAYING · ') + String(idx+1).padStart(2,'0');
  }

  function msNextByMode(){
    var g = _msState.group;
    var arr = _msLists[g];
    if(!arr.length) return;
    var idx = _msState.idx[g];
    if(_msState.mode === 'loop'){ msPlayAt(g, idx); return; }
    if(_msState.mode === 'linear'){
      if(idx < arr.length - 1) msPlayAt(g, idx + 1);
      else {
        _msAudio.pause();
        var cv = document.getElementById('msCover'); if(cv) cv.classList.remove('spinning');
        var ip = document.getElementById('msIcoPlay'); if(ip) ip.style.display = '';
        var ipause = document.getElementById('msIcoPause'); if(ipause) ipause.style.display = 'none';
      }
      return;
    }
    if(_msState.mode === 'shuffle'){ msPlayAt(g, msPickShuffle(arr, idx)); }
  }

  function _msEscape(s){
    return String(s).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  window.renderMusicScreen = function(){
    var listEl = document.getElementById('msList');
    if(!listEl) return;
    document.querySelectorAll('#musicScreen .ms-chip').forEach(function(c){
      c.classList.toggle('on', c.dataset.g === _msState.group);
    });
    var modeRow = document.getElementById('msModeRow');
    if(modeRow) modeRow.style.display = (_msState.group === 'bgm') ? 'flex' : 'none';

    var arr = _msLists[_msState.group];
    var cur = _msState.idx[_msState.group];
    if(!arr.length){
      listEl.innerHTML = '<div class="ms-empty"><span class="big">♪</span>还没有歌<br>点右上角 ＋ 导入本地音乐</div>';
      return;
    }
    listEl.innerHTML = arr.map(function(t, i){
      return '<div class="ms-item ' + (i===cur?'on':'') + '" data-i="' + i + '">' +
        '<span class="ms-idx">' + String(i+1).padStart(2,'0') + '</span>' +
        '<div class="ms-info">' +
          '<div class="ms-n">' + msEscape(t.name) + '</div>' +
          '<div class="ms-s">' + (t.size ? (t.size/1024/1024).toFixed(2) + ' MB' : '') + '</div>' +
        '</div>' +
        '<button class="ms-del" data-del="' + i + '" type="button">✕</button>' +
      '</div>';
    }).join('');

    /* 列表点击 */
    listEl.querySelectorAll('.ms-item').forEach(function(it){
      it.onclick = function(e){
        if(e.target.closest('.ms-del')) return;
        msPlayAt(_msState.group, +it.dataset.i);
      };
    });
    /* 删除 */
    listEl.querySelectorAll('.ms-del').forEach(function(b){
      b.onclick = function(e){
        e.stopPropagation();
        var i = +b.dataset.del;
        var g = _msState.group;
        var meta = msLoadMeta();
        var track = _msLists[g][i];
        if(!track) return;
        if(i === _msState.idx[g]){
          _msAudio.pause();
          _msState.idx[g] = -1;
          msUpdateNow();
        } else if(i < _msState.idx[g]){
          _msState.idx[g]--;
        }
        _msLists[g].splice(i, 1);
        /* 同步删 localStorage 元数据 + IndexedDB 里的 blob */
        meta[g] = meta[g].filter(function(x){ return x.id !== track.id; });
        msSaveMeta(meta);
        if(track.key) msIdbDel(track.key).catch(function(){});
        window.renderMusicScreen();
      };
    });
  };

  window.openMusicScreen = function(){
    var el = document.getElementById('musicScreen');
    if(!el) return;
    if(el.classList.contains('on')) return;
    /* ★ 功能页模式：把音乐搬进 desk，支持左右滑切页 */
    if(window.__deskMode && typeof openDeskFeature === 'function'){
      openDeskFeature('musicScreen');
    } else {
      document.querySelectorAll('.screen.on').forEach(function(s){ s.classList.remove('on'); });
      el.classList.add('on');
    }
    /* 首次打开时尝试恢复 IndexedDB 里的音频 */
    if(!el._restored){
      el._restored = true;
      msRestoreAll();
      setTimeout(function(){ window.renderMusicScreen(); }, 100);
    } else {
      window.renderMusicScreen();
    }
  };
  window.closeMusicScreen = function(){
    /* ★ 功能页模式：走 closeDeskFeature 恢复功能页 */
    if(window.__deskMode && typeof closeDeskFeature === 'function'){
      closeDeskFeature();
      return;
    }
    var el = document.getElementById('musicScreen');
    if(el) el.classList.remove('on');
  };

  /* 返回按钮 */
  document.addEventListener('click', function(e){
    if(e.target && e.target.closest && e.target.closest('#msBack')){
      e.preventDefault();
      e.stopPropagation();
      window.closeMusicScreen();
    }
  }, true);

  /* 分组切换 + 模式切换 + 上传 + 播放控制（统一委托） */
  document.addEventListener('click', function(e){
    var t = e.target;

    /* 分组 chip */
    var chip = t.closest && t.closest('#musicScreen .ms-chip');
    if(chip){
      e.preventDefault();
      _msState.group = chip.dataset.g;
      _msAudio.pause();
      var cv = document.getElementById('msCover'); if(cv) cv.classList.remove('spinning');
      var ip = document.getElementById('msIcoPlay'); if(ip) ip.style.display = '';
      var ipause = document.getElementById('msIcoPause'); if(ipause) ipause.style.display = 'none';
      msUpdateNow();
      window.renderMusicScreen();
      return;
    }

    /* 模式 chip */
    var mode = t.closest && t.closest('#musicScreen .ms-mode');
    if(mode){
      e.preventDefault();
      _msState.mode = mode.dataset.mode;
      document.querySelectorAll('#musicScreen .ms-mode').forEach(function(x){
        x.classList.toggle('on', x === mode);
      });
      return;
    }

    /* 上传按钮 */
    if(t.closest && t.closest('#msAdd')){
      e.preventDefault();
      var fp = document.getElementById('msFilePick');
      if(fp){ fp.value = ''; fp.click(); }
      return;
    }

    /* 播放 / 暂停 */
    if(t.closest && t.closest('#msPlay')){
      e.preventDefault();
      var g = _msState.group, arr = _msLists[g], idx = _msState.idx[g];
      if(idx < 0){
        if(arr.length) msPlayAt(g, 0);
        return;
      }
      if(_msAudio.paused){
        _msAudio.play().then(function(){
          var cvv = document.getElementById('msCover'); if(cvv) cvv.classList.add('spinning');
          var ipp = document.getElementById('msIcoPlay'); if(ipp) ipp.style.display = 'none';
          var ipa = document.getElementById('msIcoPause'); if(ipa) ipa.style.display = '';
        }).catch(function(){});
      } else {
        _msAudio.pause();
        var cv2 = document.getElementById('msCover'); if(cv2) cv2.classList.remove('spinning');
        var ip2 = document.getElementById('msIcoPlay'); if(ip2) ip2.style.display = '';
        var ipa2 = document.getElementById('msIcoPause'); if(ipa2) ipa2.style.display = 'none';
      }
      return;
    }

    /* 上一首 */
    if(t.closest && t.closest('#msPrev')){
      e.preventDefault();
      var g2 = _msState.group, arr2 = _msLists[g2], idx2 = _msState.idx[g2];
      if(idx2 > 0) msPlayAt(g2, idx2 - 1);
      else if(arr2.length) msPlayAt(g2, arr2.length - 1);
      return;
    }

    /* 下一首 */
    if(t.closest && t.closest('#msNext')){
      e.preventDefault();
      var g3 = _msState.group, arr3 = _msLists[g3], idx3 = _msState.idx[g3];
      if(idx3 < 0 && arr3.length){ msPlayAt(g3, 0); return; }
      if(_msState.mode === 'shuffle'){ msPlayAt(g3, msPickShuffle(arr3, idx3)); return; }
      if(_msState.mode === 'loop'){ msPlayAt(g3, idx3); return; }
      if(idx3 < arr3.length - 1) msPlayAt(g3, idx3 + 1);
      else msPlayAt(g3, 0);
      return;
    }
  }, true);

  /* 上传文件 */
  document.addEventListener('change', function(e){
    var t = e.target;
    if(!t || t.id !== 'msFilePick') return;
    var files = Array.prototype.slice.call(t.files || []);
    t.value = '';
    if(!files.length) return;
    var g = _msState.group;
    var meta = msLoadMeta();
    if(!Array.isArray(meta[g])) meta[g] = [];
    var doneCount = 0;
    files.forEach(function(f, idx){
      var id = 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2,5);
      var key = MS_IDB_PREFIX + id;
      /* 存 blob 到 IndexedDB */
      msIdbSet(key, f).then(function(){
        var track = {
          id: id, key: key,
          name: f.name.replace(/\.[^.]+$/, ''),
          size: f.size
        };
        _msLists[g].push(track);
        meta[g].push({ id: id, key: key, name: track.name, size: track.size });
        msSaveMeta(meta);
        /* 直接给 URL 便于立即播放 */
        track.url = URL.createObjectURL(f);
        doneCount++;
        if(doneCount === files.length){
          window.renderMusicScreen();
          if(_msState.idx[g] < 0 && _msLists[g].length) msPlayAt(g, 0);
        }
      }).catch(function(err){
        console.error('音乐存 IndexedDB 失败', err);
        if(window.toast) toast('上传失败：' + (err && err.message ? err.message : '未知错误'));
      });
    });
  }, true);

  /* 进度条 */
  document.addEventListener('click', function(e){
    var bar = e.target.closest && e.target.closest('#msPbar');
    if(!bar) return;
    e.preventDefault();
    if(!_msAudio.duration) return;
    var r = bar.getBoundingClientRect();
    var p = (e.clientX - r.left) / r.width;
    _msAudio.currentTime = p * _msAudio.duration;
  }, true);

  /* 播放器事件 */
  _msAudio.ontimeupdate = function(){
    var curEl = document.getElementById('msCur');
    var fillEl = document.getElementById('msPfill');
    var barEl = document.getElementById('msPbar');
    if(curEl) curEl.textContent = msFmt(_msAudio.currentTime);
    if(_msAudio.duration){
      var p = _msAudio.currentTime / _msAudio.duration * 100;
      if(fillEl) fillEl.style.width = p + '%';
      if(barEl) barEl.style.setProperty('--ms-pos', p + '%');
    }
  };
  _msAudio.onloadedmetadata = function(){
    var durEl = document.getElementById('msDur');
    if(durEl) durEl.textContent = msFmt(_msAudio.duration);
  };
  _msAudio.onended = function(){
    msNextByMode();
  };

  /* ============================================================
     BGM 进站自动播：用户第一次点击屏幕时触发
     - 只在"已经上传过 BGM 且还没播过"时触发
     - 第一次触发后，_msState.armed = true
     ============================================================ */
  function msArmBgmAutoPlay(){
    if(_msState.armed) return;
    _msState.armed = true;
    var bgmArr = _msLists.bgm;
    if(!bgmArr.length) return;
    /* 如果当前没有在播的，就自动挑一首 BGM 播 */
    if(_msAudio.paused){
      var i = (_msState.mode === 'shuffle') ? msPickShuffle(bgmArr, -1) : 0;
      /* 不改变当前显示的 tab，只在后台播 */
      var g0 = _msState.group;
      var i0 = _msState.idx[_msState.group];
      _msState.group = 'bgm';
      _msState.idx.bgm = i;
      msPlayAt('bgm', i);
      /* 恢复用户之前看的 tab */
      _msState.group = g0;
      _msState.idx.list = i0;
    }
  }
  window.addEventListener('touchstart', msArmBgmAutoPlay, {once:false, passive:true});
  window.addEventListener('click', msArmBgmAutoPlay, {once:false, passive:true});

})();
window.__calendar = {
  init: initCalendarPage,
  refresh: refreshCalendarPage,
  refreshWeather: refreshWeather,
  openDeskEdit: () => { showScreen('deskEditScreen'); renderDeskEdit('date'); },
  openInDesk: openDeskCalendar,
  closeInDesk: closeDeskCalendar
};

/* 启动：
   - 原来独立日历页的初始化已去掉，因为那一页已从 pageStack 移除
   - 日历数据现在由 openDeskCalendar() 内部按需初始化 / 刷新
   - 这里只把页面挂载点准备好 */
try{
  window.__calendarReady = true;
}catch(e){ console.error('日历初始化失败', e); }
