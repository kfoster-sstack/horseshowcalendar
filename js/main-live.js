/* ===================================================================
   HorseShowCalendar — Live Backend Bridge
   Augments the static main.js homepage with Supabase data:
   - Replaces seed grid with live shows when Supabase has rows
   - Posts public submissions to show_submissions
   - Posts alert signups to alert_subscribers
   - Adds session-aware nav
   ================================================================== */

(function () {
  'use strict';

  if (typeof supabase === 'undefined') return; // graceful no-op if config missing

  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    if (typeof HSC !== 'undefined' && HSC.initNavSession) HSC.initNavSession();
    if (document.getElementById('showsGrid')) await loadLiveShows();
    bindLiveSubmit();
    bindLiveAlerts();
  }

  async function loadLiveShows() {
    var r = await supabase.from('shows')
      .select('id, name, slug, discipline, region, start_date, end_date, city, state, status, prize_money_total, description, website')
      .eq('visibility', 'public')
      .in('status', ['open', 'closed', 'live', 'completed'])
      .gte('end_date', new Date().toISOString().slice(0, 10))
      .order('start_date', { ascending: true });
    var shows = r.data || [];
    if (shows.length === 0) return; // keep seed data

    renderLiveGrid(shows);
    bindLiveFilters(shows);
  }

  function renderLiveGrid(shows) {
    var grid = document.getElementById('showsGrid');
    if (!grid) return;
    grid.innerHTML = shows.map(cardHtml).join('');

    grid.querySelectorAll('.show-card').forEach(function (card) {
      card.addEventListener('click', function (e) {
        if (e.target.closest('a')) return;
        window.location.href = 'show.html?id=' + card.getAttribute('data-id');
      });
      card.style.cursor = 'pointer';
    });

    var info = document.getElementById('resultsInfo');
    if (info) info.innerHTML = 'Showing all <strong>' + shows.length + '</strong> upcoming shows';
  }

  function cardHtml(s) {
    var disc = s.discipline || '';
    var discClass = 'disc-' + disc.toLowerCase().replace(/[\s\/]+/g, '-');
    var dates = HSC.fmtDateRange(s.start_date, s.end_date);
    var loc = [s.city, s.state].filter(Boolean).join(', ');
    return '' +
      '<article class="show-card" data-id="' + s.id + '" data-discipline="' + esc(disc) + '" data-region="' + esc(s.region || '') + '" data-month="' + (new Date(s.start_date + 'T00:00:00').getMonth() + 1) + '" data-search="' + esc((s.name + ' ' + (s.city || '') + ' ' + (s.state || '')).toLowerCase()) + '">' +
        '<div class="show-card-header">' +
          '<span class="show-card-discipline ' + discClass + '">' + esc(disc) + '</span>' +
          '<h3 class="show-card-title">' + esc(s.name) + '</h3>' +
          '<p class="show-card-dates">' + dates + '</p>' +
        '</div>' +
        '<div class="show-card-body">' +
          '<dl class="show-card-meta">' +
            '<dt>Location</dt><dd>' + esc(loc) + '</dd>' +
            (s.region ? '<dt>Region</dt><dd>' + esc(s.region) + '</dd>' : '') +
            (Number(s.prize_money_total) > 0 ? '<dt>Prize Money</dt><dd>' + HSC.fmtMoney(s.prize_money_total) + '</dd>' : '') +
            '<dt>Status</dt><dd style="text-transform:capitalize;">' + esc(s.status) + '</dd>' +
          '</dl>' +
        '</div>' +
        '<div class="show-card-footer">' +
          '<span class="show-level-badge">' + esc(s.status) + '</span>' +
          '<a class="btn-details" href="show.html?id=' + s.id + '">View Details &rarr;</a>' +
        '</div>' +
      '</article>';
  }

  function bindLiveFilters(allShows) {
    var disc = document.getElementById('filterDiscipline');
    var reg = document.getElementById('filterRegion');
    var mo = document.getElementById('filterMonth');
    var sr = document.getElementById('filterSearch');
    var run = function () {
      var dv = disc ? disc.value : 'All';
      var rv = reg ? reg.value : 'All';
      var mv = mo ? mo.value : 'all';
      var sv = (sr ? sr.value : '').toLowerCase();
      var filtered = allShows.filter(function (s) {
        var smonth = new Date(s.start_date + 'T00:00:00').getMonth() + 1;
        var hay = (s.name + ' ' + (s.city || '') + ' ' + (s.state || '')).toLowerCase();
        return (dv === 'All' || s.discipline === dv) &&
               (rv === 'All' || s.region === rv) &&
               (mv === 'all' || smonth === parseInt(mv, 10)) &&
               (!sv || hay.indexOf(sv) !== -1);
      });
      renderLiveGrid(filtered);
    };
    [disc, reg, mo].forEach(function (el) { if (el) el.addEventListener('change', run); });
    if (sr) sr.addEventListener('input', HSC.debounce(run, 250));
    var btnFilter = document.getElementById('btnFilter');
    if (btnFilter) btnFilter.addEventListener('click', run);
    var btnReset = document.getElementById('btnReset');
    if (btnReset) btnReset.addEventListener('click', function () {
      if (disc) disc.value = 'All';
      if (reg) reg.value = 'All';
      if (mo) mo.value = 'all';
      if (sr) sr.value = '';
      run();
    });
  }

  function bindLiveSubmit() {
    var form = document.getElementById('submitShowForm');
    if (!form) return;
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var data = {
        name: v('ssName'),
        discipline: v('ssDiscipline'),
        start_date: v('ssDateStart'),
        end_date: v('ssDateEnd') || v('ssDateStart'),
        city: v('ssCity'),
        state: v('ssState'),
        contact_email: v('ssEmail'),
        website: v('ssWebsite') || null,
        description: v('ssDescription') || null
      };
      if (!data.name || !data.discipline || !data.start_date || !data.city || !data.state || !data.contact_email) return;
      var r = await supabase.from('show_submissions').insert(data);
      if (r.error) { HSC.toast('Submission failed. Please try again.', 'error'); return; }
      form.style.display = 'none';
      var s = document.getElementById('submitSuccess');
      if (s) s.style.display = 'block';
      HSC.toast('Show submitted! We\'ll review and add it shortly.', 'success');
    }, true);
  }

  function bindLiveAlerts() {
    var form = document.getElementById('alertSignupForm');
    if (!form) return;
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var discs = [];
      form.querySelectorAll('input[name="alertDisciplines"]:checked').forEach(function (cb) { discs.push(cb.value); });
      var data = {
        email: v('alertEmail'),
        name: v('alertName'),
        disciplines: discs,
        regions: v('alertRegion') ? [v('alertRegion')] : []
      };
      if (!data.email || !data.name) return;
      var r = await supabase.from('alert_subscribers').upsert(data, { onConflict: 'email' });
      if (r.error) { HSC.toast('Signup failed.', 'error'); return; }
      form.style.display = 'none';
      var s = document.getElementById('alertSuccess');
      if (s) s.style.display = 'block';
      HSC.toast('Subscribed to weekly alerts!', 'success');
    }, true);
  }

  function v(id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; }
  function esc(s) { return HSC.escHtml(s); }
})();
