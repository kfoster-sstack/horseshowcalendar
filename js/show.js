/* ===================================================================
   HorseShowCalendar — Public Show Detail Page
   Loads a show by ?id=UUID or ?slug=name and renders tabs.
   ================================================================== */

(function () {
  'use strict';

  HSC.initMobileNav();
  HSC.initNavSession();

  var showId = HSC.qs('id');
  var slug = HSC.qs('slug');

  var show, classes = [], divisions = [], rings = [], announcements = [];
  var liveChannel = null;

  init();

  async function init() {
    if (!showId && !slug) {
      document.querySelector('.container').innerHTML = '<p style="padding:40px;">No show specified. <a href="index.html">Browse the calendar</a>.</p>';
      return;
    }

    var q = supabase.from('shows').select('*');
    q = showId ? q.eq('id', showId) : q.eq('slug', slug);
    var r = await q.maybeSingle();

    if (r.error || !r.data) {
      document.querySelector('.container').innerHTML = '<p style="padding:40px;">Show not found or not yet published.</p>';
      return;
    }

    show = r.data;
    showId = show.id;
    document.getElementById('pageTitle').textContent = show.name + ' — HorseShowCalendar.com';
    document.getElementById('pageDesc').setAttribute('content', (show.description || show.name) + ' — ' + show.discipline + ' show, ' + (show.city || '') + ', ' + (show.state || ''));

    renderHero();
    initTabs();

    var [c, d, ri, an] = await Promise.all([
      supabase.from('classes').select('*').eq('show_id', showId).order('schedule_date', { ascending: true }).order('schedule_order', { ascending: true }),
      supabase.from('divisions').select('*').eq('show_id', showId).order('display_order'),
      supabase.from('rings').select('*').eq('show_id', showId).order('display_order'),
      supabase.from('show_announcements').select('*').eq('show_id', showId).order('created_at', { ascending: false }).limit(20)
    ]);

    classes = c.data || [];
    divisions = d.data || [];
    rings = ri.data || [];
    announcements = an.data || [];

    renderOverview();
    renderPrizeList();
    renderSchedule();
    renderResults();
    renderAnnouncements();

    // Realtime subscription for live updates
    liveChannel = supabase.channel('show-' + showId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'classes', filter: 'show_id=eq.' + showId }, refreshClasses)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'results' }, refreshClasses)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'show_announcements', filter: 'show_id=eq.' + showId }, refreshAnnouncements)
      .subscribe();
  }

  async function refreshClasses() {
    var r = await supabase.from('classes').select('*').eq('show_id', showId).order('schedule_date').order('schedule_order');
    classes = r.data || [];
    renderSchedule();
    renderResults();
  }

  async function refreshAnnouncements() {
    var r = await supabase.from('show_announcements').select('*').eq('show_id', showId).order('created_at', { ascending: false }).limit(20);
    announcements = r.data || [];
    renderAnnouncements();
  }

  function renderHero() {
    var h = document.getElementById('showHero');
    var dates = HSC.fmtDateRange(show.start_date, show.end_date);
    var loc = [show.city, show.state].filter(Boolean).join(', ');
    var entryBtn = '';
    if (show.status === 'open') {
      entryBtn = '<a href="exhibitor/enter-show.html?show=' + show.id + '" class="btn btn-primary">Enter This Show</a>';
    } else if (show.status === 'closed') {
      entryBtn = '<a href="#" class="btn btn-ghost" style="background:rgba(255,255,255,.15);color:white;border-color:rgba(255,255,255,.3);">Entries Closed</a>';
    } else if (show.status === 'live') {
      entryBtn = '<a href="#panel-results" class="btn btn-primary">View Live Results</a>';
    }

    h.innerHTML =
      '<div class="badges">' +
        '<span class="pill">' + HSC.escHtml(show.discipline) + '</span>' +
        (show.region ? '<span class="pill">' + HSC.escHtml(show.region) + '</span>' : '') +
        '<span class="pill">' + HSC.escHtml(show.status) + '</span>' +
      '</div>' +
      '<h1>' + HSC.escHtml(show.name) + '</h1>' +
      '<p class="meta">&#128197; ' + dates + (loc ? ' &nbsp; • &nbsp; &#128205; ' + HSC.escHtml(loc) : '') + '</p>' +
      '<div class="ctas">' + entryBtn +
        (show.website ? '<a href="' + HSC.escHtml(show.website) + '" target="_blank" rel="noopener" class="btn btn-ghost" style="background:rgba(255,255,255,.15);color:white;border-color:rgba(255,255,255,.3);">Show Website</a>' : '') +
      '</div>';
  }

  function initTabs() {
    var tabs = HSC.$$('.show-tab');
    tabs.forEach(function (t) {
      t.addEventListener('click', function () {
        var name = t.getAttribute('data-tab');
        tabs.forEach(function (x) { x.classList.toggle('active', x === t); });
        HSC.$$('.tab-panel').forEach(function (p) { p.classList.toggle('active', p.id === 'panel-' + name); });
      });
    });
    if (window.location.hash) {
      var match = window.location.hash.replace('#panel-', '');
      var btn = document.querySelector('.show-tab[data-tab="' + match + '"]');
      if (btn) btn.click();
    }
  }

  function renderOverview() {
    var left = document.getElementById('overviewLeft');
    var right = document.getElementById('overviewRight');
    left.innerHTML =
      '<h2>About this show</h2>' +
      (show.description ? '<p style="white-space:pre-wrap;">' + HSC.escHtml(show.description) + '</p>' : '<p style="color:#6B7280;">No description provided.</p>');

    var dates = HSC.fmtDateRange(show.start_date, show.end_date);
    right.innerHTML =
      '<h3>At a glance</h3>' +
      '<table class="data-table">' +
        '<tr><th>Dates</th><td>' + dates + '</td></tr>' +
        '<tr><th>Discipline</th><td>' + HSC.escHtml(show.discipline) + '</td></tr>' +
        (show.venue_name ? '<tr><th>Venue</th><td>' + HSC.escHtml(show.venue_name) + '</td></tr>' : '') +
        (show.venue_address ? '<tr><th>Address</th><td>' + HSC.escHtml(show.venue_address) + '</td></tr>' : '') +
        (show.contact_email ? '<tr><th>Contact</th><td><a href="mailto:' + HSC.escHtml(show.contact_email) + '">' + HSC.escHtml(show.contact_email) + '</a></td></tr>' : '') +
        (show.entries_close_at ? '<tr><th>Entries close</th><td>' + new Date(show.entries_close_at).toLocaleString() + '</td></tr>' : '') +
        (Number(show.prize_money_total) > 0 ? '<tr><th>Total prize money</th><td>' + HSC.fmtMoney(show.prize_money_total) + '</td></tr>' : '') +
        '<tr><th>Classes</th><td>' + classes.length + '</td></tr>' +
        '<tr><th>Divisions</th><td>' + divisions.length + '</td></tr>' +
      '</table>';
  }

  function renderPrizeList() {
    var c = document.getElementById('prizeListContent');
    if (divisions.length === 0 && classes.length === 0) {
      c.innerHTML = HSC.emptyState('Prize list pending', 'The show manager hasn\'t published the prize list yet.');
      return;
    }

    var html = '';
    divisions.forEach(function (d) {
      var dClasses = classes.filter(function (cl) { return cl.division_id === d.id; });
      html += '<div class="card"><h3>' + HSC.escHtml(d.name) + '</h3>';
      if (d.description) html += '<p style="color:#6B7280;">' + HSC.escHtml(d.description) + '</p>';
      if (Number(d.prize_money) > 0) html += '<p><strong>Division prize money:</strong> ' + HSC.fmtMoney(d.prize_money) + '</p>';
      if (d.champion_award) html += '<p><strong>Champion:</strong> ' + HSC.escHtml(d.champion_award) + '</p>';
      if (d.reserve_award) html += '<p><strong>Reserve:</strong> ' + HSC.escHtml(d.reserve_award) + '</p>';
      html += '<div class="table-wrap" style="margin-top:10px;"><table class="data-table"><thead><tr><th>#</th><th>Class</th><th>Height</th><th class="num">Fee</th><th class="num">Prize</th></tr></thead><tbody>';
      dClasses.forEach(function (cl) {
        html += '<tr><td>' + HSC.escHtml(cl.number) + '</td><td>' + HSC.escHtml(cl.name) + '</td><td>' + HSC.escHtml(cl.height || '') + '</td><td class="num">' + HSC.fmtMoney(cl.fee) + '</td><td class="num">' + (Number(cl.prize_money) > 0 ? HSC.fmtMoney(cl.prize_money) : '—') + '</td></tr>';
      });
      html += '</tbody></table></div></div>';
    });

    var unassigned = classes.filter(function (cl) { return !cl.division_id; });
    if (unassigned.length > 0) {
      html += '<div class="card"><h3>Other Classes</h3>';
      html += '<div class="table-wrap"><table class="data-table"><thead><tr><th>#</th><th>Class</th><th>Height</th><th class="num">Fee</th></tr></thead><tbody>';
      unassigned.forEach(function (cl) {
        html += '<tr><td>' + HSC.escHtml(cl.number) + '</td><td>' + HSC.escHtml(cl.name) + '</td><td>' + HSC.escHtml(cl.height || '') + '</td><td class="num">' + HSC.fmtMoney(cl.fee) + '</td></tr>';
      });
      html += '</tbody></table></div></div>';
    }

    c.innerHTML = html;
  }

  function renderSchedule() {
    var c = document.getElementById('scheduleContent');
    var scheduled = classes.filter(function (cl) { return cl.schedule_date; });
    if (scheduled.length === 0) {
      c.innerHTML = HSC.emptyState('Schedule pending', 'Once the manager publishes the run order, it will appear here in real time.');
      return;
    }

    var byDay = {};
    scheduled.forEach(function (cl) {
      (byDay[cl.schedule_date] = byDay[cl.schedule_date] || []).push(cl);
    });

    var ringMap = {};
    rings.forEach(function (r) { ringMap[r.id] = r.name; });

    var html = '';
    Object.keys(byDay).sort().forEach(function (date) {
      html += '<div class="schedule-day">';
      html += '<h3>' + HSC.fmtDate(date) + '</h3>';
      html += '<div class="schedule-row" style="background:#F8FAFB;font-size:.78rem;text-transform:uppercase;color:#6B7280;letter-spacing:.5px;"><div>Time</div><div>#</div><div>Class</div><div>Ring</div><div>Status</div></div>';
      byDay[date].forEach(function (cl) {
        html += '<div class="schedule-row">' +
          '<div class="time">' + HSC.fmtTime(cl.schedule_time || '') + '</div>' +
          '<div>' + HSC.escHtml(cl.number) + '</div>' +
          '<div>' + HSC.escHtml(cl.name) + '</div>' +
          '<div class="ring">' + HSC.escHtml(ringMap[cl.ring_id] || '—') + '</div>' +
          '<div>' + HSC.statusPill(cl.status) + '</div>' +
        '</div>';
      });
      html += '</div>';
    });
    c.innerHTML = html;
  }

  async function renderResults() {
    var c = document.getElementById('resultsContent');
    var inProgressOrDone = classes.filter(function (cl) { return cl.status === 'in_progress' || cl.status === 'completed'; });

    if (inProgressOrDone.length === 0) {
      c.innerHTML = HSC.emptyState('No results yet', 'Live results show here as classes start. Pin this page open during the show.');
      return;
    }

    var ids = inProgressOrDone.map(function (cl) { return cl.id; });
    var rR = await supabase.from('results')
      .select('*, class_entries!inner(*, entries!inner(rider_name, trainer_name, back_number, horses(show_name, name)))')
      .in('class_id', ids)
      .order('placing', { ascending: true });
    var results = rR.data || [];

    var byClass = {};
    results.forEach(function (r) { (byClass[r.class_id] = byClass[r.class_id] || []).push(r); });

    var html = '';
    inProgressOrDone.forEach(function (cl) {
      html += '<div class="card"><div style="display:flex;justify-content:space-between;align-items:center;"><h3>' + HSC.escHtml(cl.number) + ' — ' + HSC.escHtml(cl.name) + '</h3>' + HSC.statusPill(cl.status) + '</div>';
      var rows = byClass[cl.id] || [];
      if (rows.length === 0) {
        html += '<p style="color:#6B7280;margin-top:10px;">Class is in progress. Results will populate as the judge scores.</p>';
      } else {
        html += '<div class="table-wrap" style="margin-top:10px;"><table class="data-table"><thead><tr><th>Place</th><th>#</th><th>Horse</th><th>Rider</th><th class="num">Score</th><th class="num">Faults</th><th class="num">Time</th><th class="num">Prize</th></tr></thead><tbody>';
        rows.forEach(function (r) {
          var ce = r.class_entries || {};
          var en = ce.entries || {};
          var horseName = en.horses ? (en.horses.show_name || en.horses.name || '') : '';
          html += '<tr>' +
            '<td><strong>' + (r.placing || '—') + '</strong></td>' +
            '<td>' + HSC.escHtml(en.back_number || '') + '</td>' +
            '<td>' + HSC.escHtml(horseName) + '</td>' +
            '<td>' + HSC.escHtml(en.rider_name || '') + '</td>' +
            '<td class="num">' + (r.score !== null && r.score !== undefined ? Number(r.score).toFixed(2) : '—') + '</td>' +
            '<td class="num">' + (r.faults !== null && r.faults !== undefined ? Number(r.faults) : '—') + '</td>' +
            '<td class="num">' + (r.time_seconds !== null && r.time_seconds !== undefined ? Number(r.time_seconds).toFixed(2) + 's' : '—') + '</td>' +
            '<td class="num">' + (Number(r.prize_money_awarded) > 0 ? HSC.fmtMoney(r.prize_money_awarded) : '—') + '</td>' +
          '</tr>';
        });
        html += '</tbody></table></div>';
      }
      html += '</div>';
    });

    c.innerHTML = html;
  }

  function renderAnnouncements() {
    var c = document.getElementById('announcementsContent');
    if (announcements.length === 0) {
      c.innerHTML = HSC.emptyState('No announcements', 'When the show staff posts updates, they\'ll appear here.');
      return;
    }
    var html = '';
    announcements.forEach(function (a) {
      html += '<div class="card">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;"><h3>' + HSC.escHtml(a.title) + '</h3>' +
        '<span class="pill pill-' + (a.priority === 'urgent' ? 'red' : a.priority === 'important' ? 'amber' : 'blue') + '">' + HSC.escHtml(a.priority) + '</span></div>' +
        '<p style="color:#6B7280;font-size:.85rem;">' + new Date(a.created_at).toLocaleString() + '</p>' +
        '<p style="white-space:pre-wrap;">' + HSC.escHtml(a.body) + '</p>' +
      '</div>';
    });
    c.innerHTML = html;
  }
})();
