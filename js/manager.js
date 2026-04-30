/* ===================================================================
   HorseShowCalendar — Manager Portal Logic
   Shared across manager/* pages. Each page sets a window.PAGE constant.
   ================================================================== */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', boot);

  async function boot() {
    HSC.initMobileNav();
    var profile = await HSC.requireRole(['manager', 'admin'], '../login.html');
    if (!profile) return;

    // Hook logout
    var lo = document.getElementById('logoutBtn');
    if (lo) lo.addEventListener('click', function () { HSC.logout(); });

    var user = document.getElementById('userName');
    if (user) user.textContent = profile.full_name || profile.email;

    var page = window.PAGE || 'dashboard';
    var fn = window['page_' + page];
    if (typeof fn === 'function') fn(profile);
  }

  // ----- DASHBOARD -----
  window.page_dashboard = async function (profile) {
    var rShows = await supabase.from('shows').select('*').eq('manager_id', profile.id).order('start_date', { ascending: false });
    var shows = rShows.data || [];

    var openShows = shows.filter(function (s) { return s.status === 'open' || s.status === 'live'; });
    var upcoming = shows.filter(function (s) { return new Date(s.end_date) >= new Date(); });

    // Aggregate entry counts and revenue across all shows
    var showIds = shows.map(function (s) { return s.id; });
    var entryCount = 0, revenue = 0, openInvoices = 0;
    if (showIds.length) {
      var rE = await supabase.from('entries').select('id', { count: 'exact', head: true }).in('show_id', showIds);
      entryCount = rE.count || 0;
      var rI = await supabase.from('invoices').select('total, balance, status').in('show_id', showIds);
      (rI.data || []).forEach(function (i) {
        revenue += Number(i.total || 0);
        if (i.status === 'open' || i.status === 'partial') openInvoices += Number(i.balance || 0);
      });
    }

    HSC.setHTML(HSC.$('#statGrid'),
      statCard('Active Shows', openShows.length, 'accent') +
      statCard('Upcoming Shows', upcoming.length) +
      statCard('Total Entries', entryCount) +
      statCard('Revenue', HSC.fmtMoney(revenue)) +
      statCard('Outstanding Balance', HSC.fmtMoney(openInvoices), openInvoices > 0 ? 'warn' : '')
    );

    var listHtml;
    if (shows.length === 0) {
      listHtml = HSC.emptyState('No shows yet', 'Create your first show — takes about 5 minutes.', '<a href="show-edit.html" class="btn btn-primary">Create a Show</a>');
    } else {
      listHtml = '<div class="table-wrap"><table class="data-table"><thead><tr><th>Show</th><th>Dates</th><th>Discipline</th><th>Status</th><th class="num">Entries</th><th></th></tr></thead><tbody>' +
        shows.map(function (s) {
          return '<tr>' +
            '<td><strong>' + HSC.escHtml(s.name) + '</strong><div style="font-size:.8rem;color:#6B7280;">' + HSC.escHtml(s.city || '') + (s.state ? ', ' + HSC.escHtml(s.state) : '') + '</div></td>' +
            '<td>' + HSC.fmtDateRange(s.start_date, s.end_date) + '</td>' +
            '<td>' + HSC.escHtml(s.discipline) + '</td>' +
            '<td>' + HSC.statusPill(s.status) + '</td>' +
            '<td class="num" data-show-entries="' + s.id + '">…</td>' +
            '<td><a href="show-edit.html?show=' + s.id + '" class="btn btn-ghost btn-sm">Manage</a></td>' +
          '</tr>';
        }).join('') +
        '</tbody></table></div>';
    }
    HSC.setHTML(HSC.$('#showsList'), listHtml);

    // Per-show entry counts
    for (var i = 0; i < shows.length; i++) {
      var c = await supabase.from('entries').select('id', { count: 'exact', head: true }).eq('show_id', shows[i].id);
      var cell = document.querySelector('[data-show-entries="' + shows[i].id + '"]');
      if (cell) cell.textContent = c.count || 0;
    }
  };

  // ----- SHOW EDIT (create + tabs to manage) -----
  window.page_showEdit = async function (profile) {
    var showId = HSC.qs('show');
    var show = null;
    if (showId) {
      var r = await supabase.from('shows').select('*').eq('id', showId).maybeSingle();
      if (r.data && r.data.manager_id === profile.id) show = r.data;
      else { HSC.toast('Show not found.', 'error'); return; }
    }
    renderShowEditTabs(show);
    fillShowForm(show);
    bindShowForm(profile, show);

    if (show) {
      // Load related data
      bindShowTabs(show.id);
      loadRings(show.id);
      loadDivisions(show.id);
      loadClasses(show.id);
      loadEntries(show.id);
      loadAnnouncements(show.id);
      loadFinancials(show.id);
    } else {
      // Hide tabs until saved
      HSC.hide(HSC.$('#showSubTabs'));
      HSC.hide(HSC.$('#showSubPanels'));
    }
  };

  function renderShowEditTabs(show) {
    var titleEl = HSC.$('#showTitle');
    if (titleEl) titleEl.textContent = show ? show.name : 'New Show';
    var ctxEl = HSC.$('#showCtx');
    if (ctxEl && show) ctxEl.textContent = HSC.fmtDateRange(show.start_date, show.end_date) + ' • ' + show.discipline;
  }

  function fillShowForm(show) {
    if (!show) return;
    [
      'name','discipline','region','start_date','end_date','venue_name','venue_address','city','state','zip',
      'description','website','contact_email','contact_phone','status','visibility',
      'office_fee','drug_fee','usef_fee','stall_fee','haul_in_fee','late_fee_amount','prize_money_total',
      'usef_competition_id','ushja_competition_id'
    ].forEach(function (f) {
      var el = document.querySelector('[name="' + f + '"]');
      if (el && show[f] !== null && show[f] !== undefined) el.value = show[f];
    });
    var openAt = HSC.$('#entries_open_at');
    var closeAt = HSC.$('#entries_close_at');
    var lateAfter = HSC.$('#late_fee_after');
    if (openAt && show.entries_open_at) openAt.value = show.entries_open_at.slice(0, 16);
    if (closeAt && show.entries_close_at) closeAt.value = show.entries_close_at.slice(0, 16);
    if (lateAfter && show.late_fee_after) lateAfter.value = show.late_fee_after.slice(0, 16);
  }

  function bindShowForm(profile, existing) {
    var form = HSC.$('#showForm');
    if (!form) return;
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var fd = new FormData(form);
      var data = Object.fromEntries(fd.entries());
      ['office_fee','drug_fee','usef_fee','stall_fee','haul_in_fee','late_fee_amount','prize_money_total'].forEach(function (k) {
        if (data[k] === '') delete data[k]; else data[k] = Number(data[k]);
      });
      ['entries_open_at','entries_close_at','late_fee_after'].forEach(function (k) {
        if (!data[k]) delete data[k]; else data[k] = new Date(data[k]).toISOString();
      });
      data.manager_id = profile.id;
      if (!data.slug) data.slug = HSC.slugify(data.name + '-' + (data.start_date || '').slice(0,4));

      var r;
      if (existing) {
        r = await supabase.from('shows').update(data).eq('id', existing.id).select().maybeSingle();
      } else {
        r = await supabase.from('shows').insert(data).select().maybeSingle();
      }
      if (r.error) { HSC.toast(r.error.message, 'error'); return; }
      HSC.toast('Show saved.', 'success');
      if (!existing) window.location.href = 'show-edit.html?show=' + r.data.id;
    });

    var del = HSC.$('#deleteShowBtn');
    if (del && existing) {
      del.addEventListener('click', async function () {
        if (!confirm('Delete this show? This cannot be undone.')) return;
        var r = await supabase.from('shows').delete().eq('id', existing.id);
        if (r.error) { HSC.toast(r.error.message, 'error'); return; }
        window.location.href = 'dashboard.html';
      });
    }
  }

  function bindShowTabs(showId) {
    HSC.$$('.sub-tab').forEach(function (t) {
      t.addEventListener('click', function () {
        var name = t.getAttribute('data-tab');
        HSC.$$('.sub-tab').forEach(function (x) { x.classList.toggle('active', x === t); });
        HSC.$$('.sub-panel').forEach(function (p) { p.classList.toggle('active', p.id === 'subpanel-' + name); });
      });
    });
  }

  // ---- Rings ----
  async function loadRings(showId) {
    var r = await supabase.from('rings').select('*').eq('show_id', showId).order('display_order');
    var rings = r.data || [];
    var html = '<div class="table-wrap"><table class="data-table"><thead><tr><th>Order</th><th>Name</th><th>Surface</th><th></th></tr></thead><tbody>' +
      rings.map(function (ring) {
        return '<tr><td>' + ring.display_order + '</td><td>' + HSC.escHtml(ring.name) + '</td><td>' + HSC.escHtml(ring.surface || '') + '</td>' +
          '<td><button class="btn btn-ghost btn-sm" data-ring-del="' + ring.id + '">Delete</button></td></tr>';
      }).join('') + '</tbody></table></div>';
    if (rings.length === 0) html = HSC.emptyState('No rings yet', 'Add the rings/arenas where your show will run.');
    HSC.setHTML(HSC.$('#ringsList'), html);

    HSC.$$('[data-ring-del]').forEach(function (b) {
      b.addEventListener('click', async function () {
        if (!confirm('Delete this ring?')) return;
        await supabase.from('rings').delete().eq('id', b.getAttribute('data-ring-del'));
        loadRings(showId);
      });
    });

    var addBtn = HSC.$('#addRingBtn');
    if (addBtn && !addBtn._bound) {
      addBtn._bound = true;
      addBtn.addEventListener('click', async function () {
        var name = prompt('Ring name (e.g., Main Hunter Ring):');
        if (!name) return;
        var nextOrder = rings.length;
        await supabase.from('rings').insert({ show_id: showId, name: name, display_order: nextOrder });
        loadRings(showId);
      });
    }
  }

  // ---- Divisions ----
  async function loadDivisions(showId) {
    var r = await supabase.from('divisions').select('*').eq('show_id', showId).order('display_order');
    var divs = r.data || [];
    var html = '<div class="table-wrap"><table class="data-table"><thead><tr><th>Name</th><th>Level</th><th>Height</th><th class="num">Prize</th><th></th></tr></thead><tbody>' +
      divs.map(function (d) {
        return '<tr><td>' + HSC.escHtml(d.name) + '</td><td>' + HSC.escHtml(d.level || '') + '</td><td>' + HSC.escHtml(d.height || '') + '</td>' +
          '<td class="num">' + HSC.fmtMoney(d.prize_money) + '</td>' +
          '<td><button class="btn btn-ghost btn-sm" data-div-del="' + d.id + '">Delete</button></td></tr>';
      }).join('') + '</tbody></table></div>';
    if (divs.length === 0) html = HSC.emptyState('No divisions yet', 'Add divisions like "Children\'s Hunters" or "Adult Amateur Jumpers".');
    HSC.setHTML(HSC.$('#divsList'), html);

    HSC.$$('[data-div-del]').forEach(function (b) {
      b.addEventListener('click', async function () {
        if (!confirm('Delete this division?')) return;
        await supabase.from('divisions').delete().eq('id', b.getAttribute('data-div-del'));
        loadDivisions(showId);
      });
    });

    var addBtn = HSC.$('#addDivBtn');
    if (addBtn && !addBtn._bound) {
      addBtn._bound = true;
      addBtn.addEventListener('click', async function () {
        openModal('Add Division',
          '<div class="form-grid">' +
            '<label class="span-2">Name<input name="name" required></label>' +
            '<label>Level<input name="level" placeholder="e.g., Schooling, Recognized"></label>' +
            '<label>Height<input name="height" placeholder="e.g., 2\'6&quot;"></label>' +
            '<label>Age Group<input name="age_group" placeholder="e.g., Children, Adult"></label>' +
            '<label>Rider Type<input name="rider_type" placeholder="e.g., Amateur, Pro"></label>' +
            '<label>Prize Money<input name="prize_money" type="number" step="0.01" value="0"></label>' +
            '<label class="span-2">Champion Award<input name="champion_award"></label>' +
            '<label class="span-2">Reserve Award<input name="reserve_award"></label>' +
          '</div>',
          async function (data) {
            data.show_id = showId;
            data.display_order = divs.length;
            data.prize_money = Number(data.prize_money || 0);
            var rr = await supabase.from('divisions').insert(data);
            if (rr.error) { HSC.toast(rr.error.message, 'error'); return false; }
            HSC.toast('Division added.', 'success');
            loadDivisions(showId);
            return true;
          }
        );
      });
    }
  }

  // ---- Classes ----
  async function loadClasses(showId) {
    var [c, divs, rings] = await Promise.all([
      supabase.from('classes').select('*').eq('show_id', showId).order('schedule_date').order('schedule_order'),
      supabase.from('divisions').select('id,name').eq('show_id', showId),
      supabase.from('rings').select('id,name').eq('show_id', showId)
    ]);
    var classes = c.data || [];
    var divMap = {}; (divs.data || []).forEach(function (d) { divMap[d.id] = d.name; });
    var ringMap = {}; (rings.data || []).forEach(function (r) { ringMap[r.id] = r.name; });

    var html = '<div class="table-wrap"><table class="data-table"><thead><tr><th>#</th><th>Name</th><th>Division</th><th>Ring</th><th>Date / Time</th><th>Format</th><th class="num">Fee</th><th class="num">Prize</th><th></th></tr></thead><tbody>' +
      classes.map(function (cl) {
        return '<tr>' +
          '<td>' + HSC.escHtml(cl.number) + '</td>' +
          '<td>' + HSC.escHtml(cl.name) + '</td>' +
          '<td>' + HSC.escHtml(divMap[cl.division_id] || '—') + '</td>' +
          '<td>' + HSC.escHtml(ringMap[cl.ring_id] || '—') + '</td>' +
          '<td>' + (cl.schedule_date ? HSC.fmtDate(cl.schedule_date) + ' ' + HSC.fmtTime(cl.schedule_time || '') : '—') + '</td>' +
          '<td>' + HSC.escHtml(cl.judging_format) + '</td>' +
          '<td class="num">' + HSC.fmtMoney(cl.fee) + '</td>' +
          '<td class="num">' + HSC.fmtMoney(cl.prize_money) + '</td>' +
          '<td><button class="btn btn-ghost btn-sm" data-cls-edit="' + cl.id + '">Edit</button> <button class="btn btn-ghost btn-sm" data-cls-del="' + cl.id + '">×</button></td>' +
        '</tr>';
      }).join('') + '</tbody></table></div>';
    if (classes.length === 0) html = HSC.emptyState('No classes yet', 'Add classes — these are what exhibitors enter.');
    HSC.setHTML(HSC.$('#classesList'), html);

    HSC.$$('[data-cls-del]').forEach(function (b) {
      b.addEventListener('click', async function () {
        if (!confirm('Delete this class?')) return;
        await supabase.from('classes').delete().eq('id', b.getAttribute('data-cls-del'));
        loadClasses(showId);
      });
    });
    HSC.$$('[data-cls-edit]').forEach(function (b) {
      b.addEventListener('click', function () {
        var cl = classes.find(function (x) { return x.id === b.getAttribute('data-cls-edit'); });
        openClassModal(showId, cl, divs.data || [], rings.data || [], function () { loadClasses(showId); });
      });
    });

    var addBtn = HSC.$('#addClassBtn');
    if (addBtn && !addBtn._bound) {
      addBtn._bound = true;
      addBtn.addEventListener('click', function () {
        openClassModal(showId, null, divs.data || [], rings.data || [], function () { loadClasses(showId); });
      });
    }
  }

  function openClassModal(showId, cls, divs, rings, onDone) {
    var divOpts = '<option value="">— None —</option>' + divs.map(function (d) { return '<option value="' + d.id + '"' + (cls && cls.division_id === d.id ? ' selected' : '') + '>' + HSC.escHtml(d.name) + '</option>'; }).join('');
    var ringOpts = '<option value="">— None —</option>' + rings.map(function (r) { return '<option value="' + r.id + '"' + (cls && cls.ring_id === r.id ? ' selected' : '') + '>' + HSC.escHtml(r.name) + '</option>'; }).join('');
    var formats = ['standard','hunter','jumper_table_a','jumper_table_c','jumper_jumpoff','dressage','derby','medal','eq_flat','eq_over_fences','time_only','points'];
    var fmtOpts = formats.map(function (f) { return '<option value="' + f + '"' + (cls && cls.judging_format === f ? ' selected' : '') + '>' + f + '</option>'; }).join('');

    openModal(cls ? 'Edit Class' : 'Add Class',
      '<div class="form-grid">' +
        '<label>Class Number<input name="number" required value="' + (cls ? HSC.escHtml(cls.number) : '') + '"></label>' +
        '<label>Class Name<input name="name" required value="' + (cls ? HSC.escHtml(cls.name) : '') + '"></label>' +
        '<label>Division<select name="division_id">' + divOpts + '</select></label>' +
        '<label>Ring<select name="ring_id">' + ringOpts + '</select></label>' +
        '<label>Judging Format<select name="judging_format">' + fmtOpts + '</select></label>' +
        '<label>Height<input name="height" value="' + (cls && cls.height ? HSC.escHtml(cls.height) : '') + '"></label>' +
        '<label>Date<input name="schedule_date" type="date" value="' + (cls && cls.schedule_date ? cls.schedule_date : '') + '"></label>' +
        '<label>Time<input name="schedule_time" type="time" value="' + (cls && cls.schedule_time ? cls.schedule_time : '') + '"></label>' +
        '<label>Schedule Order<input name="schedule_order" type="number" value="' + (cls ? cls.schedule_order : 0) + '"></label>' +
        '<label>Estimated Minutes<input name="estimated_minutes" type="number" value="' + (cls && cls.estimated_minutes ? cls.estimated_minutes : 60) + '"></label>' +
        '<label>Entry Fee<input name="fee" type="number" step="0.01" value="' + (cls ? cls.fee : 0) + '"></label>' +
        '<label>Prize Money<input name="prize_money" type="number" step="0.01" value="' + (cls && cls.prize_money ? cls.prize_money : 0) + '"></label>' +
        '<label class="span-2">Description<textarea name="description">' + (cls && cls.description ? HSC.escHtml(cls.description) : '') + '</textarea></label>' +
      '</div>',
      async function (data) {
        ['fee','prize_money','schedule_order','estimated_minutes'].forEach(function (k) { if (data[k] !== '') data[k] = Number(data[k]); else delete data[k]; });
        ['division_id','ring_id','schedule_date','schedule_time','description','height'].forEach(function (k) { if (data[k] === '') data[k] = null; });
        data.show_id = showId;
        var rr = cls
          ? await supabase.from('classes').update(data).eq('id', cls.id)
          : await supabase.from('classes').insert(data);
        if (rr.error) { HSC.toast(rr.error.message, 'error'); return false; }
        HSC.toast('Saved.', 'success');
        onDone();
        return true;
      }
    );
  }

  // ---- Entries (manager view) ----
  async function loadEntries(showId) {
    var r = await supabase.from('entries')
      .select('*, profiles!entries_exhibitor_id_fkey(email, full_name), horses(name, show_name), class_entries(id, status, classes(number, name))')
      .eq('show_id', showId)
      .order('submitted_at', { ascending: false });
    var entries = r.data || [];

    var html = '<div class="table-wrap"><table class="data-table"><thead><tr><th>Back #</th><th>Rider</th><th>Horse</th><th>Trainer</th><th>Classes</th><th>Status</th><th></th></tr></thead><tbody>' +
      entries.map(function (e) {
        var horseName = e.horses ? (e.horses.show_name || e.horses.name) : '';
        var classCount = (e.class_entries || []).filter(function (ce) { return ce.status === 'entered'; }).length;
        return '<tr>' +
          '<td>' + HSC.escHtml(e.back_number || '—') + '</td>' +
          '<td><strong>' + HSC.escHtml(e.rider_name) + '</strong></td>' +
          '<td>' + HSC.escHtml(horseName) + '</td>' +
          '<td>' + HSC.escHtml(e.trainer_name || '') + '</td>' +
          '<td>' + classCount + '</td>' +
          '<td>' + HSC.statusPill(e.status) + '</td>' +
          '<td>' +
            (e.status === 'submitted' ? '<button class="btn btn-primary btn-sm" data-entry-approve="' + e.id + '">Approve</button> ' : '') +
            '<button class="btn btn-ghost btn-sm" data-entry-back="' + e.id + '">Set Back #</button> ' +
            '<button class="btn btn-ghost btn-sm" data-entry-scratch="' + e.id + '">Scratch</button>' +
          '</td>' +
        '</tr>';
      }).join('') + '</tbody></table></div>';
    if (entries.length === 0) html = HSC.emptyState('No entries yet', 'Once exhibitors submit entries, they\'ll show here.');
    HSC.setHTML(HSC.$('#entriesList'), html);

    HSC.$$('[data-entry-approve]').forEach(function (b) {
      b.addEventListener('click', async function () {
        await supabase.from('entries').update({ status: 'approved', approved_at: new Date().toISOString() }).eq('id', b.getAttribute('data-entry-approve'));
        loadEntries(showId);
      });
    });
    HSC.$$('[data-entry-back]').forEach(function (b) {
      b.addEventListener('click', async function () {
        var num = prompt('Back number:');
        if (!num) return;
        await supabase.from('entries').update({ back_number: num }).eq('id', b.getAttribute('data-entry-back'));
        loadEntries(showId);
      });
    });
    HSC.$$('[data-entry-scratch]').forEach(function (b) {
      b.addEventListener('click', async function () {
        if (!confirm('Scratch this entry?')) return;
        await supabase.from('entries').update({ status: 'scratched' }).eq('id', b.getAttribute('data-entry-scratch'));
        loadEntries(showId);
      });
    });
  }

  // ---- Announcements ----
  async function loadAnnouncements(showId) {
    var r = await supabase.from('show_announcements').select('*').eq('show_id', showId).order('created_at', { ascending: false });
    var ann = r.data || [];
    var html = ann.map(function (a) {
      return '<div class="card">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;"><h3>' + HSC.escHtml(a.title) + '</h3>' +
        '<button class="btn btn-ghost btn-sm" data-ann-del="' + a.id + '">Delete</button></div>' +
        '<p style="color:#6B7280;font-size:.85rem;">' + new Date(a.created_at).toLocaleString() + ' • ' + a.priority + '</p>' +
        '<p style="white-space:pre-wrap;">' + HSC.escHtml(a.body) + '</p>' +
      '</div>';
    }).join('');
    if (ann.length === 0) html = HSC.emptyState('No announcements', 'Post weather updates, schedule changes, or anything else exhibitors should see.');
    HSC.setHTML(HSC.$('#announcementsList'), html);

    HSC.$$('[data-ann-del]').forEach(function (b) {
      b.addEventListener('click', async function () {
        await supabase.from('show_announcements').delete().eq('id', b.getAttribute('data-ann-del'));
        loadAnnouncements(showId);
      });
    });

    var addBtn = HSC.$('#addAnnBtn');
    if (addBtn && !addBtn._bound) {
      addBtn._bound = true;
      addBtn.addEventListener('click', function () {
        openModal('Post Announcement',
          '<div class="form-grid">' +
            '<label class="span-2">Title<input name="title" required></label>' +
            '<label class="span-2">Body<textarea name="body" required></textarea></label>' +
            '<label>Priority<select name="priority"><option>normal</option><option>important</option><option>urgent</option></select></label>' +
          '</div>',
          async function (data) {
            data.show_id = showId;
            var u = await HSC.getUser();
            data.author_id = u ? u.id : null;
            var rr = await supabase.from('show_announcements').insert(data);
            if (rr.error) { HSC.toast(rr.error.message, 'error'); return false; }
            HSC.toast('Posted.', 'success');
            loadAnnouncements(showId);
            return true;
          }
        );
      });
    }
  }

  // ---- Financials summary ----
  async function loadFinancials(showId) {
    var [iR, pR] = await Promise.all([
      supabase.from('invoices').select('*, profiles!invoices_exhibitor_id_fkey(full_name, email)').eq('show_id', showId),
      supabase.from('payments').select('amount, method, invoices!inner(show_id)').eq('invoices.show_id', showId)
    ]);
    var invoices = iR.data || [];
    var totalCharged = invoices.reduce(function (a, b) { return a + Number(b.total || 0); }, 0);
    var totalPaid = invoices.reduce(function (a, b) { return a + Number(b.amount_paid || 0); }, 0);
    var balance = totalCharged - totalPaid;
    var totalPrize = invoices.reduce(function (a, b) { return a + Number(b.prize_money_credit || 0); }, 0);

    var stats = statCard('Charged', HSC.fmtMoney(totalCharged)) +
                statCard('Collected', HSC.fmtMoney(totalPaid), totalPaid > 0 ? 'accent' : '') +
                statCard('Balance Due', HSC.fmtMoney(balance), balance > 0 ? 'warn' : '') +
                statCard('Prize Money Credited', HSC.fmtMoney(totalPrize));
    HSC.setHTML(HSC.$('#financeStats'), stats);

    var html = '<div class="table-wrap"><table class="data-table"><thead><tr><th>Exhibitor</th><th class="num">Total</th><th class="num">Paid</th><th class="num">Balance</th><th>Status</th></tr></thead><tbody>' +
      invoices.map(function (i) {
        var name = i.profiles ? (i.profiles.full_name || i.profiles.email) : '—';
        return '<tr>' +
          '<td>' + HSC.escHtml(name) + '</td>' +
          '<td class="num">' + HSC.fmtMoney(i.total) + '</td>' +
          '<td class="num">' + HSC.fmtMoney(i.amount_paid) + '</td>' +
          '<td class="num">' + HSC.fmtMoney(i.balance) + '</td>' +
          '<td>' + HSC.statusPill(i.status) + '</td>' +
        '</tr>';
      }).join('') + '</tbody></table></div>';
    if (invoices.length === 0) html = HSC.emptyState('No invoices yet', 'Invoices are auto-generated when entries are submitted.');
    HSC.setHTML(HSC.$('#financeList'), html);

    var exportBtn = HSC.$('#exportFinanceBtn');
    if (exportBtn && !exportBtn._bound) {
      exportBtn._bound = true;
      exportBtn.addEventListener('click', function () {
        var rows = [['Exhibitor', 'Email', 'Total', 'Paid', 'Balance', 'Status']];
        invoices.forEach(function (i) {
          rows.push([
            (i.profiles && i.profiles.full_name) || '',
            (i.profiles && i.profiles.email) || '',
            i.total, i.amount_paid, i.balance, i.status
          ]);
        });
        downloadCsv('financials-' + showId + '.csv', rows);
      });
    }
  }

  // ---- Modal helper ----
  window._openModal = openModal;
  function openModal(title, bodyHtml, onSubmit) {
    var bd = document.getElementById('modalBackdrop');
    if (!bd) {
      bd = document.createElement('div');
      bd.id = 'modalBackdrop';
      bd.className = 'modal-backdrop';
      bd.innerHTML = '<div class="modal"><div class="modal-head"><h3 id="modalTitle"></h3><button class="modal-close" type="button">×</button></div><form id="modalForm"><div class="modal-body" id="modalBody"></div><div class="modal-foot"><button type="button" class="btn btn-ghost" id="modalCancel">Cancel</button><button type="submit" class="btn btn-primary" id="modalSave">Save</button></div></form></div>';
      document.body.appendChild(bd);
      bd.querySelector('.modal-close').addEventListener('click', closeModal);
      document.getElementById('modalCancel').addEventListener('click', closeModal);
      bd.addEventListener('click', function (e) { if (e.target === bd) closeModal(); });
    }
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = bodyHtml;
    var form = document.getElementById('modalForm');
    form.onsubmit = async function (e) {
      e.preventDefault();
      var fd = new FormData(form);
      var data = Object.fromEntries(fd.entries());
      var ok = await onSubmit(data);
      if (ok) closeModal();
    };
    bd.classList.add('show');
  }
  function closeModal() {
    var bd = document.getElementById('modalBackdrop');
    if (bd) bd.classList.remove('show');
  }

  // ---- helpers ----
  function statCard(label, value, mod) {
    return '<div class="stat-card ' + (mod || '') + '"><div class="label">' + label + '</div><div class="value">' + value + '</div></div>';
  }

  function downloadCsv(filename, rows) {
    var csv = rows.map(function (r) {
      return r.map(function (v) {
        v = String(v == null ? '' : v).replace(/"/g, '""');
        return /[",\n]/.test(v) ? '"' + v + '"' : v;
      }).join(',');
    }).join('\n');
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 100);
  }
})();
