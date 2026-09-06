const SOURCES = {
  '2026-09-06-mcmaster-guelph': {
    page: 'https://oua.ca/sports/fball/2026-27/boxscores/20260906_zejw.xml',
    event: 'zejwko398jziv641',
    hash: 'jaZCLnq6vCM3X/A8apbO3cnD8QKyJYUz',
    awayId: 'MAC',
    homeId: 'GUE'
  }
};

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.end(JSON.stringify(body));
}

function text(v) { return v == null ? '' : String(v); }
function num(v) {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const n = Number(String(v ?? '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : null;
}

function walk(root, cb, path = '$', seen = new WeakSet()) {
  if (!root || typeof root !== 'object') return;
  if (seen.has(root)) return;
  seen.add(root);
  cb(root, path);
  if (Array.isArray(root)) root.forEach((v, i) => walk(v, cb, `${path}[${i}]`, seen));
  else Object.entries(root).forEach(([k, v]) => walk(v, cb, `${path}.${k}`, seen));
}

function periodLabel(status) {
  const raw = Array.isArray(status?.period) ? status.period[0] : status?.period;
  const p = text(raw).trim();
  if (!p) return '';
  if (/^\d+$/.test(p)) return `Q${p}`;
  return p.toUpperCase();
}

function findTeamScore(data, teamId) {
  let best = null;
  walk(data, (o, path) => {
    const id = text(o.id || o.teamId || o.team_id || o.code || o.abbr).toUpperCase();
    if (id !== teamId.toUpperCase()) return;
    for (const key of ['score','points','pts','total','totpts','tot_points']) {
      if (o[key] != null) {
        const n = num(o[key]);
        if (n != null && n >= 0 && n < 200) {
          const rank = /scores|team|dnp/.test(path.toLowerCase()) ? 3 : 1;
          if (!best || rank > best.rank) best = { value:n, rank };
        }
      }
    }
  });
  return best?.value ?? null;
}

function flattenPlays(data) {
  const out = [];
  const seen = new Set();
  walk(data?.plays, (o) => {
    if (Array.isArray(o)) return;
    const desc = o.description ?? o.desc ?? o.text ?? o.play ?? o.summary ?? o.pbp;
    if (typeof desc !== 'string' || desc.trim().length < 4) return;
    const clock = text(o.clock ?? o.time ?? o.gameclock ?? o.game_clock);
    const q = text(o.qtr ?? o.quarter ?? o.period ?? o.q);
    const key = `${q}|${clock}|${desc}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ q, clock, description: desc.trim(), type: text(o.type ?? o.result ?? 'PLAY').toUpperCase() });
  });
  return out.slice(-60).reverse();
}

function flattenDrives(data) {
  const out = [];
  walk(data?.drives, (o) => {
    if (Array.isArray(o)) return;
    const plays = num(o.plays ?? o.playCount ?? o.numplays);
    const yards = num(o.yards ?? o.yds ?? o.netyards);
    const team = text(o.team ?? o.teamId ?? o.team_id ?? o.id);
    const result = text(o.result ?? o.end ?? o.summary ?? o.outcome);
    const time = text(o.time ?? o.elapsed ?? o.top);
    if (plays != null || yards != null || result || time) out.push({team,plays,yards,result,time});
  });
  return out.slice(-20).reverse();
}

function teamAndPlayerStats(data) {
  const teamStats = [];
  const playerStats = [];
  walk(data?.team, (o, path) => {
    if (Array.isArray(o)) return;
    const id = text(o.id || o.teamId || o.team_id || o.code || o.abbr);
    const name = text(o.name || o.player || o.fullname || o.full_name);
    const statKeys = Object.keys(o).filter(k => /^(yds|yards|att|cmp|comp|td|int|rec|car|rush|pass|tkl|tack|sack|fg|xp|punt)/i.test(k));
    if (!statKeys.length) return;
    const stats = {};
    statKeys.slice(0,18).forEach(k => { if (['string','number'].includes(typeof o[k])) stats[k] = o[k]; });
    if (name && !/^MAC$|^GUE$/i.test(name)) playerStats.push({team:id,name,stats,path});
    else if (id) teamStats.push({team:id,stats,path});
  });
  return { teamStats: teamStats.slice(0,20), playerStats: playerStats.slice(0,100) };
}

function normalize(data, source) {
  const status = data?.status || {};
  const ps = teamAndPlayerStats(data);
  return {
    source: data?.source || 'PrestoSports',
    version: data?.version || null,
    platformId: data?.platformId || null,
    lastUpdated: data?.network?.lastUpdated || data?.generated || new Date().toISOString(),
    status: {
      complete: text(status.complete).toUpperCase() === 'Y',
      period: periodLabel(status),
      clock: text(status.clock),
      running: text(status.running)
    },
    game: {
      awayId: source.awayId,
      homeId: source.homeId,
      awayScore: findTeamScore(data, source.awayId),
      homeScore: findTeamScore(data, source.homeId)
    },
    plays: flattenPlays(data),
    drives: flattenDrives(data),
    teamStats: ps.teamStats,
    playerStats: ps.playerStats,
    rawKeys: Object.keys(data || {})
  };
}

async function fetchJson(url, referer) {
  const r = await fetch(url, {
    method: 'GET',
    redirect: 'follow',
    headers: {
      'Accept': 'application/json,text/plain,*/*',
      'User-Agent': 'Mozilla/5.0 (compatible; USportsGameCentre/1.0)',
      'Referer': referer,
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    }
  });
  const body = await r.text();
  if (!r.ok) throw Object.assign(new Error(`Presto upstream returned ${r.status}`), {status:r.status, body:body.slice(0,300)});
  let data;
  try { data = JSON.parse(body); }
  catch { throw Object.assign(new Error('Presto response was not JSON'), {status:502, body:body.slice(0,300)}); }
  return data;
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return send(res, 200, {ok:true});
  if (req.method !== 'GET') return send(res, 405, {ok:false,error:'GET only'});
  const game = String(req.query.game || '');
  const source = SOURCES[game];
  if (!source) return send(res, 404, {ok:false,error:'No verified Presto source registered for this game',game});
  const liveUrl = `https://oua.ca/action/sports/liveupdate?e=${encodeURIComponent(source.event)}&h=${encodeURIComponent(source.hash)}`;
  try {
    const raw = await fetchJson(liveUrl, source.page);
    return send(res, 200, {ok:true, game, upstreamStatus:200, cadenceSeconds:10, sourcePage:source.page, data:normalize(raw,source)});
  } catch (e) {
    return send(res, 502, {ok:false,game,upstreamStatus:e.status || null,error:e.message,detail:e.body || null,sourcePage:source.page});
  }
}
