/* ===================================================================
   HorseShowCalendar — Exhibitor Portal Logic
   ================================================================== */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', boot);

  async function boot() {
    HSC.initMobileNav();
    var profile = await HSC.requireRole(['exhibitor', 'manager', 'admin'], '../login.html');
    if (!profile) return;

    var lo = document.getElementById('logoutBtn');
    if (lo) lo.addEventListener('click', function () { HSC.logout(); });
    var user = document.getElementById('userName');
    if (user) user.textContent = profile.full_name || profile.email;

    var page = window.PAGE || 'dashboard';
    var fn = window['ex_' + page];
    if (typeof fn === 'function') fn(profile);
  }

  // ---------- DASHBOARD ----------
  window.ex_dashboard = async function (profile) {
    var [eR, hR] = await Promise.all([
      supabase.from('entries').select('*, shows(name, start_date, end_date, city, state, status), horses(name, show_name)').eq('exhibitor_id', profile.id).order('created_at', { ascending: false }),
      supabase.from('horses').select('id', { count: 'exact', head: true }).eq('owner_id', profile.id)
    ]);
    var entries = eR.data || [];
    var horseCount = hR.count || 0;

    var openInvoices = await supabase.from('invoices').select('balance').eq('exhibitor_id', profile.id).gt('balance', 0);
    var owed = (openInvoices.data || []).reduce(function (a, b) { return a + Number(b.balance || 0); }, 0);

    var upcoming = entries.filter(function (e) {
      return e.shows && new Date(e.shows.end_date) >= new Date() && e.status !== 'scratched' && e.status !== 'cancelled';
    });

    HSC.setHTML(HSC.$('#statGrid'),
      sc('Active Entries', upcoming.length, 'accent') +
      sc('Total Entries', entries.length) +
      sc('Horses on File', horseCount) +
      sc('Balance Due', HSC.fmtMoney(owed), owed > 0 ? 'warn' : '')
    );

    var html;
    if (entries.length === 0) {
      html = HSC.emptyState('No entries yet', 'Browse the calendar and enter your first show.', '<a href="../index.html" class="btn btn-primary">Browse Shows</a>');
    } else {
      html = '<div class="table-wrap"><table class="data-table"><thead><tr><th>Show</th><th>Dates</th><th>Horse</th><th>Rider</th><th>Status</th><th></th></tr></thead><tbody>' +
        entries.map(function (e) {
          var horseName = e.horses ? (e.horses.show_name || e.horses.name) : '—';
          return '<tr>' +
            '<td><strong>' + HSC.escHtml(e.shows ? e.shows.name : '') + '</strong></td>' +
            '<td>' + (e.shows ? HSC.fmtDateRange(e.shows.start_date, e.shows.end_date) : '') + '</td>' +
            '<td>' + HSC.escHtml(horseName) + '</td>' +
            '<td>' + HSC.escHtml(e.rider_name) + '</td>' +
            '<td>' + HSC.statusPill(e.status) + '</td>' +
            '<td><a href="my-entry.html?entry=' + e.id + '" class="btn btn-ghost btn-sm">View</a></td>' +
          '</tr>';
        }).join('') + '</tbody></table></div>';
    }
    HSC.setHTML(HSC.$('#entriesList'), html);
  };

  // ---------- HORSES ----------
  window.ex_horses = async function (profile) {
    await renderHorses(profile);

    HSC.$('#addHorseBtn').addEventListener('click', function () {
      openHorseModal(null, profile, function () { renderHorses(profile); });
    });
  };

  async function renderHorses(profile) {
    var r = await supabase.from('horses').select('*').eq('owner_id', profile.id).order('name');
    var horses = r.data || [];
    if (horses.length === 0) {
      HSC.setHTML(HSC.$('#horsesList'), HSC.emptyState('No horses yet', 'Add your horses so you can enter shows quickly later.'));
      return;
    }
    var html = '<div class="card-grid">' + horses.map(function (h) {
      return '<div class="card">' +
        '<h3>' + HSC.escHtml(h.show_name || h.name) + '</h3>' +
        (h.show_name && h.show_name !== h.name ? '<p style="color:#6B7280;">Barn name: ' + HSC.escHtml(h.name) + '</p>' : '') +
        '<table class="data-table" style="font-size:.9rem;">' +
          (h.breed ? '<tr><th>Breed</th><td>' + HSC.escHtml(h.breed) + '</td></tr>' : '') +
          (h.color ? '<tr><th>Color</th><td>' + HSC.escHtml(h.color) + '</td></tr>' : '') +
          (h.sex ? '<tr><th>Sex</th><td>' + HSC.escHtml(h.sex) + '</td></tr>' : '') +
          (h.year_of_birth ? '<tr><th>YOB</th><td>' + h.year_of_birth + '</td></tr>' : '') +
          (h.height ? '<tr><th>Height</th><td>' + HSC.escHtml(h.height) + '</td></tr>' : '') +
          (h.usef_number ? '<tr><th>USEF #</th><td>' + HSC.escHtml(h.usef_number) + '</td></tr>' : '') +
          (h.coggins_date ? '<tr><th>Coggins</th><td>' + HSC.fmtDate(h.coggins_date) + '</td></tr>' : '') +
        '</table>' +
        '<div style="margin-top:10px;display:flex;gap:6px;">' +
          '<button class="btn btn-ghost btn-sm" data-horse-edit="' + h.id + '">Edit</button>' +
          '<button class="btn btn-ghost btn-sm" data-horse-del="' + h.id + '">Delete</button>' +
        '</div>' +
      '</div>';
    }).join('') + '</div>';
    HSC.setHTML(HSC.$('#horsesList'), html);

    HSC.$$('[data-horse-edit]').forEach(function (b) {
      b.addEventListener('click', function () {
        var h = horses.find(function (x) { return x.id === b.getAttribute('data-horse-edit'); });
        openHorseModal(h, profile, function () { renderHorses(profile); });
      });
    });
    HSC.$$('[data-horse-del]').forEach(function (b) {
      b.addEventListener('click', async function () {
        if (!confirm('Delete this horse?')) return;
        await supabase.from('horses').delete().eq('id', b.getAttribute('data-horse-del'));
        renderHorses(profile);
      });
    });
  }

  function openHorseModal(h, profile, onDone) {
    var sexes = ['', 'mare', 'gelding', 'stallion', 'colt', 'filly'];
    var sexOpts = sexes.map(function (s) { return '<option value="' + s + '"' + (h && h.sex === s ? ' selected' : '') + '>' + (s || '—') + '</option>'; }).join('');
    _openModal(h ? 'Edit Horse' : 'Add Horse',
      '<div class="form-grid">' +
        '<label>Barn Name<input name="name" required value="' + (h ? HSC.escHtml(h.name) : '') + '"></label>' +
        '<label>Show Name<input name="show_name" value="' + (h && h.show_name ? HSC.escHtml(h.show_name) : '') + '"></label>' +
        '<label>Breed<input name="breed" value="' + (h && h.breed ? HSC.escHtml(h.breed) : '') + '"></label>' +
        '<label>Color<input name="color" value="' + (h && h.color ? HSC.escHtml(h.color) : '') + '"></label>' +
        '<label>Sex<select name="sex">' + sexOpts + '</select></label>' +
        '<label>Year of Birth<input name="year_of_birth" type="number" value="' + (h && h.year_of_birth ? h.year_of_birth : '') + '"></label>' +
        '<label>Height<input name="height" placeholder="e.g., 16.2 hh" value="' + (h && h.height ? HSC.escHtml(h.height) : '') + '"></label>' +
        '<label>USEF Number<input name="usef_number" value="' + (h && h.usef_number ? HSC.escHtml(h.usef_number) : '') + '"></label>' +
        '<label>USHJA Number<input name="ushja_number" value="' + (h && h.ushja_number ? HSC.escHtml(h.ushja_number) : '') + '"></label>' +
        '<label>Microchip<input name="microchip" value="' + (h && h.microchip ? HSC.escHtml(h.microchip) : '') + '"></label>' +
        '<label>Coggins Date<input name="coggins_date" type="date" value="' + (h && h.coggins_date ? h.coggins_date : '') + '"></label>' +
        '<label>Coggins Number<input name="coggins_number" value="' + (h && h.coggins_number ? HSC.escHtml(h.coggins_number) : '') + '"></label>' +
        '<label class="span-2">Notes<textarea name="notes">' + (h && h.notes ? HSC.escHtml(h.notes) : '') + '</textarea></label>' +
      '</div>',
      async function (data) {
        if (data.year_of_birth === '') delete data.year_of_birth; else data.year_of_birth = Number(data.year_of_birth);
        if (data.coggins_date === '') data.coggins_date = null;
        if (data.sex === '') data.sex = null;
        if (data.show_name === '') data.show_name = data.name;
        data.owner_id = profile.id;
        var rr = h
          ? await supabase.from('horses').update(data).eq('id', h.id)
          : await supabase.from('horses').insert(data);
        if (rr.error) { HSC.toast(rr.error.message, 'error'); return false; }
        HSC.toast('Saved.', 'success');
        onDone();
        return true;
      }
    );
  }

  // ---------- ENTER SHOW ----------
  window.ex_enterShow = async function (profile) {
    var showId = HSC.qs('show');
    if (!showId) { HSC.toast('No show specified.', 'error'); return; }

    var [sR, dR, cR, hR] = await Promise.all([
      supabase.from('shows').select('*').eq('id', showId).maybeSingle(),
      supabase.from('divisions').select('*').eq('show_id', showId).order('display_order'),
      supabase.from('classes').select('*').eq('show_id', showId).order('schedule_date').order('schedule_order'),
      supabase.from('horses').select('*').eq('owner_id', profile.id).order('name')
    ]);

    if (!sR.data) { HSC.toast('Show not found.', 'error'); return; }
    var show = sR.data;
    var divisions = dR.data || [];
    var classes = cR.data || [];
    var horses = hR.data || [];

    if (show.status !== 'open') {
      HSC.setHTML(HSC.$('#enterRoot'), '<div class="card"><h2>Entries are not currently open</h2><p>Show status: ' + HSC.statusPill(show.status) + '</p></div>');
      return;
    }

    var horseOpts = horses.length === 0
      ? '<option value="">— Add a horse first —</option>'
      : horses.map(function (h) { return '<option value="' + h.id + '">' + HSC.escHtml(h.show_name || h.name) + '</option>'; }).join('');

    var divHtml = divisions.length
      ? divisions.map(function (d) {
          var dClasses = classes.filter(function (cl) { return cl.division_id === d.id; });
          return '<div class="card"><h3>' + HSC.escHtml(d.name) + '</h3>' +
            (d.description ? '<p style="color:#6B7280;">' + HSC.escHtml(d.description) + '</p>' : '') +
            classListHtml(dClasses) +
          '</div>';
        }).join('')
      : '';
    var unassigned = classes.filter(function (cl) { return !cl.division_id; });
    if (unassigned.length) divHtml += '<div class="card"><h3>Other Classes</h3>' + classListHtml(unassigned) + '</div>';

    HSC.setHTML(HSC.$('#enterRoot'),
      '<div class="card">' +
        '<h2>' + HSC.escHtml(show.name) + '</h2>' +
        '<p>' + HSC.fmtDateRange(show.start_date, show.end_date) + (show.city ? ' • ' + HSC.escHtml(show.city) + ', ' + HSC.escHtml(show.state || '') : '') + '</p>' +
      '</div>' +
      '<form id="entryForm">' +
        '<div class="card"><h3>Rider &amp; Horse</h3>' +
          '<div class="form-grid">' +
            '<label>Horse<select name="horse_id" required>' + horseOpts + '</select></label>' +
            '<label>Rider Name<input name="rider_name" required value="' + HSC.escHtml(profile.full_name || '') + '"></label>' +
            '<label>Rider USEF #<input name="rider_usef" value="' + HSC.escHtml(profile.usef_number || '') + '"></label>' +
            '<label>Trainer Name<input name="trainer_name"></label>' +
            '<label>Trainer USEF #<input name="trainer_usef"></label>' +
            '<label>Owner Name<input name="owner_name" value="' + HSC.escHtml(profile.full_name || '') + '"></label>' +
            '<label class="span-2">Notes / Special Requests<textarea name="notes"></textarea></label>' +
          '</div>' +
        '</div>' +
        '<div class="card"><h3>Select Classes</h3>' +
          (classes.length === 0 ? '<p>No classes have been published yet.</p>' : divHtml) +
        '</div>' +
        '<div class="card"><h3>Acknowledgments</h3>' +
          '<label style="display:block;"><input type="checkbox" name="liability_signed" required> I agree to the show\'s liability waiver and rules.</label>' +
          '<label style="display:block;margin-top:8px;"><input type="checkbox" name="coggins_verified" required> I confirm my horse has a current negative Coggins.</label>' +
          '<label style="display:block;margin-top:8px;"><input type="checkbox" name="health_cert_verified"> I have a current health certificate (if required).</label>' +
        '</div>' +
        '<div class="card" id="costSummary"></div>' +
        '<div class="form-actions"><button type="submit" class="btn btn-primary">Submit Entry</button></div>' +
      '</form>'
    );

    function classListHtml(arr) {
      return '<div class="table-wrap"><table class="data-table"><thead><tr><th></th><th>#</th><th>Class</th><th>Height</th><th class="num">Fee</th></tr></thead><tbody>' +
        arr.map(function (cl) {
          return '<tr>' +
            '<td><input type="checkbox" name="class_ids" value="' + cl.id + '" data-fee="' + (cl.fee || 0) + '"></td>' +
            '<td>' + HSC.escHtml(cl.number) + '</td>' +
            '<td>' + HSC.escHtml(cl.name) + '</td>' +
            '<td>' + HSC.escHtml(cl.height || '') + '</td>' +
            '<td class="num">' + HSC.fmtMoney(cl.fee) + '</td>' +
          '</tr>';
        }).join('') + '</tbody></table></div>';
    }

    function recalcCost() {
      var checked = document.querySelectorAll('[name="class_ids"]:checked');
      var classFees = 0;
      checked.forEach(function (cb) { classFees += Number(cb.getAttribute('data-fee') || 0); });
      var officeFee = Number(show.office_fee || 0);
      var drugFee = Number(show.drug_fee || 0);
      var usefFee = Number(show.usef_fee || 0);
      var late = show.late_fee_after && new Date() > new Date(show.late_fee_after) ? Number(show.late_fee_amount || 0) : 0;
      var total = classFees + officeFee + drugFee + usefFee + late;
      HSC.setHTML(HSC.$('#costSummary'),
        '<h3>Estimated Cost</h3>' +
        '<table class="data-table">' +
          '<tr><td>Classes (' + checked.length + ')</td><td class="num">' + HSC.fmtMoney(classFees) + '</td></tr>' +
          (officeFee > 0 ? '<tr><td>Office Fee</td><td class="num">' + HSC.fmtMoney(officeFee) + '</td></tr>' : '') +
          (drugFee > 0 ? '<tr><td>Drug Fee</td><td class="num">' + HSC.fmtMoney(drugFee) + '</td></tr>' : '') +
          (usefFee > 0 ? '<tr><td>USEF Fee</td><td class="num">' + HSC.fmtMoney(usefFee) + '</td></tr>' : '') +
          (late > 0 ? '<tr><td>Late Fee</td><td class="num">' + HSC.fmtMoney(late) + '</td></tr>' : '') +
          '<tr style="font-weight:700;"><td>Total Due</td><td class="num">' + HSC.fmtMoney(total) + '</td></tr>' +
        '</table>'
      );
    }

    document.getElementById('entryForm').addEventListener('change', recalcCost);
    recalcCost();

    document.getElementById('entryForm').addEventListener('submit', async function (e) {
      e.preventDefault();
      var fd = new FormData(this);
      var classIds = fd.getAll('class_ids');
      if (classIds.length === 0) { HSC.toast('Pick at least one class.', 'error'); return; }
      if (!fd.get('horse_id')) { HSC.toast('Pick a horse (or add one in My Horses).', 'error'); return; }

      var entryData = {
        show_id: show.id,
        exhibitor_id: profile.id,
        horse_id: fd.get('horse_id'),
        rider_name: fd.get('rider_name'),
        rider_usef: fd.get('rider_usef') || null,
        trainer_name: fd.get('trainer_name') || null,
        trainer_usef: fd.get('trainer_usef') || null,
        owner_name: fd.get('owner_name') || null,
        notes: fd.get('notes') || null,
        liability_signed: !!fd.get('liability_signed'),
        coggins_verified: !!fd.get('coggins_verified'),
        health_cert_verified: !!fd.get('health_cert_verified'),
        status: 'submitted'
      };

      var eR = await supabase.from('entries').insert(entryData).select().maybeSingle();
      if (eR.error) { HSC.toast(eR.error.message, 'error'); return; }
      var entryId = eR.data.id;

      var feeMap = {};
      classes.forEach(function (cl) { feeMap[cl.id] = Number(cl.fee || 0); });
      var ceRows = classIds.map(function (id) { return { entry_id: entryId, class_id: id, fee_charged: feeMap[id] || 0 }; });
      await supabase.from('class_entries').insert(ceRows);

      // Create invoice + line items
      var inv = await supabase.from('invoices').insert({
        show_id: show.id, entry_id: entryId, exhibitor_id: profile.id, invoice_number: 'INV-' + Date.now()
      }).select().maybeSingle();

      if (inv.data) {
        var items = [];
        classIds.forEach(function (cid) {
          var cl = classes.find(function (x) { return x.id === cid; });
          if (cl && Number(cl.fee || 0) > 0) {
            items.push({ invoice_id: inv.data.id, description: cl.number + ' — ' + cl.name, category: 'class_fee', qty: 1, unit_price: cl.fee, amount: cl.fee, reference_id: cl.id });
          }
        });
        if (Number(show.office_fee || 0) > 0) items.push({ invoice_id: inv.data.id, description: 'Office Fee', category: 'office_fee', qty: 1, unit_price: show.office_fee, amount: show.office_fee });
        if (Number(show.drug_fee || 0) > 0) items.push({ invoice_id: inv.data.id, description: 'Drug & Medications Fee', category: 'drug_fee', qty: 1, unit_price: show.drug_fee, amount: show.drug_fee });
        if (Number(show.usef_fee || 0) > 0) items.push({ invoice_id: inv.data.id, description: 'USEF Fee', category: 'usef_fee', qty: 1, unit_price: show.usef_fee, amount: show.usef_fee });
        if (show.late_fee_after && new Date() > new Date(show.late_fee_after) && Number(show.late_fee_amount || 0) > 0) {
          items.push({ invoice_id: inv.data.id, description: 'Late Entry Fee', category: 'late_fee', qty: 1, unit_price: show.late_fee_amount, amount: show.late_fee_amount });
        }
        if (items.length) await supabase.from('invoice_items').insert(items);
      }

      HSC.toast('Entry submitted!', 'success');
      window.location.href = 'my-entry.html?entry=' + entryId;
    });
  };

  // ---------- MY ENTRY DETAIL ----------
  window.ex_myEntry = async function (profile) {
    var entryId = HSC.qs('entry');
    if (!entryId) { HSC.toast('No entry specified.', 'error'); return; }

    var r = await supabase.from('entries')
      .select('*, shows(*), horses(*), class_entries(*, classes(*)), invoices(*, invoice_items(*), payments(*))')
      .eq('id', entryId).maybeSingle();
    if (!r.data) { HSC.toast('Entry not found.', 'error'); return; }

    var e = r.data;
    var show = e.shows;
    var horse = e.horses;
    var ces = e.class_entries || [];
    var invoice = (e.invoices || [])[0];

    var html =
      '<div class="card">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">' +
          '<div><h2>' + HSC.escHtml(show.name) + '</h2><p style="color:#6B7280;">' + HSC.fmtDateRange(show.start_date, show.end_date) + '</p></div>' +
          '<div>' + HSC.statusPill(e.status) + (e.back_number ? ' <span class="pill pill-blue">Back # ' + HSC.escHtml(e.back_number) + '</span>' : '') + '</div>' +
        '</div>' +
        '<table class="data-table" style="margin-top:14px;">' +
          '<tr><th>Horse</th><td>' + HSC.escHtml(horse ? (horse.show_name || horse.name) : '—') + '</td></tr>' +
          '<tr><th>Rider</th><td>' + HSC.escHtml(e.rider_name) + '</td></tr>' +
          (e.trainer_name ? '<tr><th>Trainer</th><td>' + HSC.escHtml(e.trainer_name) + '</td></tr>' : '') +
        '</table>' +
      '</div>' +

      '<div class="card"><h3>Classes</h3>' +
        '<div class="table-wrap"><table class="data-table"><thead><tr><th>#</th><th>Class</th><th>Status</th><th class="num">Fee</th><th></th></tr></thead><tbody>' +
        ces.map(function (ce) {
          var cl = ce.classes;
          return '<tr><td>' + HSC.escHtml(cl.number) + '</td><td>' + HSC.escHtml(cl.name) + '</td><td>' + HSC.statusPill(ce.status) + '</td><td class="num">' + HSC.fmtMoney(ce.fee_charged) + '</td>' +
            '<td>' + (ce.status === 'entered' ? '<button class="btn btn-ghost btn-sm" data-scratch="' + ce.id + '">Scratch</button>' : '') + '</td></tr>';
        }).join('') +
        '</tbody></table></div>' +
        (show.status === 'open' ? '<button class="btn btn-ghost btn-sm" id="addClassBtn" style="margin-top:10px;">+ Add Class</button>' : '') +
      '</div>';

    if (invoice) {
      var items = invoice.invoice_items || [];
      var pays = invoice.payments || [];
      html += '<div class="card"><h3>Invoice ' + HSC.escHtml(invoice.invoice_number || '') + '</h3>' +
        '<div class="table-wrap"><table class="data-table"><thead><tr><th>Item</th><th class="num">Qty</th><th class="num">Unit</th><th class="num">Amount</th></tr></thead><tbody>' +
        items.map(function (i) {
          return '<tr><td>' + HSC.escHtml(i.description) + '</td><td class="num">' + i.qty + '</td><td class="num">' + HSC.fmtMoney(i.unit_price) + '</td><td class="num">' + HSC.fmtMoney(i.amount) + '</td></tr>';
        }).join('') +
        '<tr style="font-weight:700;"><td colspan="3">Total</td><td class="num">' + HSC.fmtMoney(invoice.total) + '</td></tr>' +
        '<tr><td colspan="3">Paid</td><td class="num">' + HSC.fmtMoney(invoice.amount_paid) + '</td></tr>' +
        '<tr style="font-weight:700;color:#991B1B;"><td colspan="3">Balance</td><td class="num">' + HSC.fmtMoney(invoice.balance) + '</td></tr>' +
        '</tbody></table></div>' +
        (Number(invoice.balance) > 0
          ? '<div style="margin-top:10px;display:flex;gap:10px;flex-wrap:wrap;">' +
              '<button class="btn btn-primary btn-sm" id="payOnsiteBtn">Mark Paid On-Site</button>' +
              (typeof STRIPE_PUBLISHABLE_KEY !== 'undefined' && STRIPE_PUBLISHABLE_KEY ? '<button class="btn btn-primary btn-sm" id="payStripeBtn">Pay with Card (Stripe)</button>' : '<span style="color:#6B7280;font-size:.85rem;">Online card payment available once Stripe is configured.</span>') +
            '</div>'
          : '') +
      '</div>';
    }

    HSC.setHTML(HSC.$('#entryRoot'), html);

    HSC.$$('[data-scratch]').forEach(function (b) {
      b.addEventListener('click', async function () {
        if (!confirm('Scratch this class? Show staff may still need to approve fee adjustments.')) return;
        await supabase.from('class_entries').update({ status: 'scratched' }).eq('id', b.getAttribute('data-scratch'));
        ex_myEntry(profile);
      });
    });

    var payBtn = HSC.$('#payOnsiteBtn');
    if (payBtn) {
      payBtn.addEventListener('click', async function () {
        if (!confirm('This records a manual payment of the full balance (cash/check). Show staff still needs to verify.')) return;
        await supabase.from('payments').insert({ invoice_id: invoice.id, amount: invoice.balance, method: 'check', notes: 'Self-recorded by exhibitor' });
        ex_myEntry(profile);
      });
    }

    var stripeBtn = HSC.$('#payStripeBtn');
    if (stripeBtn) {
      stripeBtn.addEventListener('click', function () {
        HSC.toast('Stripe checkout requires a serverless function. See README.md for setup.', 'info');
      });
    }
  };

  // ---------- BILLING ----------
  window.ex_billing = async function (profile) {
    var r = await supabase.from('invoices').select('*, shows(name, start_date)').eq('exhibitor_id', profile.id).order('created_at', { ascending: false });
    var inv = r.data || [];
    if (inv.length === 0) {
      HSC.setHTML(HSC.$('#billingList'), HSC.emptyState('No invoices', 'Once you submit an entry, your invoice will appear here.'));
      return;
    }
    var html = '<div class="table-wrap"><table class="data-table"><thead><tr><th>Show</th><th>Invoice</th><th class="num">Total</th><th class="num">Paid</th><th class="num">Balance</th><th>Status</th><th></th></tr></thead><tbody>' +
      inv.map(function (i) {
        return '<tr>' +
          '<td>' + HSC.escHtml(i.shows ? i.shows.name : '') + '</td>' +
          '<td>' + HSC.escHtml(i.invoice_number || '') + '</td>' +
          '<td class="num">' + HSC.fmtMoney(i.total) + '</td>' +
          '<td class="num">' + HSC.fmtMoney(i.amount_paid) + '</td>' +
          '<td class="num">' + HSC.fmtMoney(i.balance) + '</td>' +
          '<td>' + HSC.statusPill(i.status) + '</td>' +
          '<td><a href="my-entry.html?entry=' + i.entry_id + '" class="btn btn-ghost btn-sm">View</a></td>' +
        '</tr>';
      }).join('') + '</tbody></table></div>';
    HSC.setHTML(HSC.$('#billingList'), html);
  };

  // ---------- SCHEDULE ACROSS ALL ENTRIES ----------
  window.ex_schedule = async function (profile) {
    var r = await supabase.from('class_entries')
      .select('*, classes(*, shows(name)), entries!inner(exhibitor_id, status, back_number)')
      .eq('entries.exhibitor_id', profile.id)
      .neq('status', 'scratched')
      .order('classes(schedule_date)', { ascending: true });
    var rows = (r.data || []).filter(function (ce) { return ce.classes && ce.classes.schedule_date; });

    if (rows.length === 0) {
      HSC.setHTML(HSC.$('#scheduleRoot'), HSC.emptyState('Nothing scheduled', 'Once your classes have schedule times, they\'ll appear here.'));
      return;
    }

    var byDay = {};
    rows.forEach(function (ce) {
      var k = ce.classes.shows.name + '|' + ce.classes.schedule_date;
      (byDay[k] = byDay[k] || []).push(ce);
    });

    var html = '';
    Object.keys(byDay).sort().forEach(function (k) {
      var parts = k.split('|');
      html += '<div class="schedule-day"><h3>' + HSC.escHtml(parts[0]) + ' — ' + HSC.fmtDate(parts[1]) + '</h3>';
      byDay[k].sort(function (a, b) { return (a.classes.schedule_time || '') > (b.classes.schedule_time || '') ? 1 : -1; }).forEach(function (ce) {
        html += '<div class="schedule-row">' +
          '<div class="time">' + HSC.fmtTime(ce.classes.schedule_time || '') + '</div>' +
          '<div>' + HSC.escHtml(ce.classes.number) + '</div>' +
          '<div>' + HSC.escHtml(ce.classes.name) + '</div>' +
          '<div>' + HSC.statusPill(ce.classes.status) + '</div>' +
          '<div>' + (ce.entries.back_number ? 'Back # ' + ce.entries.back_number : '') + '</div>' +
        '</div>';
      });
      html += '</div>';
    });
    HSC.setHTML(HSC.$('#scheduleRoot'), html);
  };

  function sc(label, value, mod) {
    return '<div class="stat-card ' + (mod || '') + '"><div class="label">' + label + '</div><div class="value">' + value + '</div></div>';
  }

  // ---------- Modal helper ----------
  window._openModal = function (title, bodyHtml, onSubmit) {
    var bd = document.getElementById('modalBackdrop');
    if (!bd) {
      bd = document.createElement('div');
      bd.id = 'modalBackdrop';
      bd.className = 'modal-backdrop';
      bd.innerHTML = '<div class="modal"><div class="modal-head"><h3 id="modalTitle"></h3><button class="modal-close" type="button">×</button></div><form id="modalForm"><div class="modal-body" id="modalBody"></div><div class="modal-foot"><button type="button" class="btn btn-ghost" id="modalCancel">Cancel</button><button type="submit" class="btn btn-primary">Save</button></div></form></div>';
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
  };
  function closeModal() { var bd = document.getElementById('modalBackdrop'); if (bd) bd.classList.remove('show'); }
})();
