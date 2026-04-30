/* ===================================================================
   HorseShowCalendar — Live Scoring (Judge + Public Board)
   ================================================================== */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', boot);

  async function boot() {
    HSC.initMobileNav();
    var page = window.PAGE || 'judge';

    if (page === 'judge') {
      var profile = await HSC.requireRole(['judge', 'manager', 'admin'], '../login.html');
      if (!profile) return;
      document.getElementById('logoutBtn').addEventListener('click', function () { HSC.logout(); });
      document.getElementById('userName').textContent = profile.full_name || profile.email;
      initJudge(profile);
    } else if (page === 'live') {
      initLiveBoard();
    }
  }

  // ---------- JUDGE CONSOLE ----------
  async function initJudge(profile) {
    // Load shows where this user has staff access (or is the manager) AND status is open/live/closed
    var [own, staff] = await Promise.all([
      supabase.from('shows').select('id, name, start_date, end_date, discipline, status').eq('manager_id', profile.id).in('status', ['open', 'closed', 'live']),
      supabase.from('show_staff').select('show_id, shows(id, name, start_date, end_date, discipline, status)').eq('user_id', profile.id)
    ]);

    var shows = (own.data || []).slice();
    (staff.data || []).forEach(function (s) {
      if (s.shows && shows.findIndex(function (x) { return x.id === s.shows.id; }) === -1) shows.push(s.shows);
    });

    var picker = document.getElementById('judgeShowPicker');
    if (shows.length === 0) {
      HSC.setHTML(document.getElementById('judgeRoot'), HSC.emptyState('No shows assigned', 'A manager needs to add you as staff or assign you a show first.'));
      return;
    }
    picker.innerHTML = '<option value="">Select a show…</option>' + shows.map(function (s) {
      return '<option value="' + s.id + '">' + HSC.escHtml(s.name) + ' (' + HSC.fmtDate(s.start_date) + ')</option>';
    }).join('');

    var selectedShow = HSC.qs('show');
    if (selectedShow) picker.value = selectedShow;

    picker.addEventListener('change', function () {
      if (picker.value) loadJudgeShow(picker.value, profile);
    });
    if (picker.value) loadJudgeShow(picker.value, profile);
  }

  async function loadJudgeShow(showId, profile) {
    var rC = await supabase.from('classes').select('*, rings(name)').eq('show_id', showId).order('schedule_date').order('schedule_order');
    var classes = rC.data || [];

    // Show class list grouped by status
    var grouped = { in_progress: [], open: [], closed: [], completed: [] };
    classes.forEach(function (cl) {
      if (grouped[cl.status]) grouped[cl.status].push(cl); else grouped[cl.status] = [cl];
    });

    var html = '';
    [['in_progress', 'In Progress'], ['open', 'Upcoming'], ['completed', 'Completed']].forEach(function (g) {
      if (!grouped[g[0]] || grouped[g[0]].length === 0) return;
      html += '<div class="card"><h3>' + g[1] + '</h3>' +
        '<div class="table-wrap"><table class="data-table"><thead><tr><th>#</th><th>Class</th><th>Ring</th><th>Date / Time</th><th>Format</th><th></th></tr></thead><tbody>' +
        grouped[g[0]].map(function (cl) {
          return '<tr>' +
            '<td>' + HSC.escHtml(cl.number) + '</td>' +
            '<td>' + HSC.escHtml(cl.name) + '</td>' +
            '<td>' + HSC.escHtml(cl.rings ? cl.rings.name : '') + '</td>' +
            '<td>' + (cl.schedule_date ? HSC.fmtDate(cl.schedule_date) + ' ' + HSC.fmtTime(cl.schedule_time || '') : '—') + '</td>' +
            '<td>' + HSC.escHtml(cl.judging_format) + '</td>' +
            '<td><button class="btn btn-primary btn-sm" data-class-judge="' + cl.id + '">Open</button></td>' +
          '</tr>';
        }).join('') +
        '</tbody></table></div></div>';
    });

    if (!html) html = HSC.emptyState('No classes', 'No classes scheduled for this show yet.');
    HSC.setHTML(document.getElementById('judgeRoot'), '<div id="classListWrap">' + html + '</div><div id="classScoreWrap"></div>');

    document.querySelectorAll('[data-class-judge]').forEach(function (b) {
      b.addEventListener('click', function () { openClassScoring(b.getAttribute('data-class-judge'), showId, profile); });
    });
  }

  async function openClassScoring(classId, showId, profile) {
    var [cR, ceR] = await Promise.all([
      supabase.from('classes').select('*').eq('id', classId).maybeSingle(),
      supabase.from('class_entries')
        .select('*, entries!inner(rider_name, trainer_name, back_number, horses(name, show_name)), results(*)')
        .eq('class_id', classId)
        .neq('status', 'scratched')
        .order('go_order', { ascending: true, nullsFirst: false })
    ]);
    var cl = cR.data;
    var entries = ceR.data || [];

    var format = cl.judging_format;
    var statusActions = '';
    if (cl.status === 'open' || cl.status === 'closed') {
      statusActions = '<button class="btn btn-primary btn-sm" id="startClassBtn">Start Class</button>';
    } else if (cl.status === 'in_progress') {
      statusActions = '<button class="btn btn-primary btn-sm" id="completeClassBtn">Complete &amp; Lock Results</button>';
    } else if (cl.status === 'completed') {
      statusActions = '<button class="btn btn-ghost btn-sm" id="reopenClassBtn">Reopen for Edits</button>';
    }

    var fields = scoreFieldsFor(format);
    var html = '<div class="card">' +
        '<button class="btn btn-ghost btn-sm" id="backToClasses" style="margin-bottom:10px;">← All Classes</button>' +
        '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">' +
          '<h2>' + HSC.escHtml(cl.number) + ' — ' + HSC.escHtml(cl.name) + '</h2>' +
          '<div>' + HSC.statusPill(cl.status) + '&nbsp;' + statusActions + '</div>' +
        '</div>' +
        '<p style="color:#6B7280;">Format: ' + HSC.escHtml(format) + '</p>' +
      '</div>' +

      '<div class="card"><h3>Scoring</h3>' +
      (entries.length === 0 ? '<p>No entries in this class.</p>' :
        '<div class="table-wrap"><table class="data-table"><thead><tr><th>Order</th><th>Back #</th><th>Horse</th><th>Rider</th>' +
          fields.map(function (f) { return '<th class="num">' + f.label + '</th>'; }).join('') +
          '<th class="num">Place</th><th>Status</th><th></th></tr></thead><tbody>' +
        entries.map(function (ce, idx) {
          var en = ce.entries;
          var horseName = en.horses ? (en.horses.show_name || en.horses.name) : '';
          var res = (ce.results || [])[0] || {};
          return '<tr data-ce="' + ce.id + '">' +
            '<td><input type="number" class="ord" style="width:55px;" value="' + (ce.go_order || idx + 1) + '"></td>' +
            '<td>' + HSC.escHtml(en.back_number || '') + '</td>' +
            '<td>' + HSC.escHtml(horseName) + '</td>' +
            '<td>' + HSC.escHtml(en.rider_name) + '</td>' +
            fields.map(function (f) {
              var val = res[f.field];
              return '<td class="num"><input type="number" step="' + (f.step || '0.01') + '" class="fld fld-' + f.field + '" data-field="' + f.field + '" value="' + (val !== null && val !== undefined ? val : '') + '" style="width:80px;text-align:right;"></td>';
            }).join('') +
            '<td class="num"><input type="number" class="place" style="width:55px;text-align:right;" value="' + (res.placing || '') + '"></td>' +
            '<td><select class="ce-status" style="width:110px;">' +
              ['entered','completed','eliminated','no_show'].map(function (s) { return '<option value="' + s + '"' + (ce.status === s ? ' selected' : '') + '>' + s + '</option>'; }).join('') +
            '</select></td>' +
            '<td><button class="btn btn-primary btn-sm save-row">Save</button></td>' +
          '</tr>';
        }).join('') +
        '</tbody></table></div>' +
        '<div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;">' +
          '<button class="btn btn-primary btn-sm" id="saveAllBtn">Save All</button>' +
          '<button class="btn btn-ghost btn-sm" id="autoPlaceBtn">Auto-place by ' + (format.indexOf('jumper') !== -1 ? 'faults &amp; time' : 'score') + '</button>' +
          '<button class="btn btn-ghost btn-sm" id="randomDrawBtn">Random Draw Order</button>' +
        '</div>'
      ) + '</div>';

    HSC.setHTML(document.getElementById('classScoreWrap'), html);
    document.getElementById('classListWrap').style.display = 'none';

    document.getElementById('backToClasses').addEventListener('click', function () {
      document.getElementById('classScoreWrap').innerHTML = '';
      document.getElementById('classListWrap').style.display = '';
    });

    document.querySelectorAll('.save-row').forEach(function (b) {
      b.addEventListener('click', function () { saveRow(b.closest('tr'), classId, profile); });
    });

    var saveAll = document.getElementById('saveAllBtn');
    if (saveAll) saveAll.addEventListener('click', function () {
      document.querySelectorAll('#classScoreWrap tr[data-ce]').forEach(function (tr) { saveRow(tr, classId, profile); });
    });

    var auto = document.getElementById('autoPlaceBtn');
    if (auto) auto.addEventListener('click', function () { autoPlace(format); });

    var rd = document.getElementById('randomDrawBtn');
    if (rd) rd.addEventListener('click', function () {
      var rows = Array.prototype.slice.call(document.querySelectorAll('#classScoreWrap tr[data-ce]'));
      var order = rows.map(function (_, i) { return i + 1; }).sort(function () { return Math.random() - 0.5; });
      rows.forEach(function (r, i) { r.querySelector('.ord').value = order[i]; });
    });

    var startBtn = document.getElementById('startClassBtn');
    if (startBtn) startBtn.addEventListener('click', async function () {
      await supabase.from('classes').update({ status: 'in_progress', started_at: new Date().toISOString() }).eq('id', classId);
      openClassScoring(classId, showId, profile);
    });
    var completeBtn = document.getElementById('completeClassBtn');
    if (completeBtn) completeBtn.addEventListener('click', async function () {
      await supabase.from('classes').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', classId);
      await distributePrizeMoney(classId);
      openClassScoring(classId, showId, profile);
    });
    var reopenBtn = document.getElementById('reopenClassBtn');
    if (reopenBtn) reopenBtn.addEventListener('click', async function () {
      await supabase.from('classes').update({ status: 'in_progress' }).eq('id', classId);
      openClassScoring(classId, showId, profile);
    });
  }

  async function saveRow(tr, classId, profile) {
    var ceId = tr.getAttribute('data-ce');
    var goOrder = parseInt(tr.querySelector('.ord').value, 10) || null;
    var placing = parseInt(tr.querySelector('.place').value, 10) || null;
    var status = tr.querySelector('.ce-status').value;
    var resultData = { class_id: classId, class_entry_id: ceId, placing: placing, scored_by: profile.id, scored_at: new Date().toISOString() };
    tr.querySelectorAll('.fld').forEach(function (i) {
      var v = i.value === '' ? null : Number(i.value);
      resultData[i.getAttribute('data-field')] = v;
    });

    await supabase.from('class_entries').update({ go_order: goOrder, status: status }).eq('id', ceId);
    await supabase.from('results').upsert(resultData, { onConflict: 'class_entry_id' });
    HSC.toast('Saved.', 'success');
  }

  function autoPlace(format) {
    var rows = Array.prototype.slice.call(document.querySelectorAll('#classScoreWrap tr[data-ce]'));
    var sorter;
    if (format.indexOf('jumper') !== -1) {
      sorter = function (a, b) {
        var fa = num(a, '.fld-faults'), fb = num(b, '.fld-faults');
        var ta = num(a, '.fld-time_seconds'), tb = num(b, '.fld-time_seconds');
        if (fa !== fb) return (fa == null ? 999 : fa) - (fb == null ? 999 : fb);
        return (ta == null ? 999 : ta) - (tb == null ? 999 : tb);
      };
    } else {
      sorter = function (a, b) {
        var sa = num(a, '.fld-score'), sb = num(b, '.fld-score');
        return (sb == null ? -1 : sb) - (sa == null ? -1 : sa);
      };
    }
    rows.sort(sorter);
    rows.forEach(function (r, i) { r.querySelector('.place').value = i + 1; });
    HSC.toast('Auto-placed. Click Save All to commit.', 'info');
  }

  function num(row, sel) {
    var el = row.querySelector(sel);
    if (!el) return null;
    var v = el.value;
    return v === '' ? null : Number(v);
  }

  function scoreFieldsFor(format) {
    if (format.indexOf('jumper') !== -1) {
      return [
        { field: 'faults', label: 'Faults', step: '0.5' },
        { field: 'time_seconds', label: 'Time (s)' },
        { field: 'jumpoff_faults', label: 'JO Faults' },
        { field: 'jumpoff_time', label: 'JO Time' }
      ];
    }
    if (format === 'time_only') return [{ field: 'time_seconds', label: 'Time (s)' }];
    if (format === 'dressage') return [{ field: 'score', label: 'Score %' }];
    if (format === 'derby') return [{ field: 'score', label: 'Round 1' }, { field: 'jumpoff_faults', label: 'Round 2' }];
    return [{ field: 'score', label: 'Score' }];
  }

  async function distributePrizeMoney(classId) {
    var [cR, rR] = await Promise.all([
      supabase.from('classes').select('prize_money, division_id').eq('id', classId).maybeSingle(),
      supabase.from('results').select('id, placing').eq('class_id', classId).not('placing', 'is', null).order('placing')
    ]);
    if (!cR.data || !rR.data || rR.data.length === 0) return;
    var pool = Number(cR.data.prize_money || 0);
    if (pool <= 0) return;
    // Standard payout split: 1st 30%, 2nd 22%, 3rd 16%, 4th 12%, 5th 8%, 6th 6%, 7th 4%, 8th 2%
    var splits = [.30, .22, .16, .12, .08, .06, .04, .02];
    for (var i = 0; i < rR.data.length && i < splits.length; i++) {
      var amt = +(pool * splits[i]).toFixed(2);
      await supabase.from('results').update({ prize_money_awarded: amt }).eq('id', rR.data[i].id);
    }
  }

  // ---------- LIVE BOARD (public TV view) ----------
  async function initLiveBoard() {
    var showId = HSC.qs('show');
    if (!showId) {
      HSC.setHTML(document.body, '<div class="live-board"><h1>No show specified</h1></div>');
      return;
    }
    var rS = await supabase.from('shows').select('name, status').eq('id', showId).maybeSingle();
    if (!rS.data) {
      HSC.setHTML(document.body, '<div class="live-board"><h1>Show not found</h1></div>');
      return;
    }
    document.getElementById('liveTitle').textContent = rS.data.name + ' — Live Results';
    refreshLive(showId);

    supabase.channel('live-' + showId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'classes', filter: 'show_id=eq.' + showId }, function () { refreshLive(showId); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'results' }, function () { refreshLive(showId); })
      .subscribe();

    setInterval(function () { refreshLive(showId); }, 30000);
  }

  async function refreshLive(showId) {
    var rC = await supabase.from('classes').select('*').eq('show_id', showId).in('status', ['in_progress', 'completed']).order('updated_at', { ascending: false });
    var classes = rC.data || [];
    var ids = classes.map(function (c) { return c.id; });
    if (ids.length === 0) {
      document.getElementById('liveBody').innerHTML = '<p style="opacity:.7;">Waiting for classes to start…</p>';
      return;
    }
    var rR = await supabase.from('results').select('*, class_entries!inner(entries!inner(rider_name, back_number, horses(show_name, name)))').in('class_id', ids).order('placing');
    var resByClass = {};
    (rR.data || []).forEach(function (r) { (resByClass[r.class_id] = resByClass[r.class_id] || []).push(r); });

    var html = classes.slice(0, 4).map(function (cl) {
      var rows = (resByClass[cl.id] || []).slice(0, 8);
      return '<div style="margin-bottom:30px;">' +
        '<h2 style="border-bottom:1px solid rgba(255,255,255,.2);padding-bottom:6px;">' + HSC.escHtml(cl.number) + ' — ' + HSC.escHtml(cl.name) + '  ' +
          '<span style="font-size:.7em;background:' + (cl.status === 'in_progress' ? '#DC2626' : '#0891B2') + ';padding:2px 8px;border-radius:6px;">' + cl.status.replace('_', ' ') + '</span>' +
        '</h2>' +
        '<div class="live-row head"><div>Place</div><div>Back#</div><div>Horse</div><div>Rider</div><div class="num">Score/Faults</div><div class="num">Time</div></div>' +
        (rows.length === 0
          ? '<p style="opacity:.6;">Pending…</p>'
          : rows.map(function (r) {
              var en = r.class_entries.entries;
              var horseName = en.horses ? (en.horses.show_name || en.horses.name) : '';
              var sc = r.score !== null && r.score !== undefined ? Number(r.score).toFixed(2) : (r.faults !== null && r.faults !== undefined ? Number(r.faults) + ' f' : '—');
              var t = r.time_seconds !== null && r.time_seconds !== undefined ? Number(r.time_seconds).toFixed(2) + 's' : '—';
              return '<div class="live-row">' +
                '<div class="place">' + (r.placing || '—') + '</div>' +
                '<div>' + HSC.escHtml(en.back_number || '') + '</div>' +
                '<div>' + HSC.escHtml(horseName) + '</div>' +
                '<div>' + HSC.escHtml(en.rider_name) + '</div>' +
                '<div class="num">' + sc + '</div>' +
                '<div class="num">' + t + '</div>' +
              '</div>';
          }).join('')
        ) +
      '</div>';
    }).join('');

    document.getElementById('liveBody').innerHTML = html;
  }
})();
