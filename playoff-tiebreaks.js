/* Pure conference ranking engine. Rule sources and clauses: docs/playoff-tiebreaks.md. */
(function (root) {
  'use strict';
  const value = (n, d = 1) => ({ n, d });
  const compare = (a, b) => {
    if (BigInt(a.d) === 0n || BigInt(b.d) === 0n) return BigInt(a.d) === BigInt(b.d) ? 0 : (BigInt(a.d) === 0n ? 1 : -1);
    const delta = BigInt(a.n) * BigInt(b.d) - BigInt(b.n) * BigInt(a.d);
    return delta > 0n ? 1 : delta < 0n ? -1 : 0;
  };
  const display = v => BigInt(v.d) === 0n ? '∞' : BigInt(v.d) === 1n ? String(v.n) : `${v.n}/${v.d}`;
  const played = (slug, games) => games.filter(g => g.away === slug || g.home === slug);
  const between = (group, games) => { const ids = new Set(group.map(r => r.slug)); return games.filter(g => ids.has(g.away) && ids.has(g.home)); };
  const winner = g => g.scenario ? g.pick?.winner : g.result.away > g.result.home ? g.away : g.home;
  const wins = (slug, games) => played(slug, games).filter(g => winner(g) === slug).length;
  const points = (slug, games, against = false) => played(slug, games).reduce((sum, g) => sum + BigInt(g.away === slug ? g.result[against ? 'home' : 'away'] : g.result[against ? 'away' : 'home']), 0n);
  const differential = (slug, games, cap) => played(slug, games).reduce((sum, g) => {
    const diff = g.away === slug ? BigInt(g.result.away) - BigInt(g.result.home) : BigInt(g.result.home) - BigInt(g.result.away);
    const limit = BigInt(cap);
    return sum + (cap ? (diff > limit ? limit : diff < -limit ? -limit : diff) : diff);
  }, 0n);
  const against = (slug, opponents, games) => { const ids = new Set(opponents); return played(slug, games).filter(g => ids.has(g.away === slug ? g.home : g.away)); };
  const allMet = (group, games) => group.every(r => group.every(o => r.slug === o.slug || games.some(g => (g.away === r.slug && g.home === o.slug) || (g.home === r.slug && g.away === o.slug))));
  const keyFor = group => group.map(r => r.slug).sort().join('|');

  function rank(conf, records, games, drawOrders = {}) {
    const rows = Object.values(records);
    const coefficient = conf === 'RSEQ' && new Set(rows.map(r => r.gp)).size > 1;
    const primary = r => coefficient ? value(r.w, r.gp || 1) : value(r.w * 2);
    const decisions = [], issues = [];
    function partition(group, values, lower = false) {
      const sorted = group.slice().sort((a, b) => (lower ? 1 : -1) * compare(values.get(a.slug), values.get(b.slug)) || a.slug.localeCompare(b.slug));
      const tiers = [];
      sorted.forEach(r => { const tier = tiers.at(-1); if (tier && compare(values.get(tier[0].slug), values.get(r.slug)) === 0) tier.push(r); else tiers.push([r]); });
      return tiers;
    }
    const initial = partition(rows, new Map(rows.map(r => [r.slug, primary(r)])));
    function measure(group, label, selected, kind, cap = 0) {
      selected = selected.filter(g => group.some(r => g.away === r.slug || g.home === r.slug));
      const byTeam = new Map(group.map(r => [r.slug, played(r.slug, selected)]));
      if (group.some(r => byTeam.get(r.slug).length === 0)) return { label, skip: true };
      const scoring = !['record', 'winLoss', 'points'].includes(kind);
      const missing = scoring ? selected.filter(g => !g.result).map(g => g.id) : [];
      if (missing.length) return { label, missing: [...new Set(missing)] };
      const values = new Map();
      for (const r of group) {
        const gms = byTeam.get(r.slug), w = wins(r.slug, gms);
        if (kind === 'record') values.set(r.slug, value(w, gms.length));
        if (kind === 'winLoss') values.set(r.slug, value(w, gms.length - w));
        if (kind === 'points') values.set(r.slug, value(w * 2));
        if (kind === 'diff') values.set(r.slug, value(differential(r.slug, gms, cap)));
        if (kind === 'allowed') values.set(r.slug, value(points(r.slug, gms, true)));
        if (kind === 'quotient') values.set(r.slug, value(points(r.slug, gms), points(r.slug, gms, true)));
      }
      return { label, values, lower: kind === 'allowed' };
    }
    function orderedComparison(group, context, ancestors, label, kind, cap) {
      const tied = new Set(group.map(r => r.slug));
      for (const tier of context) {
        const outside = tier.filter(r => !tied.has(r.slug));
        if (!outside.length) continue;
        // An unresolved outside tier cannot affect this step if every comparison is equal.
        const results = outside.map(op => ({ op, result: measure(group, `${label}: ${op.slug}`, games.filter(g => !(conf === 'RSEQ' && kind === 'quotient' && (g.forfeit || g.forfeited)) && group.some(r => (g.away === r.slug && g.home === op.slug) || (g.home === r.slug && g.away === op.slug))), kind, cap) }));
        if (results.every(({ result }) => result.skip || (result.values && partition(group, result.values, result.lower).length === 1))) continue;
        let ordered = outside;
        if (outside.length > 1) {
          const resolved = resolve(outside, context, ancestors);
          if (resolved.issues.length) return { label, dependency: resolved.issues };
          ordered = resolved.tiers.flat();
        }
        for (const op of ordered) {
          const result = results.find(x => x.op.slug === op.slug).result;
          if (result.skip) continue;
          if (result.missing) return result;
          if (partition(group, result.values, result.lower).length > 1) return result;
        }
      }
      return { label, skip: true };
    }
    function criterion(group, step, context, ancestors) {
      const h2h = between(group, games);
      const statistical = conf === 'RSEQ' ? games.filter(g => !g.forfeit && !g.forfeited) : games;
      const statsH2h = between(group, statistical);
      if (conf === 'OUA') {
        if (step === 0) return { label: 'Most league wins', skip: new Set(group.map(r => r.gp)).size > 1, values: new Map(group.map(r => [r.slug, value(r.w)])) };
        if (step === 1 || step === 2) {
          if (!allMet(group, h2h)) return { label: 'Head-to-head (not all tied teams met)', skip: true };
          return measure(group, step === 1 ? 'Head-to-head record' : 'Head-to-head point difference (±25 per game)', h2h, step === 1 ? 'record' : 'diff', 25);
        }
        if (step === 3) return { label: 'Record in OUA games', values: new Map(group.map(r => [r.slug, value(r.w, r.gp || 1)])) };
        const common = rows.filter(op => !group.some(r => r.slug === op.slug) && group.every(r => against(r.slug, [op.slug], games).length)).map(r => r.slug);
        const commonGames = games.filter(g => group.some(r => (g.away === r.slug && common.includes(g.home)) || (g.home === r.slug && common.includes(g.away))));
        if (step === 4 || step === 7) return measure(group, step === 4 ? 'Record against common opponents' : 'Point difference against common opponents (±25 per game)', commonGames, step === 4 ? 'record' : 'diff', 25);
        if (step === 5) return orderedComparison(group, context, ancestors, 'Record against ranked OUA opponents', 'record', 0);
        if (step === 6 || step === 9) return measure(group, step === 6 ? 'OUA point difference (±25 per game)' : 'Total point difference (±25 per game)', games, 'diff', 25);
        if (step === 8) return orderedComparison(group, context, ancestors, 'Point difference against ranked OUA opponents (±25 per game)', 'diff', 25);
        return { label: group.length === 2 ? 'OUA coin toss' : 'OUA drawing of lots', terminal: true };
      }
      if (conf === 'CW') {
        if (step === 0) return measure(group, 'Head-to-head winning percentage', h2h, 'record');
        if (step === 1) return measure(group, 'Head-to-head point difference', h2h, 'diff');
        if (step === 2) return measure(group, 'Season point difference', games, 'diff');
        return { label: group.length === 2 ? 'Canada West coin toss' : 'Canada West conference decision for an exact multi-team tie', terminal: true };
      }
      if (conf === 'AUS') {
        if (step === 0) return measure(group, 'Head-to-head win/loss ratio', h2h, 'winLoss');
        if (step === 1) return measure(group, 'Head-to-head points for/against ratio', h2h, 'quotient');
        if (step === 2) return measure(group, 'Season points for/against ratio', games, 'quotient');
        return { label: 'AUS Sport Chair coin toss', terminal: true };
      }
      if (step === 0) return { label: 'Season winning percentage', values: new Map(group.map(r => [r.slug, value(r.w, r.gp || 1)])) };
      if (step === 1) return measure(group, 'Head-to-head winning percentage', h2h, 'record');
      if (step === 2) return measure(group, 'Head-to-head standings points', h2h, 'points');
      if (step === 3) return measure(group, 'Head-to-head points for/against ratio', statsH2h, 'quotient');
      if (step === 4) return coefficient ? { label: 'Season points against (coefficient standings: skipped)', skip: true } : measure(group, 'Fewest season points against', statistical, 'allowed');
      if (step === 5) return measure(group, 'Season points for/against ratio', statistical, 'quotient');
      if (step === 6) return orderedComparison(group, context, ancestors, 'Winning percentage against ranked RSEQ opponents', 'record', 0);
      if (step === 7) return orderedComparison(group, context, ancestors, 'Points ratio against ranked RSEQ opponents', 'quotient', 0);
      return { label: coefficient || group.length > 2 ? 'RSEQ drawing of lots' : 'RSEQ tiebreak match (if agreed) or drawing of lots', terminal: true };
    }
    function resolve(group, context, ancestors = new Set()) {
      if (group.length < 2) return { tiers: [group], decisions: [], issues: [] };
      const key = keyFor(group);
      if (ancestors.has(key)) return { tiers: [group], decisions: [], issues: [{ teams: group.map(r => r.slug), type: 'comparison', label: 'Ranked opponent comparison', reason: 'These tied groups depend on each other’s ranking.' }] };
      const nextAncestors = new Set(ancestors); nextAncestors.add(key);
      const trace = [];
      for (let step = 0; step <= 10; step++) {
        const result = criterion(group, step, context, nextAncestors);
        if (result.skip) { trace.push({ label: result.label, skipped: true }); continue; }
        if (result.dependency) return { tiers: [group], decisions: [], issues: result.dependency };
        if (result.missing) return { tiers: [group], decisions: [], issues: [{ teams: group.map(r => r.slug), type: 'scores', label: result.label, games: result.missing, trace }] };
        if (result.terminal) {
          const order = drawOrders[key];
          if (Array.isArray(order) && order.length === group.length && new Set(order).size === group.length && group.every(r => order.includes(r.slug))) {
            return { tiers: order.map(slug => [group.find(r => r.slug === slug)]), issues: [], decisions: [{ teams: group.map(r => r.slug), label: 'Scenario outcome: ' + result.label, order, simulated: true, trace }] };
          }
          return { tiers: [group], decisions: [], issues: [{ teams: group.map(r => r.slug), type: 'draw', label: result.label, trace }] };
        }
        const tiers = partition(group, result.values, result.lower);
        // CW and AUS select the highest team, then restart for the remaining teams.
        if ((conf === 'CW' || conf === 'AUS') && group.length > 2 && tiers.length > 2) tiers.splice(1, tiers.length - 1, tiers.slice(1).flat());
        trace.push({ label: result.label, values: Object.fromEntries([...result.values].map(([slug, v]) => [slug, display(v)])) });
        if (tiers.length === 1) continue;
        const decision = { teams: group.map(r => r.slug), label: result.label, values: trace.at(-1).values, order: tiers.flat().map(r => r.slug), trace };
        const nextContext = context.flatMap(tier => {
          if (!tier.some(r => group.some(g => g.slug === r.slug))) return [tier];
          const before = tier.filter(r => !group.some(g => g.slug === r.slug));
          return before.length ? [before, ...tiers] : tiers;
        });
        const results = tiers.map(tier => resolve(tier, nextContext, nextAncestors));
        return { tiers: results.flatMap(r => r.tiers), decisions: [decision, ...results.flatMap(r => r.decisions)], issues: results.flatMap(r => r.issues) };
      }
      throw new Error('Tie-break sequence did not terminate');
    }
    // Resolve other standings ties before criteria that depend on ranked opponents.
    let context = initial, resolved;
    for (let pass = 0; pass <= rows.length; pass++) {
      resolved = initial.map(group => resolve(group, context));
      const next = resolved.flatMap(r => r.tiers);
      if (next.map(keyFor).join(';') === context.map(keyFor).join(';')) break;
      context = next;
    }
    resolved.forEach(r => { decisions.push(...r.decisions); issues.push(...r.issues); });
    const tiers = resolved.flatMap(r => r.tiers);
    const uniqueIssues = [...new Map(issues.map(issue => [issue.type + ':' + issue.teams.slice().sort().join('|') + ':' + issue.label, issue])).values()];
    return { rows: tiers.flat(), tiers, unresolvedGroups: tiers.filter(t => t.length > 1).map(t => t.map(r => r.slug)), unresolvedTies: tiers.some(t => t.length > 1), decisions, issues: uniqueIssues, coefficient };
  }
  const api = Object.freeze({ rank, compare, keyFor });
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.FootballTiebreaks = api;
})(typeof window === 'undefined' ? globalThis : window);
