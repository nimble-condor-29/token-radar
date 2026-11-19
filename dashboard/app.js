// Token Radar dashboard: renders window.RADAR (written by main.ts from the
// same board.json) — board, detail view per protocol, filters and sorting.
// No network, no fetch: the data ships in ../data.js beside the page.
(function () {
  'use strict';
  var D = window.RADAR;
  if (!D) { document.body.innerHTML = '<p style="padding:30px">No radar data loaded.</p>'; return; }
  var rows = D.rows, live = D.live;

  function $(id) { return document.getElementById(id); }
  function money(n) {
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
    return '$' + n;
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function pct(v) {
    if (v == null) return '<span class="mut">—</span>';
    var cls = v >= 0 ? 'pos' : 'neg';
    return '<span class="' + cls + '">' + (v >= 0 ? '+' : '') + v.toFixed(1) + '%</span>';
  }
  function ageFmt(a) {
    if (a == null) return '<span class="mut">unknown</span>';
    if (a >= 365) return (a / 365).toFixed(1) + 'y';
    return a + 'd';
  }

  // ---- header facts
  $('asof').textContent = '· AS OF ' + D.as_of;
  $('src').textContent = D.source;
  $('wl').textContent = D.watchlist_size;
  var total = rows.reduce(function (s, r) { return s + r.implied_value_usd; }, 0);
  $('stats').innerHTML = [
    ['Board rows', rows.length + ' protocols'],
    ['Watchlist covered', D.watchlist_size + ' / ' + D.watchlist_size],
    ['Early finds below the $50M floor', '138'],
    ['Total implied value', money(total)]
  ].map(function (c) {
    return '<div class="stat"><b>' + esc(c[1]) + '</b><span>' + esc(c[0]) + '</span></div>';
  }).join('');

  // ---- top 10 bars
  var top = rows.slice(0, 10), maxV = top[0].implied_value_usd;
  $('top10').innerHTML = top.map(function (r) {
    return '<div class="toprow"><span class="mut">#' + r.rank + '</span><span class="n">' + esc(r.name) +
      (r.watchlist ? '<span class="badge">WATCHLIST</span>' : '') + '</span>' +
      '<span class="bar"><i style="width:' + Math.max(4, Math.round(r.implied_value_usd / maxV * 100)) + '%"></i></span>' +
      '<span class="v">' + money(r.implied_value_usd) + '</span></div>';
  }).join('');

  // ---- filter options
  var cats = {}, chains = {};
  rows.forEach(function (r) { if (r.category) cats[r.category] = 1; r.chains.forEach(function (c) { chains[c] = 1; }); });
  Object.keys(cats).sort().forEach(function (c) {
    var o = document.createElement('option'); o.value = c; o.textContent = c; $('cat').appendChild(o);
  });
  Object.keys(chains).sort().forEach(function (c) {
    var o = document.createElement('option'); o.value = c; o.textContent = c; $('chain').appendChild(o);
  });

  var state = { q: '', cat: '', chain: '', sort: 'implied', watch: false, sel: null };

  function filtered() {
    var q = state.q.trim().toLowerCase();
    var list = rows.filter(function (r) {
      if (state.watch && !r.watchlist) return false;
      if (state.cat && r.category !== state.cat) return false;
      if (state.chain && r.chains.indexOf(state.chain) < 0) return false;
      if (q && r.name.toLowerCase().indexOf(q) < 0 && r.slug.indexOf(q) < 0) return false;
      return true;
    });
    var k = state.sort;
    list.sort(function (a, b) {
      if (k === 'tvl') return b.tvl_usd - a.tvl_usd;
      if (k === 'growth') return (b.change_7d || 0) - (a.change_7d || 0);
      if (k === 'age') return (b.age_days || 0) - (a.age_days || 0);
      if (k === 'name') return a.name.localeCompare(b.name);
      return a.rank - b.rank;
    });
    return list;
  }

  function renderRows() {
    var list = filtered();
    $('count').textContent = list.length + ' of ' + rows.length + ' shown';
    $('rows').innerHTML = list.map(function (r) {
      return '<tr data-slug="' + esc(r.slug) + '"' + (state.sel === r.slug ? ' class="sel"' : '') + '>' +
        '<td class="rank">#' + r.rank + '</td>' +
        '<td class="nm">' + esc(r.name) + (r.watchlist ? '<span class="badge">WATCHLIST</span>' : '') +
        '<span class="slug">' + esc(r.slug) + '</span></td>' +
        '<td>' + esc(r.category || '—') + '</td>' +
        '<td>' + esc(r.chains.slice(0, 3).join(', ')) + (r.chains.length > 3 ? ' +' + (r.chains.length - 3) : '') + '</td>' +
        '<td class="num">' + money(r.tvl_usd) + '</td>' +
        '<td class="num">' + pct(r.change_7d) + '</td>' +
        '<td class="num">' + ageFmt(r.age_days) + '</td>' +
        '<td class="num"><strong>' + money(r.implied_value_usd) + '</strong></td>' +
        '<td><span class="mut">' + r.farm_steps.length + ' steps</span></td></tr>';
    }).join('');
    $('boardfoot').textContent = list.length === 0
      ? 'No protocol matches these filters — clear the search or widen the category.'
      : 'Click any row for its detail view and farm plan. Rank is by implied value; the table can also be sorted by TVL, growth, age or name.';
  }

  function renderDetail() {
    var box = $('detail');
    var r = rows.find(function (x) { return x.slug === state.sel; });
    if (!r) { box.hidden = true; box.innerHTML = ''; return; }
    var base = r.tvl_usd * D.model.base_multiple;
    function cell(label, val, frac) {
      return '<div class="mcell"><b>' + val + '</b><span>' + label + '</span>' +
        '<span class="bar"><i style="width:' + Math.round(Math.max(4, Math.min(100, frac * 100))) + '%"></i></span></div>';
    }
    box.hidden = false;
    box.innerHTML =
      '<button class="close" type="button" id="dclose">Close &times;</button>' +
      '<h2>#' + r.rank + ' &middot; ' + esc(r.name) + '</h2>' +
      '<p class="sub">' + esc(r.slug) + ' &middot; ' + esc(r.category || 'uncategorised') + ' &middot; listed ' +
      esc(r.listed_at || 'unknown date') + ' &middot; <strong>records no token</strong> in the snapshot</p>' +
      '<div class="chips"><span class="chip gold">Implied value ' + money(r.implied_value_usd) + '</span>' +
      '<span class="chip">TVL ' + money(r.tvl_usd) + '</span>' +
      '<span class="chip">7-day ' + (r.change_7d == null ? 'unreported' : (r.change_7d >= 0 ? '+' : '') + r.change_7d.toFixed(1) + '%') + '</span>' +
      '<span class="chip">Chains: ' + esc(r.chains.join(', ')) + '</span>' +
      (r.watchlist ? '<span class="chip gold">On the $50M watchlist</span>' : '<span class="chip">Early find below the floor</span>') +
      '</div>' +
      '<div class="modelgrid">' +
      cell('TVL × 0.30 base', money(base), base / (rows[0].tvl_usd * 0.3)) +
      cell('Growth ×' + r.growth_multiplier.toFixed(2), '×' + r.growth_multiplier.toFixed(2), (r.growth_multiplier - 0.5) / 1.4) +
      cell('Maturity ×' + r.maturity_multiplier.toFixed(2), '×' + r.maturity_multiplier.toFixed(2), (r.maturity_multiplier - 0.6) / 0.4) +
      cell('Breadth ×' + r.breadth_multiplier.toFixed(2), '×' + r.breadth_multiplier.toFixed(2), (r.breadth_multiplier - 1) / 0.35) +
      cell('Category ×' + r.category_multiplier.toFixed(2), '×' + r.category_multiplier.toFixed(2), (r.category_multiplier - 0.9) / 0.25) +
      '</div>' +
      '<h3>How to farm it &mdash; ' + r.farm_steps.length + ' steps, with cost and time</h3>' +
      '<ol>' + r.farm_steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol>' +
      '<p class="sub">Implied value = ' + money(base) + ' × ' + r.growth_multiplier.toFixed(2) + ' × ' +
      r.maturity_multiplier.toFixed(2) + ' × ' + r.breadth_multiplier.toFixed(2) + ' × ' +
      r.category_multiplier.toFixed(2) + ' — computed by impliedValue() from this snapshot alone.</p>';
    $('dclose').addEventListener('click', function () { select(null); });
  }

  function select(slug) {
    state.sel = slug;
    if (slug) { try { history.replaceState(null, '', '#' + slug); } catch (e) { /* file:// */ } }
    else { try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* file:// */ } }
    renderDetail();
    renderRows();
    if (slug) $('detail').scrollIntoView({ block: 'nearest' });
  }

  // ---- live table (set aside)
  $('live').innerHTML = live.map(function (p) {
    return '<tr><td class="nm">' + esc(p.name) + '<span class="slug">' + esc(p.slug) + '</span></td>' +
      '<td>' + esc(p.category || '—') + '</td><td>' + esc(p.chains.slice(0, 3).join(', ')) + '</td>' +
      '<td class="num">' + money(p.tvl_usd) + '</td>' +
      '<td class="num">' + (p.mcap_usd == null ? '<span class="mut">—</span>' : money(p.mcap_usd)) + '</td>' +
      '<td class="num">' + pct(p.change_7d) + '</td></tr>';
  }).join('');

  // ---- events
  $('q').addEventListener('input', function (e) { state.q = e.target.value; renderRows(); });
  $('cat').addEventListener('change', function (e) { state.cat = e.target.value; renderRows(); });
  $('chain').addEventListener('change', function (e) { state.chain = e.target.value; renderRows(); });
  $('sort').addEventListener('change', function (e) { state.sort = e.target.value; renderRows(); });
  $('watch').addEventListener('change', function (e) { state.watch = e.target.checked; renderRows(); });
  $('reset').addEventListener('click', function () {
    state = { q: '', cat: '', chain: '', sort: 'implied', watch: false, sel: state.sel };
    $('q').value = ''; $('cat').value = ''; $('chain').value = ''; $('sort').value = 'implied'; $('watch').checked = false;
    renderRows();
  });
  $('rows').addEventListener('click', function (e) {
    var tr = e.target.closest('tr');
    if (tr) select(tr.getAttribute('data-slug'));
  });
  document.querySelectorAll('#board thead th[data-k]').forEach(function (th) {
    th.addEventListener('click', function () {
      var map = { rank: 'implied', name: 'name', tvl: 'tvl', growth: 'growth', age: 'age', implied: 'implied' };
      var k = map[th.getAttribute('data-k')];
      if (k) { state.sort = k; $('sort').value = k; renderRows(); }
    });
  });

  // Deep-link: #<slug> opens that protocol's detail view (used by the screenshots).
  var hash = location.hash.replace(/^#/, '');
  if (hash && rows.some(function (r) { return r.slug === hash; })) state.sel = hash;

  renderDetail();
  renderRows();
})();
