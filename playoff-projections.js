(function () {
  'use strict';

  const CONFERENCES = [
    { id: 'OUA', name: 'OUA', spots: 7 },
    { id: 'RSEQ', name: 'RSEQ', spots: 4 },
    { id: 'CW', name: 'Canada West', spots: 4 },
    { id: 'AUS', name: 'AUS', spots: 3 }
  ];
  const OUA_RULES_URL = 'https://www.oua.ca/sports/fball/2025-26/files/operations';
  const RSEQ_RULES_URL = 'https://rseq.ca/media/875453/2627_uni_reglements_secteur.pdf';
  const OUA_POINT_CAP = 25;
  const STORE_KEY = 'canufootball:playoff-projections:v1';
  const conferenceFor = id => CONFERENCES.find(c => c.id === id) || CONFERENCES[0];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const today = () => new Date().toISOString().slice(0, 10);
  const validScore = value => value != null && value !== '' && Number.isFinite(Number(value)) && Number(value) >= 0;
  const numeric = value => Number.isFinite(Number(value)) ? Number(value) : null;
  const nameOf = slug => {
    const team = typeof TEAM !== 'undefined' ? TEAM[slug] : null;
    return team?.short || team?.name || String(slug || 'Team').replace(/-/g, ' ');
  };
  const logoOf = slug => {
    const team = typeof TEAM !== 'undefined' ? TEAM[slug] : null;
    if (!team?.logo) return '';
    return `<img class="pp-logo" src="${esc(team.logo)}" alt="" onerror="this.hidden=true">`;
  };

  function loadPicks() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); }
    catch (_) { return {}; }
  }
  const picksByConference = loadPicks();
  let bound = false;
  function picksFor(conf) { return picksByConference[conf] || (picksByConference[conf] = {}); }
  function savePicks() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(picksByConference)); } catch (_) { /* Private browsing can disable storage. */ }
  }

  function conferenceGames(conf) {
    if (typeof GAMES === 'undefined' || !Array.isArray(GAMES)) return [];
    return GAMES.filter(g => g && g.conference === conf && g.exhibition !== true)
      .slice().sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.id).localeCompare(String(b.id)));
  }

  function leagueTeams(conf) {
    return (typeof TEAMS !== 'undefined' ? TEAMS : []).filter(t => t.conference === conf);
  }

  function scoredFinal(g) {
    return String(g.status).toLowerCase() === 'final' && numeric(g.awayScore) !== null && numeric(g.homeScore) !== null;
  }

  function scoreForScenario(g, pick) {
    if (!pick || !validScore(pick.awayScore) || !validScore(pick.homeScore)) return null;
    return { away: Number(pick.awayScore), home: Number(pick.homeScore) };
  }

  function scenarioGames(conf) {
    const picks = picksFor(conf);
    return conferenceGames(conf).map(g => {
      if (scoredFinal(g)) return { ...g, scenario: false, result: { away: Number(g.awayScore), home: Number(g.homeScore) } };
      const p = picks[g.id];
      if (!p?.winner) return null;
      return { ...g, scenario: true, pick: p, result: scoreForScenario(g, p) };
    }).filter(Boolean);
  }

  function recordsFor(conf) {
    const records = Object.fromEntries(leagueTeams(conf).map(t => [t.slug, { slug: t.slug, w: 0, l: 0, pf: 0, pa: 0, gp: 0, scoredGames: 0 }]));
    for (const g of scenarioGames(conf)) {
      const a = records[g.away], h = records[g.home];
      if (!a || !h) continue;
      a.gp++; h.gp++;
      if (g.result) {
        a.pf += g.result.away; a.pa += g.result.home;
        h.pf += g.result.home; h.pa += g.result.away;
        a.scoredGames++; h.scoredGames++;
      }
      const awayWon = g.scenario ? g.pick.winner === g.away : g.result.away > g.result.home;
      if (awayWon) { a.w++; h.l++; }
      else { h.w++; a.l++; }
    }
    return records;
  }

  function gamesPlayedBy(conf) {
    return scenarioGames(conf);
  }

  function standingValue(row) { return row.w + row.l ? row.w / (row.w + row.l) : 0; }

  function headToHeadGames(group, games) {
    const set = new Set(group.map(r => r.slug));
    return games.filter(g => set.has(g.away) && set.has(g.home));
  }

  function completeScores(games) { return games.every(g => !!g.result); }

  function cappedDiffForTeam(slug, games) {
    let diff = 0;
    for (const g of games) {
      if (!g.result) return null;
      const raw = g.away === slug ? g.result.away - g.result.home : g.result.home - g.result.away;
      diff += Math.max(-OUA_POINT_CAP, Math.min(OUA_POINT_CAP, raw));
    }
    return diff;
  }

  function commonOpponents(group, games) {
    const candidates = leagueTeams('OUA').map(t => t.slug).filter(slug => !group.some(r => r.slug === slug));
    return candidates.filter(opponent => group.every(r => games.some(g =>
      (g.away === r.slug && g.home === opponent) || (g.home === r.slug && g.away === opponent))));
  }

  function gamesAgainst(slug, opponents, games) {
    const opponentSet = new Set(opponents);
    return games.filter(g => (g.away === slug && opponentSet.has(g.home)) || (g.home === slug && opponentSet.has(g.away)));
  }

  function winsIn(slug, games) {
    let wins = 0;
    for (const g of games) {
      const winner = g.scenario ? g.pick.winner : (g.result.away > g.result.home ? g.away : g.home);
      if (winner === slug) wins++;
    }
    return wins;
  }

  function diffIn(slug, games) { return cappedDiffForTeam(slug, games); }

  function compareCriterion(group, index, games, baseRows) {
    const values = new Map();
    let label = '';
    if (index === 0) { label = 'League wins'; group.forEach(r => values.set(r.slug, r.w)); }
    if (index === 1 || index === 2) {
      const h2h = headToHeadGames(group, games);
      if (!group.every(r => group.filter(x => x.slug !== r.slug).every(o => h2h.some(g => (g.away === r.slug && g.home === o.slug) || (g.home === r.slug && g.away === o.slug))))) return { unavailable: 'Not every tied team has played every other tied team.' };
      if (index === 1) { label = 'Head-to-head record'; group.forEach(r => values.set(r.slug, winsIn(r.slug, h2h))); }
      else {
        label = 'Head-to-head point difference (25-point game cap)';
        if (!completeScores(h2h)) return { unavailable: 'A score is missing for a head-to-head game.' };
        group.forEach(r => values.set(r.slug, diffIn(r.slug, h2h)));
      }
    }
    if (index === 3) { label = 'Record in OUA games'; group.forEach(r => values.set(r.slug, r.w)); }
    if (index === 4 || index === 7) {
      const opponents = commonOpponents(group, games);
      const commonGames = new Map(group.map(r => [r.slug, gamesAgainst(r.slug, opponents, games)]));
      if (index === 4) { label = 'Record against common opponents'; group.forEach(r => values.set(r.slug, winsIn(r.slug, commonGames.get(r.slug)))); }
      else {
        label = 'Point difference against common opponents';
        if (group.some(r => !completeScores(commonGames.get(r.slug)))) return { unavailable: 'A score against a common opponent is missing.' };
        group.forEach(r => values.set(r.slug, diffIn(r.slug, commonGames.get(r.slug))));
      }
    }
    if (index === 5 || index >= 8 && index <= 10) {
      const tied = new Set(group.map(r => r.slug));
      let opponents = baseRows.map(r => r.slug).filter(slug => !tied.has(slug));
      for (let i = 1; i < baseRows.length; i++) {
        if (baseRows[i - 1].w === baseRows[i].w && !tied.has(baseRows[i - 1].slug) && !tied.has(baseRows[i].slug)) {
          return { unavailable: 'The standings order of two other tied OUA teams is unresolved.' };
        }
      }
      if (index >= 8) opponents = opponents.slice(index - 8, index - 7);
      if (index === 5) {
        label = 'Record against OUA teams in standings order';
        const firstDifferent = new Map();
        // This criterion compares tied teams against each outside team, from the top down.
        for (const opponent of opponents) {
          for (const r of group) {
            const w = winsIn(r.slug, gamesAgainst(r.slug, [opponent], games));
            if (!firstDifferent.has(r.slug)) firstDifferent.set(r.slug, []);
            firstDifferent.get(r.slug).push(w);
          }
          const columns = group.map(r => firstDifferent.get(r.slug).at(-1));
          if (new Set(columns).size > 1) { group.forEach((r, i) => values.set(r.slug, columns[i])); return { label, values }; }
        }
        group.forEach(r => values.set(r.slug, (firstDifferent.get(r.slug) || []).join(',')));
      } else {
        label = `Point difference vs. OUA team ${opponents[0] || ''}`;
        if (!opponents.length) return { unavailable: 'No further OUA opponent is available.' };
        const perTeam = group.map(r => gamesAgainst(r.slug, opponents, games));
        if (perTeam.some(items => !completeScores(items))) return { unavailable: 'A score against the comparison opponent is missing.' };
        group.forEach(r => values.set(r.slug, diffIn(r.slug, gamesAgainst(r.slug, opponents, games))));
      }
    }
    if (index === 6) {
      label = 'Point difference in OUA games';
      if (group.some(r => !completeScores(gamesPlayedBy('OUA').filter(g => g.away === r.slug || g.home === r.slug)))) return { unavailable: 'A score is missing in an OUA game.' };
      group.forEach(r => values.set(r.slug, diffIn(r.slug, games.filter(g => g.away === r.slug || g.home === r.slug))));
    }
    if (index === 11) {
      label = 'Total point difference';
      if (group.some(r => !completeScores(gamesPlayedBy('OUA').filter(g => g.away === r.slug || g.home === r.slug)))) return { unavailable: 'A score is missing in an OUA game.' };
      group.forEach(r => values.set(r.slug, diffIn(r.slug, games.filter(g => g.away === r.slug || g.home === r.slug))));
    }
    return { label, values };
  }

  function resolveOuaGroup(group, startIndex, games, baseRows, trace) {
    if (group.length < 2) return { tiers: [group], unresolved: false };
    for (let index = startIndex; index < 12; index++) {
      const result = compareCriterion(group, index, games, baseRows);
      if (result.unavailable) return { tiers: [group], unresolved: true, reason: result.unavailable, trace };
      const distinct = new Set(group.map(r => String(result.values.get(r.slug))));
      trace.push(result.label);
      if (distinct.size === 1) continue;
      const groups = new Map();
      group.forEach(r => {
        const key = String(result.values.get(r.slug));
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(r);
      });
      const ordered = [...groups.entries()].sort((a, b) => {
        const av = a[0].split(',').map(Number), bv = b[0].split(',').map(Number);
        for (let i = 0; i < Math.max(av.length, bv.length); i++) {
          const d = (bv[i] ?? -Infinity) - (av[i] ?? -Infinity);
          if (d) return d;
        }
        return (Number(b[0]) || 0) - (Number(a[0]) || 0);
      });
      const tiers = [];
      let unresolved = false, reason = '';
      for (const [, tier] of ordered) {
        if (tier.length === 1) tiers.push(tier);
        else {
          const nested = resolveOuaGroup(tier, index + 1, games, baseRows, trace.slice());
          tiers.push(...nested.tiers);
          if (nested.unresolved) { unresolved = true; reason = nested.reason; }
        }
      }
      return { tiers, unresolved, reason, trace };
    }
    return { tiers: [group], unresolved: true, reason: 'The final OUA procedure requires a coin toss or drawing of lots.', trace };
  }

  function ratio(wins, games) { return games ? wins / games : null; }

  function ausCriterion(group, index, games) {
    const values = new Map();
    if (index === 0) {
      const h2h = headToHeadGames(group, games);
      if (group.some(r => group.some(o => r.slug !== o.slug && !h2h.some(g => (g.away === r.slug && g.home === o.slug) || (g.home === r.slug && g.away === o.slug))))) {
        return { unavailable: 'Not every tied team has played every other tied team.' };
      }
      group.forEach(r => { const against = h2h.filter(g => g.away === r.slug || g.home === r.slug); values.set(r.slug, ratio(winsIn(r.slug, against), against.length)); });
      return { label: 'Head-to-head win ratio', values };
    }
    if (index === 1) {
      const h2h = headToHeadGames(group, games);
      if (!completeScores(h2h)) return { unavailable: 'A score is missing for a head-to-head game.' };
      group.forEach(r => values.set(r.slug, h2h.reduce((sum, g) => sum + (g.away === r.slug ? g.result.away - g.result.home : g.result.home - g.result.away), 0)));
      return { label: 'Head-to-head point difference', values };
    }
    if (index === 2 || index === 3) {
      const league = leagueTeams('AUS').map(t => t.slug);
      const common = league.filter(op => !group.some(r => r.slug === op) && group.every(r => games.some(g => (g.away === r.slug && g.home === op) || (g.home === r.slug && g.away === op))));
      if (index === 2) {
        group.forEach(r => { const against = gamesAgainst(r.slug, common, games); values.set(r.slug, ratio(winsIn(r.slug, against), against.length)); });
        return { label: 'Record against common opponents', values };
      }
      const byTeam = new Map(group.map(r => [r.slug, gamesAgainst(r.slug, common, games)]));
      if (group.some(r => !completeScores(byTeam.get(r.slug)))) return { unavailable: 'A score against a common opponent is missing.' };
      group.forEach(r => {
        const against = byTeam.get(r.slug);
        const pf = against.reduce((n, g) => n + (g.away === r.slug ? g.result.away : g.result.home), 0);
        const pa = against.reduce((n, g) => n + (g.away === r.slug ? g.result.home : g.result.away), 0);
        values.set(r.slug, pa ? pf / pa : (pf ? Infinity : 1));
      });
      return { label: 'Point ratio against common opponents', values };
    }
    if (index === 4) {
      if (group.some(r => !completeScores(games.filter(g => g.away === r.slug || g.home === r.slug)))) return { unavailable: 'A score is missing from a regular-season game.' };
      group.forEach(r => values.set(r.slug, games.filter(g => g.away === r.slug || g.home === r.slug).reduce((sum, g) => sum + (g.away === r.slug ? g.result.away - g.result.home : g.result.home - g.result.away), 0)));
      return { label: 'Total regular-season net points', values };
    }
    return { unavailable: 'The supplied AUS tie-break criteria did not resolve the tie.' };
  }

  function resolveAusGroup(group, games, trace = []) {
    if (group.length < 2) return { tiers: [group], unresolved: false, trace };
    for (let index = 0; index < 5; index++) {
      const result = ausCriterion(group, index, games);
      if (result.unavailable) return { tiers: [group], unresolved: true, reason: result.unavailable, trace };
      trace.push(result.label);
      const buckets = new Map();
      group.forEach(r => { const key = String(result.values.get(r.slug)); if (!buckets.has(key)) buckets.set(key, []); buckets.get(key).push(r); });
      if (buckets.size < 2) continue;
      const ordered = [...buckets.entries()].sort((a, b) => Number(b[0]) - Number(a[0]));
      const tiers = []; let unresolved = false, reason = '';
      for (const [, bucket] of ordered) {
        if (bucket.length === 1) tiers.push(bucket);
        else {
          // AUS applies the sequence anew to teams still tied after a team is separated.
          const next = resolveAusGroup(bucket, games, trace.slice());
          tiers.push(...next.tiers);
          if (next.unresolved) { unresolved = true; reason = next.reason; }
        }
      }
      return { tiers, unresolved, reason, trace };
    }
    return { tiers: [group], unresolved: true, reason: 'The supplied AUS tie-break criteria did not resolve the tie.', trace };
  }

  function cwCriterion(group, index, games) {
    const values = new Map();
    if (index === 0 || index === 1) {
      const h2h = headToHeadGames(group, games);
      if (index === 0 && group.some(r => group.some(o => r.slug !== o.slug && !h2h.some(g => (g.away === r.slug && g.home === o.slug) || (g.home === r.slug && g.away === o.slug))))) return { unavailable: 'Not every tied team has played every other tied team.' };
      if (index === 1 && !completeScores(h2h)) return { unavailable: 'A score is missing from a head-to-head game.' };
      if (index === 0) {
        group.forEach(r => { const against = h2h.filter(g => g.away === r.slug || g.home === r.slug); values.set(r.slug, ratio(winsIn(r.slug, against), against.length)); });
        return { label: 'Head-to-head winning percentage', values };
      }
      group.forEach(r => values.set(r.slug, h2h.filter(g => g.away === r.slug || g.home === r.slug).reduce((n,g)=>n+(g.away===r.slug?g.result.away-g.result.home:g.result.home-g.result.away),0)));
      return { label: 'Head-to-head point differential', values };
    }
    const season = games.filter(g => group.some(r => r.slug === g.away || r.slug === g.home));
    if (!completeScores(season)) return { unavailable: 'A score is missing from a Canada West regular-season game.' };
    if (index === 2) {
      group.forEach(r => values.set(r.slug, season.filter(g => g.away===r.slug||g.home===r.slug).reduce((n,g)=>n+(g.away===r.slug?g.result.away-g.result.home:g.result.home-g.result.away),0)));
      return { label: 'Season point differential', values };
    }
    if (index === 3) {
      group.forEach(r => values.set(r.slug, season.filter(g => g.away===r.slug||g.home===r.slug).reduce((n,g)=>n+(g.away===r.slug?g.result.home:g.result.away),0)));
      return { label: 'Fewest points allowed over the season', values, lowerWins: true };
    }
    if (index === 4) {
      group.forEach(r => values.set(r.slug, season.filter(g => g.away===r.slug||g.home===r.slug).reduce((n,g)=>n+(g.away===r.slug?g.result.away:g.result.home),0)));
      return { label: 'Most points scored over the season', values };
    }
    return { unavailable: 'The supplied Canada West criteria did not resolve the tie; a coin toss or draw is required.' };
  }

  function resolveCwGroup(group, games, trace = []) {
    if (group.length < 2) return { tiers:[group], unresolved:false, trace };
    for (let index=0; index<5; index++) {
      const result=cwCriterion(group,index,games);
      if(result.unavailable) return {tiers:[group],unresolved:true,reason:result.unavailable,trace};
      trace.push(result.label);
      const buckets=new Map();
      group.forEach(r=>{const key=String(result.values.get(r.slug));if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(r);});
      if(buckets.size<2)continue;
      const direction=result.lowerWins?1:-1, ordered=[...buckets.entries()].sort((a,b)=>direction*(Number(a[0])-Number(b[0])));
      const tiers=[];let unresolved=false,reason='';
      for(const [,bucket] of ordered){
        if(bucket.length===1)tiers.push(bucket);
        else {const next=resolveCwGroup(bucket,games,trace.slice());tiers.push(...next.tiers);if(next.unresolved){unresolved=true;reason=next.reason;}}
      }
      return {tiers,unresolved,reason,trace};
    }
    return {tiers:[group],unresolved:true,reason:'The supplied Canada West criteria did not resolve the tie; a coin toss or draw is required.',trace};
  }

  function rseqCriterion(group, index, games, baseRows) {
    const values = new Map(), h2h = headToHeadGames(group, games);
    if (index === 0) {
      group.forEach(r => values.set(r.slug, standingValue(r)));
      return { label: 'Season winning percentage', values };
    }
    if (index === 1 || index === 2) {
      if (group.some(r => group.some(o => r.slug !== o.slug && !h2h.some(g => (g.away === r.slug && g.home === o.slug) || (g.home === r.slug && g.away === o.slug))))) return { unavailable: 'Not every tied team has played every other tied team.' };
      group.forEach(r => { const against = h2h.filter(g => g.away === r.slug || g.home === r.slug); values.set(r.slug, ratio(winsIn(r.slug, against) * (index === 2 ? 2 : 1), against.length)); });
      return { label: index === 1 ? 'Head-to-head winning percentage' : 'RSEQ points earned in head-to-head games', values };
    }
    if (index === 3 || index === 4 || index === 5) {
      const season = games.filter(g => group.some(r => r.slug === g.away || r.slug === g.home));
      const selected = index === 3 ? h2h : season;
      if (!completeScores(selected)) return { unavailable: 'A score needed for the RSEQ point quotient or points-against criteria is missing.' };
      group.forEach(r => {
        const gms = selected.filter(g => g.away === r.slug || g.home === r.slug);
        const pf = gms.reduce((n,g)=>n+(g.away===r.slug?g.result.away:g.result.home),0);
        const pa = gms.reduce((n,g)=>n+(g.away===r.slug?g.result.home:g.result.away),0);
        if (index === 3 || index === 5) values.set(r.slug, pa ? pf/pa : (pf ? Infinity : 1));
        else values.set(r.slug, pa);
      });
      if (index === 3) return { label: 'Head-to-head points quotient', values };
      if (index === 4) return { label: 'Fewest points against over the season', values, lowerWins: true, skipForCoefficient: true };
      return { label: 'Season points quotient', values };
    }
    if (index === 6 || index === 7) {
      const tied = new Set(group.map(r=>r.slug));
      const outsiders = baseRows.filter(r=>!tied.has(r.slug));
      for (let i=1;i<outsiders.length;i++) if (standingValue(outsiders[i-1])===standingValue(outsiders[i])) return { unavailable:'The order of comparison against other tied RSEQ teams is unresolved.' };
      if (!outsiders.length) return { unavailable:'No RSEQ comparison opponent is available.' };
      const opponents = outsiders.map(r=>r.slug);
      for (const opponent of opponents) {
        const comparisons = new Map();
        for (const r of group) {
          const against = gamesAgainst(r.slug,[opponent],games);
          if (index===6) comparisons.set(r.slug,ratio(winsIn(r.slug,against),against.length));
          else {
            if (!completeScores(against)) return { unavailable:'A score against a ranked comparison opponent is missing.' };
            const pf=against.reduce((n,g)=>n+(g.away===r.slug?g.result.away:g.result.home),0), pa=against.reduce((n,g)=>n+(g.away===r.slug?g.result.home:g.result.away),0);
            comparisons.set(r.slug,pa?pf/pa:(pf?Infinity:1));
          }
        }
        const distinct=new Set([...comparisons.values()].map(String));
        if(distinct.size>1) return {label:index===6?'Winning percentage vs. highest-ranked non-tied opponent':'Point quotient vs. highest-ranked non-tied opponent',values:comparisons};
      }
      return {label:index===6?'Winning percentage vs. non-tied teams':'Point quotient vs. non-tied teams',values:new Map(group.map(r=>[r.slug,0]))};
    }
    if (index === 8) return { unavailable: 'RSEQ rules call for an agreed playoff tiebreaker match when possible; this requires an external decision.' };
    if (index === 9) return { unavailable: 'RSEQ rules call for a draw when the prior criteria do not resolve the tie.' };
    return { unavailable: 'The current RSEQ criteria did not resolve the tie.' };
  }

  function resolveRseqGroup(group, games, baseRows, trace = [], startIndex = 0) {
    if (group.length < 2) return { tiers: [group], unresolved: false, trace };
    for (let index = startIndex; index < 10; index++) {
      const result = rseqCriterion(group, index, games, baseRows);
      if (result.unavailable) return { tiers: [group], unresolved: true, reason: result.unavailable, trace };
      if (result.skipForCoefficient && new Set(group.map(r=>r.gp)).size > 1) continue;
      trace.push(result.label);
      const buckets = new Map();
      group.forEach(r => { const key = String(result.values.get(r.slug)); if (!buckets.has(key)) buckets.set(key, []); buckets.get(key).push(r); });
      if (buckets.size < 2) continue;
      const direction = result.lowerWins ? 1 : -1;
      const ordered = [...buckets.entries()].sort((a,b)=>direction*(Number(a[0])-Number(b[0])));
      const tiers=[]; let unresolved=false, reason='';
      for (const [, bucket] of ordered) {
        if (bucket.length === 1) tiers.push(bucket);
        else { const next=resolveRseqGroup(bucket,games,baseRows,trace.slice()); tiers.push(...next.tiers); if(next.unresolved){unresolved=true;reason=next.reason;} }
      }
      return { tiers, unresolved, reason, trace };
    }
    return { tiers: [group], unresolved: true, reason: 'The supplied RSEQ criteria did not resolve the tie.', trace };
  }

  function rankedRows(conf) {
    const records = recordsFor(conf);
    const rows = Object.values(records).sort((a, b) => standingValue(b) - standingValue(a) || nameOf(a.slug).localeCompare(nameOf(b.slug)));
    if (conf === 'RSEQ' || conf === 'AUS' || conf === 'CW') {
      const games = scenarioGames(conf), tiers = [], unresolvedGroups = [];
      let unresolvedTies = false, tieReason = '';
      for (let i = 0; i < rows.length;) {
        let j = i + 1; while (j < rows.length && standingValue(rows[j]) === standingValue(rows[i])) j++;
        const group = rows.slice(i, j);
        if (group.length === 1) tiers.push(group);
        else {
          const result = conf === 'AUS' ? resolveAusGroup(group, games) : conf === 'CW' ? resolveCwGroup(group, games) : resolveRseqGroup(group, games, rows);
          tiers.push(...result.tiers);
          result.tiers.filter(t => t.length > 1).forEach(t => unresolvedGroups.push(t.map(r => r.slug)));
          if (result.unresolved) { unresolvedTies = true; tieReason = result.reason; }
        }
        i = j;
      }
      return { rows: tiers.flat(), unresolvedGroups, unresolvedTies, tieReason: unresolvedTies ? tieReason : (conf === 'AUS' ? 'AUS seeds use the supplied U SPORTS criteria: head-to-head win ratio, head-to-head point difference, common-opponent record and point ratio, then total regular-season net points. Multi-team ties restart the sequence for the remaining tied teams.' : conf === 'CW' ? 'Canada West standings award 2 points per win. Ties use the supplied sequence: head-to-head record and differential, season differential, points allowed, then points scored. Multi-team ties restart the sequence for the remaining tied teams.' : 'RSEQ standings award 2 points per win. Tied teams use the supplied head-to-head percentage, points against, and point-production criteria. The current RSEQ rule refers tie procedures to the latest University Sector Rules.') };
    }
    if (conf !== 'OUA') {
      const groups = [];
      for (let i = 0; i < rows.length;) {
        let j = i + 1; while (j < rows.length && standingValue(rows[j]) === standingValue(rows[i])) j++;
        if (j - i > 1) groups.push(rows.slice(i, j).map(r => r.slug));
        i = j;
      }
      return { rows, unresolvedGroups: groups, unresolvedTies: groups.length > 0, tieReason: 'Official tie-break details for this conference are not verified in this projection.' };
    }
    const games = scenarioGames(conf);
    const tiers = [];
    const unresolvedGroups = [];
    let unresolvedTies = false, tieReason = '';
    for (let i = 0; i < rows.length;) {
      let j = i + 1; while (j < rows.length && standingValue(rows[j]) === standingValue(rows[i])) j++;
      const baseGroup = rows.slice(i, j);
      if (baseGroup.length === 1) tiers.push(baseGroup);
      else {
        const result = resolveOuaGroup(baseGroup, 1, games, rows, []);
        tiers.push(...result.tiers);
        result.tiers.filter(tier => tier.length > 1).forEach(tier => unresolvedGroups.push(tier.map(r => r.slug)));
        if (result.unresolved) { unresolvedTies = true; tieReason = result.reason; }
      }
      i = j;
    }
    return { rows: tiers.flat(), unresolvedGroups, unresolvedTies, tieReason };
  }

  function remainingGames(conf) {
    const picks = picksFor(conf), date = today();
    return conferenceGames(conf).filter(g => !scoredFinal(g) && String(g.date) >= date && !['cancelled', 'canceled', 'postponed'].includes(String(g.status).toLowerCase()));
  }

  function renderGame(g, conf) {
    const p = picksFor(conf)[g.id] || {};
    const date = new Date(`${g.date}T12:00:00Z`).toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
    const score = side => `<input class="pp-score" type="number" min="0" max="100" inputmode="numeric" aria-label="${esc(nameOf(side))} score" data-score="${esc(g.id)}:${side}" value="${esc(p[side === g.away ? 'awayScore' : 'homeScore'] ?? '')}">`;
    return `<article class="pp-game" data-game="${esc(g.id)}"><div class="pp-game-meta"><span>${esc(date)}</span><span>${esc(g.time || 'Time TBA')}</span></div><div class="pp-matchup"><button type="button" class="pp-team-pick ${p.winner === g.away ? 'is-picked' : ''}" aria-pressed="${p.winner === g.away}" data-pick="${esc(g.id)}:${esc(g.away)}">${logoOf(g.away)}<span>${esc(nameOf(g.away))}</span></button><span class="pp-vs">at</span><button type="button" class="pp-team-pick ${p.winner === g.home ? 'is-picked' : ''}" aria-pressed="${p.winner === g.home}" data-pick="${esc(g.id)}:${esc(g.home)}">${logoOf(g.home)}<span>${esc(nameOf(g.home))}</span></button></div><div class="pp-scoreline"><label><span>${esc(nameOf(g.away))}</span>${score(g.away)}</label><span>Score (optional)</span><label><span>${esc(nameOf(g.home))}</span>${score(g.home)}</label></div></article>`;
  }

  function standingsMarkup(conf) {
    const cfg = conferenceFor(conf), result = rankedRows(conf), rows = result.rows;
    const standings = rows.map((r, i) => {
      const tieGroup = (result.unresolvedGroups || []).find(group => group.includes(r.slug));
      const rank = tieGroup ? `T-${rows.findIndex(row => row.slug === tieGroup[0]) + 1}` : String(i + 1);
      return { ...r, rank, tie: !!tieGroup, tieGroup };
    });
    const tieAcrossCut = standings.some((r, i) => i < cfg.spots && r.tieGroup && standings[i + 1]?.tieGroup === r.tieGroup && i + 1 >= cfg.spots);
    const body = standings.map((r, i) => {
      const position = r.rank;
      const crossesCut = tieAcrossCut && !!r.tieGroup && r.tieGroup === standings[cfg.spots - 1]?.tieGroup;
      const status = crossesCut ? 'TIE' : (i < cfg.spots ? 'IN' : 'OUT');
      const statusClass = status === 'IN' ? 'pp-in' : status === 'OUT' ? 'pp-out' : 'pp-tie';
      return `<tr><td data-label="Seed"><span class="pp-rank">${position}</span></td><td data-label="Team"><div class="pp-table-team">${logoOf(r.slug)}<b>${esc(nameOf(r.slug))}</b></div></td><td data-label="W-L">${r.w}-${r.l}</td><td data-label="PTS">${conf === 'RSEQ' || conf === 'CW' ? r.w * 2 : r.w}</td><td data-label="GP">${r.gp}</td><td data-label="PF">${r.pf}</td><td data-label="PA">${r.pa}</td><td data-label="Field"><span class="pp-status ${statusClass}">${status}</span></td></tr>`;
    }).join('');
    const note = conf === 'OUA'
      ? `<p class="pp-rule-note">OUA seeds use the published 2025 football operations tie-break sequence. Point-difference criteria cap each game at ±25. If the next applicable step needs a score that is missing, or the procedure ends in a draw, the tie stays unresolved. <a href="${OUA_RULES_URL}" target="_blank" rel="noopener">Official OUA rules ↗</a></p>`
      : conf === 'AUS'
        ? `<p class="pp-rule-note">AUS seeds use the supplied U SPORTS sequence: head-to-head win ratio, head-to-head point difference, common-opponent record and point ratio, then total net points. When a team separates from a multi-team tie, the sequence restarts for the remaining tied teams. Missing scores leave the tie unresolved.</p>`
      : conf === 'CW'
        ? `<p class="pp-rule-note">Canada West awards 2 points per win. Seeds use the supplied sequence: head-to-head winning percentage and point differential, season point differential, points allowed, then points scored. Multi-team ties restart the sequence for remaining tied teams; a final statistical tie requires a draw. Missing scores leave the tie unresolved.</p>`
      : conf === 'RSEQ'
        ? `<p class="pp-rule-note">RSEQ awards 2 points per win. The 2026–27 University Sector rules use season winning percentage, head-to-head percentage and points, point quotients, season points against, then comparison against ranked teams. Multi-team ties restart at step one. Scores needed for a step must be available; external playoff-tiebreaker agreements or a draw remain unresolved here. <a href="${RSEQ_RULES_URL}" target="_blank" rel="noopener">Official 2026–27 RSEQ rules ↗</a></p>`
      : `<p class="pp-rule-note">${esc(result.tieReason || `Playoff field: ${cfg.spots}. Official tie-break details for ${cfg.name} are not verified here, so tied records share a seed until the conference rule can be applied.`)}</p>`;
    return `<section class="pp-panel pp-standing-panel"><div class="pp-panel-head"><div><div class="pp-eyebrow">LIVE SCENARIO</div><h2>${esc(cfg.name)} standings</h2></div><span class="pp-count">Top ${cfg.spots} qualify</span></div><div class="pp-table-wrap"><table class="pp-table"><thead><tr><th>Seed</th><th>Team</th><th>W-L</th><th>PTS</th><th>GP</th><th>PF</th><th>PA</th><th>Field</th></tr></thead><tbody>${body || `<tr><td colspan="8">Standings are not available.</td></tr>`}</tbody></table></div>${note}</section>`;
  }

  function styles() {
    if (document.getElementById('pp-styles')) return;
    const style = document.createElement('style'); style.id = 'pp-styles';
    style.textContent = `
      .pp-new{display:inline-flex;align-items:center;margin-left:5px;padding:3px 6px;border-radius:999px;background:#df3445;color:#fff;font-size:9px;font-weight:1000;letter-spacing:.08em;line-height:1}
      .pp-wrap{max-width:1280px;margin:0 auto;padding:22px 18px 60px;color:var(--text,#f4f7fa)}.pp-hero{padding:28px;border:1px solid var(--line,#263241);border-radius:22px;background:radial-gradient(circle at 85% 10%,rgba(242,201,76,.11),transparent 34%),linear-gradient(135deg,#111a25,#080d13);margin-bottom:16px}.pp-eyebrow{font-size:10px;font-weight:950;letter-spacing:.13em;text-transform:uppercase;color:var(--gold,#f2c94c)}.pp-hero h1{font-size:clamp(28px,4vw,44px);margin:8px 0}.pp-hero p{max-width:850px;color:#aebdcb;line-height:1.55;margin:0}.pp-confs{display:flex;gap:8px;overflow:auto;margin:16px 0}.pp-confs button{white-space:nowrap;border:1px solid var(--line,#263241);background:#0b1118;color:#d6e0eb;border-radius:999px;padding:9px 14px;font-weight:900;cursor:pointer}.pp-confs button.active{background:#f2c94c;color:#10151b;border-color:#f2c94c}.pp-layout{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(360px,.95fr);gap:16px;align-items:start}.pp-panel{border:1px solid var(--line,#263241);background:#0a1017;border-radius:20px;padding:16px}.pp-panel-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:13px}.pp-panel-head h2{margin:4px 0 0;font-size:21px}.pp-count{font-size:10px;color:#aebdcb;border:1px solid #344455;border-radius:999px;padding:6px 9px;font-weight:850}.pp-game-list{display:grid;gap:10px}.pp-game{border:1px solid #223142;background:#0d151e;border-radius:15px;padding:12px}.pp-game-meta{display:flex;justify-content:space-between;color:#91a0b2;font-size:10px;margin-bottom:9px}.pp-matchup{display:grid;grid-template-columns:1fr 22px 1fr;gap:5px;align-items:center}.pp-team-pick{display:flex;align-items:center;gap:8px;min-width:0;border:1px solid #26384a;background:#101b27;color:#f4f7fa;border-radius:12px;padding:9px 8px;text-align:left;font-weight:900;cursor:pointer}.pp-team-pick span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.pp-team-pick.is-picked{border-color:#f2c94c;background:rgba(242,201,76,.12);box-shadow:inset 0 0 0 1px #f2c94c}.pp-logo{width:30px;height:30px;object-fit:contain;background:#fff;border-radius:8px;padding:3px;flex:0 0 auto}.pp-vs{text-align:center;color:#78889a;font-size:10px}.pp-scoreline{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:8px;margin-top:9px;color:#8d9bad;font-size:9px}.pp-scoreline label{display:flex;align-items:center;gap:7px;min-width:0}.pp-scoreline label:last-child{justify-content:flex-end}.pp-scoreline label:first-child{flex-direction:row-reverse;justify-content:flex-end}.pp-score{width:50px;border:1px solid #334355;border-radius:8px;background:#070c11;color:#fff;padding:6px;text-align:center;font:inherit;font-size:12px}.pp-empty{border:1px dashed #344455;border-radius:14px;padding:24px;color:#9aa9b9;text-align:center}.pp-tools{display:flex;justify-content:space-between;align-items:center;gap:8px;margin:0 0 10px}.pp-tools button{border:1px solid #35465a;background:#111b26;color:#dbe4ec;border-radius:9px;padding:7px 10px;font-size:10px;font-weight:850;cursor:pointer}.pp-table-wrap{overflow:auto}.pp-table{width:100%;border-collapse:collapse;min-width:430px}.pp-table th,.pp-table td{padding:10px 7px;border-top:1px solid rgba(255,255,255,.07);font-size:11px;text-align:left}.pp-table th{color:#92a1b1;text-transform:uppercase;font-size:9px;letter-spacing:.08em}.pp-table td:nth-child(n+3),.pp-table th:nth-child(n+3){text-align:center}.pp-table-team{display:flex;align-items:center;gap:7px;white-space:nowrap}.pp-table-team .pp-logo{width:24px;height:24px}.pp-rank{font-weight:950;color:#f2c94c}.pp-status{display:inline-flex;min-width:30px;justify-content:center;border-radius:999px;padding:4px 6px;font-size:8px;font-weight:1000}.pp-in{color:#71e0ab;background:rgba(50,213,131,.12)}.pp-out{color:#ff98a0;background:rgba(255,91,101,.12)}.pp-tie{color:#f2c94c;background:rgba(242,201,76,.12)}.pp-rule-note{border:1px solid #28394b;background:#101924;color:#9eafbf;border-radius:12px;padding:11px;margin:12px 0 0;font-size:10px;line-height:1.5}.pp-rule-note a{color:#f2c94c;font-weight:900}.pp-disclaimer{font-size:10px;line-height:1.5;color:#8f9eae;margin:10px 2px 0}.pp-panel .pp-error{color:#ff9aa3;font-size:10px;margin:8px 2px 0}
      @media(max-width:760px){
        .topbar{height:auto!important;min-height:0!important;display:flex!important;flex-direction:column!important;align-items:stretch!important;justify-content:flex-start!important;gap:6px!important;padding:8px 0 7px!important}
        .topbar .brand{align-self:flex-start!important;flex:0 0 auto!important}
        .topbar .nav{display:flex!important;width:100%!important;min-width:0!important;max-width:100%!important;flex:0 0 auto!important;flex-wrap:nowrap!important;justify-content:flex-start!important;gap:7px!important;overflow-x:auto!important;overflow-y:hidden!important;overscroll-behavior-x:contain;-webkit-overflow-scrolling:touch!important;touch-action:pan-x!important;scrollbar-width:thin!important;padding:2px 12px 7px!important;margin:0!important}
        .topbar .nav button,.topbar .nav button:nth-child(n){display:inline-flex!important;flex:0 0 auto!important;width:auto!important;min-width:max-content!important;white-space:nowrap!important;padding:9px 12px!important;font-size:12px!important;line-height:1!important;touch-action:manipulation!important}
      }
            .pp-wrap,.pp-layout,.pp-panel,.pp-game-list,.pp-game,.pp-standings{min-width:0;max-width:100%}
      .pp-logo{max-width:100%;object-fit:contain}
      @media(max-width:900px){.pp-layout{grid-template-columns:minmax(0,1fr)}.pp-standing-panel{order:-1}}
      @media(max-width:520px){
        .pp-wrap{width:100%;max-width:100%;padding:14px 10px 40px;overflow-x:clip}
        .pp-hero{padding:20px}.pp-hero h1{font-size:clamp(27px,8vw,36px)}
        .pp-panel{width:100%;padding:12px}.pp-panel-head{align-items:flex-start;flex-wrap:wrap}
        .pp-team-pick{font-size:11px;padding:7px 5px}.pp-logo{width:24px;height:24px}
        .pp-matchup{grid-template-columns:minmax(0,1fr) 18px minmax(0,1fr)}
        .pp-scoreline{grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);gap:4px;font-size:8px}
        .pp-scoreline label{min-width:0;overflow:hidden;gap:4px}
        .pp-scoreline label>span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .pp-scoreline label:first-child{flex-direction:row-reverse}
        .pp-score{width:40px;min-width:40px;padding:6px 2px}
        .pp-matchup{grid-template-columns:minmax(0,1fr)}
        .pp-team-pick{min-height:44px;font-size:12px}.pp-team-pick span{white-space:normal;overflow-wrap:anywhere}.pp-vs{padding:2px}
        .pp-table-wrap{overflow:visible}.pp-table{min-width:0;display:block}.pp-table thead{position:absolute;width:1px;height:1px;padding:0;overflow:hidden;clip-path:inset(50%)}
        .pp-table tbody{display:grid;gap:10px}.pp-table tr{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));border:1px solid #26384a;border-radius:12px;padding:8px}
        .pp-table td{display:flex;flex-direction:column;gap:5px;text-align:left!important;padding:8px 5px;border:0;min-width:0}
        .pp-table td::before{content:attr(data-label);color:#92a1b1;font-size:9px;font-weight:800}
        .pp-table td:nth-child(2){grid-column:span 2}.pp-table-team{white-space:normal;overflow-wrap:anywhere}.pp-table td[colspan]{grid-column:1/-1}
        .pp-score{min-height:44px}
        .pp-scoreline{grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px;font-size:10px}
        .pp-scoreline>span{grid-column:1/-1;grid-row:1;text-align:center}
        .pp-scoreline label,.pp-scoreline label:first-child{flex-direction:column;align-items:flex-start;overflow:visible;gap:5px}
        .pp-scoreline label:last-child{align-items:flex-end}
        .pp-scoreline label>span{white-space:normal;overflow:visible;overflow-wrap:anywhere}
      }
    `;
    document.head.appendChild(style);
  }

  function page(conf = 'OUA') {
    conf = conferenceFor(conf).id;
    styles();
    const cfg = conferenceFor(conf), games = remainingGames(conf), picks = picksFor(conf);
    const pickedCount = Object.values(picks).filter(p => p?.winner).length;
    const gameCards = games.map(g => renderGame(g, conf)).join('') || `<div class="pp-empty">No remaining regular-season games are listed for ${esc(cfg.name)}.</div>`;
    const app = document.getElementById('app');
    app.innerHTML = shell(`<main class="pp-wrap"><section class="pp-hero"><div class="pp-eyebrow">2026 PLAYOFF PROJECTIONS</div><h1>Build your playoff picture.</h1><p>Pick the winner of each remaining game and add scores when you want to model points for and against. Actual results stay locked; scenario picks are saved on this device only.</p></section><nav class="pp-confs" aria-label="Select conference">${CONFERENCES.map(c => `<button type="button" class="${c.id === conf ? 'active' : ''}" aria-pressed="${c.id === conf}" data-conference="${c.id}">${esc(c.name)}</button>`).join('')}</nav><div class="pp-layout"><section class="pp-panel"><div class="pp-panel-head"><div><div class="pp-eyebrow">REMAINING SCHEDULE</div><h2>${esc(cfg.name)} games</h2></div><span class="pp-count">${games.length} games left</span></div><div class="pp-tools"><span class="pp-count">${pickedCount} picks</span><button type="button" data-reset>Reset picks</button></div><div class="pp-game-list">${gameCards}</div><p class="pp-disclaimer">Winner-only picks update W-L. Points for/against change only when both scores are entered. Scores are hypothetical and do not change official results.</p></section><div class="pp-standings">${standingsMarkup(conf)}</div></div></main>`, 'projections');
    if (location.hash !== `#projections=${conf}`) history.replaceState(null, '', `#projections=${conf}`);
    if (!bound) {
      app.addEventListener('click', onClick);
      app.addEventListener('input', onInput);
      bound = true;
    }
  }

  function refreshStandings(conf) {
    const slot = document.querySelector('.pp-standings');
    if (slot) slot.innerHTML = standingsMarkup(conf);
  }

  function onClick(event) {
    const confButton = event.target.closest('[data-conference]');
    if (confButton) { page(confButton.dataset.conference); return; }
    if (event.target.closest('[data-reset]')) {
      const conf = new URLSearchParams(location.hash.split('?')[1] || '').get('conf') || location.hash.split('=')[1] || 'OUA';
      picksByConference[conf] = {}; savePicks(); page(conf); return;
    }
    const pickButton = event.target.closest('[data-pick]');
    if (!pickButton) return;
    const [gameId, winner] = pickButton.dataset.pick.split(':');
    const conf = location.hash.split('=')[1] || 'OUA';
    const card = pickButton.closest('[data-game]');
    const scoreInputs = [...card.querySelectorAll('[data-score]')];
    const game = conferenceGames(conf).find(g => g.id === gameId);
    let awayScore = '', homeScore = '';
    if (scoreInputs.length === 2) {
      const values = Object.fromEntries(scoreInputs.map(input => [input.dataset.score.split(':')[1], input.value]));
      awayScore = values[game.away] ?? ''; homeScore = values[game.home] ?? '';
      if (validScore(awayScore) && validScore(homeScore) && ((winner === game.away && Number(awayScore) < Number(homeScore)) || (winner === game.home && Number(homeScore) < Number(awayScore)))) awayScore = homeScore = '';
    }
    picksFor(conf)[gameId] = { winner, awayScore, homeScore };
    savePicks(); page(conf);
  }

  function onInput(event) {
    const input = event.target.closest('[data-score]');
    if (!input) return;
    const [gameId, side] = input.dataset.score.split(':');
    const conf = location.hash.split('=')[1] || 'OUA';
    const game = conferenceGames(conf).find(g => g.id === gameId);
    if (!game) return;
    const card = input.closest('[data-game]');
    const values = [...card.querySelectorAll('[data-score]')].map(el => ({ slug: el.dataset.score.split(':')[1], value: el.value }));
    const away = values.find(x => x.slug === game.away)?.value ?? '', home = values.find(x => x.slug === game.home)?.value ?? '';
    const pick = picksFor(conf)[gameId] || {};
    pick.awayScore = away; pick.homeScore = home;
    if (validScore(away) && validScore(home) && Number(away) !== Number(home)) pick.winner = Number(away) > Number(home) ? game.away : game.home;
    picksFor(conf)[gameId] = pick; savePicks();
    card.querySelectorAll('[data-pick]').forEach(button => {
      const slug = button.dataset.pick.split(':')[1], selected = pick.winner === slug;
      button.classList.toggle('is-picked', selected); button.setAttribute('aria-pressed', String(selected));
    });
    refreshStandings(conf);
  }

  window.playoffProjectionsPage = page;
  window.PlayoffProjectionCore = Object.freeze({ conferenceGames, recordsFor, rankedRows, remainingGames });
  const oldShell = window.shell;
  window.shell = function (content, active = 'schedule') {
    let html = oldShell(content, active);
    const button = `<button class="${active === 'projections' ? 'active' : ''}" onclick="playoffProjectionsPage()">Playoff Projections <span class="pp-new">NEW</span></button>`;
    if (html.includes('</div><details class="clean-more"')) return html.replace('</div><details class="clean-more"', button + '</div><details class="clean-more"');
    if (html.includes('<details class="clean-more"')) return html.replace('<details class="clean-more"', button + '<details class="clean-more"');
    return html.replace('</nav>', button + '</nav>');
  };
  const oldRoute = window.route;
  window.route = function () {
    const hash = location.hash.slice(1);
    if (hash.startsWith('projections')) return page(hash.split('=')[1] || 'OUA');
    return oldRoute();
  };
  window.addEventListener('hashchange', () => {
    if (location.hash.slice(1).startsWith('projections')) page(location.hash.slice(1).split('=')[1] || 'OUA');
  });
  function renderInitialProjection() {
    if (location.hash.slice(1).startsWith('projections')) page(location.hash.slice(1).split('=')[1] || 'OUA');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', renderInitialProjection, { once: true });
  else renderInitialProjection();
  window.addEventListener('load', () => setTimeout(renderInitialProjection, 0), { once: true });
  setTimeout(renderInitialProjection, 150);
})();
