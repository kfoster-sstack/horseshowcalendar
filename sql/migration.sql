-- ============================================================
-- HorseShowCalendar — Show Management Platform
-- Comprehensive multi-tenant schema with RLS
-- Run in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- ============================================================
-- 1. PROFILES & ROLES
-- ============================================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'exhibitor' CHECK (role IN ('exhibitor', 'manager', 'judge', 'admin')),
  usef_number TEXT,
  ushja_number TEXT,
  fei_number TEXT,
  barn_name TEXT,
  street TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_profiles_role ON profiles(role);

-- ============================================================
-- 2. SHOWS (top-level container)
-- ============================================================

CREATE TABLE shows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  discipline TEXT NOT NULL,
  region TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  venue_name TEXT,
  venue_address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  description TEXT,
  website TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  prize_money_total NUMERIC(12,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'closed', 'live', 'completed', 'cancelled')),
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'private', 'unlisted')),
  entries_open_at TIMESTAMPTZ,
  entries_close_at TIMESTAMPTZ,
  late_fee_after TIMESTAMPTZ,
  late_fee_amount NUMERIC(10,2) DEFAULT 0,
  office_fee NUMERIC(10,2) DEFAULT 0,
  drug_fee NUMERIC(10,2) DEFAULT 0,
  usef_fee NUMERIC(10,2) DEFAULT 0,
  stall_fee NUMERIC(10,2) DEFAULT 0,
  haul_in_fee NUMERIC(10,2) DEFAULT 0,
  show_template_id UUID,
  banner_url TEXT,
  prize_list_url TEXT,
  usef_competition_id TEXT,
  ushja_competition_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_shows_manager ON shows(manager_id);
CREATE INDEX idx_shows_status ON shows(status);
CREATE INDEX idx_shows_dates ON shows(start_date, end_date);
CREATE INDEX idx_shows_discipline ON shows(discipline);

-- ============================================================
-- 3. RINGS (physical arenas/spaces in a show)
-- ============================================================

CREATE TABLE rings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  show_id UUID NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  surface TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_rings_show ON rings(show_id);

-- ============================================================
-- 4. DIVISIONS (groupings of classes — Hunter, Jumper, Eq, etc.)
-- ============================================================

CREATE TABLE divisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  show_id UUID NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  level TEXT,
  height TEXT,
  age_group TEXT,
  rider_type TEXT,
  prize_money NUMERIC(10,2) DEFAULT 0,
  champion_award TEXT,
  reserve_award TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_divisions_show ON divisions(show_id);

-- ============================================================
-- 5. CLASSES (individual judged events)
-- ============================================================

CREATE TABLE classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  show_id UUID NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  division_id UUID REFERENCES divisions(id) ON DELETE SET NULL,
  ring_id UUID REFERENCES rings(id) ON DELETE SET NULL,
  number TEXT NOT NULL,
  name TEXT NOT NULL,
  judging_format TEXT NOT NULL DEFAULT 'standard' CHECK (judging_format IN ('standard', 'hunter', 'jumper_table_a', 'jumper_table_c', 'jumper_jumpoff', 'dressage', 'derby', 'medal', 'eq_flat', 'eq_over_fences', 'time_only', 'points')),
  fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  prize_money NUMERIC(10,2) DEFAULT 0,
  height TEXT,
  schedule_date DATE,
  schedule_time TIME,
  schedule_order INTEGER NOT NULL DEFAULT 0,
  estimated_minutes INTEGER DEFAULT 60,
  max_entries INTEGER,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'in_progress', 'completed', 'cancelled')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_classes_show ON classes(show_id);
CREATE INDEX idx_classes_division ON classes(division_id);
CREATE INDEX idx_classes_ring ON classes(ring_id);
CREATE INDEX idx_classes_schedule ON classes(show_id, schedule_date, schedule_order);

-- ============================================================
-- 6. HORSES
-- ============================================================

CREATE TABLE horses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  show_name TEXT,
  breed TEXT,
  color TEXT,
  sex TEXT CHECK (sex IS NULL OR sex IN ('mare', 'gelding', 'stallion', 'colt', 'filly')),
  year_of_birth INTEGER,
  height TEXT,
  usef_number TEXT,
  ushja_number TEXT,
  fei_passport TEXT,
  microchip TEXT,
  coggins_date DATE,
  coggins_number TEXT,
  health_cert_date DATE,
  notes TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_horses_owner ON horses(owner_id);

-- ============================================================
-- 7. ENTRIES (an exhibitor's overall entry into a show)
-- ============================================================

CREATE TABLE entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  show_id UUID NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  exhibitor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  horse_id UUID REFERENCES horses(id) ON DELETE SET NULL,
  rider_name TEXT NOT NULL,
  rider_usef TEXT,
  trainer_name TEXT,
  trainer_usef TEXT,
  owner_name TEXT,
  back_number TEXT,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('draft', 'submitted', 'approved', 'verified', 'scratched', 'cancelled')),
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  arrived BOOLEAN DEFAULT FALSE,
  coggins_verified BOOLEAN DEFAULT FALSE,
  health_cert_verified BOOLEAN DEFAULT FALSE,
  liability_signed BOOLEAN DEFAULT FALSE,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_entries_show ON entries(show_id);
CREATE INDEX idx_entries_exhibitor ON entries(exhibitor_id);
CREATE INDEX idx_entries_status ON entries(show_id, status);
CREATE INDEX idx_entries_back_number ON entries(show_id, back_number);

-- ============================================================
-- 8. CLASS ENTRIES (which classes an entry is in)
-- ============================================================

CREATE TABLE class_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'entered' CHECK (status IN ('entered', 'scratched', 'no_show', 'eliminated', 'completed')),
  go_order INTEGER,
  is_add BOOLEAN DEFAULT FALSE,
  add_approved BOOLEAN DEFAULT FALSE,
  fee_charged NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (entry_id, class_id)
);

CREATE INDEX idx_class_entries_class ON class_entries(class_id);
CREATE INDEX idx_class_entries_entry ON class_entries(entry_id);

-- ============================================================
-- 9. RESULTS (judged outcomes)
-- ============================================================

CREATE TABLE results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  class_entry_id UUID NOT NULL REFERENCES class_entries(id) ON DELETE CASCADE,
  placing INTEGER,
  score NUMERIC(8,3),
  faults NUMERIC(8,3),
  time_seconds NUMERIC(8,3),
  jumpoff_faults NUMERIC(8,3),
  jumpoff_time NUMERIC(8,3),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'jogged', 'eliminated', 'withdrew', 'completed', 'dnq')),
  prize_money_awarded NUMERIC(10,2) DEFAULT 0,
  judge_notes TEXT,
  scored_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  scored_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (class_entry_id)
);

CREATE INDEX idx_results_class ON results(class_id);
CREATE INDEX idx_results_placing ON results(class_id, placing);

-- ============================================================
-- 10. STALL RESERVATIONS
-- ============================================================

CREATE TABLE stalls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  show_id UUID NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  entry_id UUID REFERENCES entries(id) ON DELETE SET NULL,
  stall_number TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'horse' CHECK (type IN ('horse', 'tack', 'feed')),
  fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  arrival_date DATE,
  departure_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_stalls_show ON stalls(show_id);
CREATE INDEX idx_stalls_entry ON stalls(entry_id);

-- ============================================================
-- 11. INVOICES & LINE ITEMS
-- ============================================================

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  show_id UUID NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  entry_id UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  exhibitor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  invoice_number TEXT,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
  balance NUMERIC(12,2) GENERATED ALWAYS AS (total - amount_paid) STORED,
  prize_money_credit NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'partial', 'paid', 'refunded', 'void')),
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_invoices_show ON invoices(show_id);
CREATE INDEX idx_invoices_entry ON invoices(entry_id);
CREATE INDEX idx_invoices_exhibitor ON invoices(exhibitor_id);

CREATE TABLE invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('class_fee', 'office_fee', 'drug_fee', 'usef_fee', 'stall', 'haul_in', 'late_fee', 'add_fee', 'scratch_fee', 'prize_money', 'shavings', 'rv', 'other')),
  qty NUMERIC(8,2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  reference_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_invoice_items_invoice ON invoice_items(invoice_id);

-- ============================================================
-- 12. PAYMENTS
-- ============================================================

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('stripe', 'cash', 'check', 'ach', 'comp', 'prize_money', 'other')),
  reference TEXT,
  stripe_payment_intent TEXT,
  notes TEXT,
  recorded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_payments_invoice ON payments(invoice_id);

-- ============================================================
-- 13. SHOW STAFF (managers can grant staff access to a show)
-- ============================================================

CREATE TABLE show_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  show_id UUID NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('manager', 'office', 'judge', 'announcer', 'gate', 'readonly')),
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (show_id, user_id)
);

CREATE INDEX idx_show_staff_show ON show_staff(show_id);
CREATE INDEX idx_show_staff_user ON show_staff(user_id);

-- ============================================================
-- 14. SHOW UPDATES / ANNOUNCEMENTS
-- ============================================================

CREATE TABLE show_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  show_id UUID NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  author_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'important', 'urgent')),
  pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_announcements_show ON show_announcements(show_id, created_at DESC);

-- ============================================================
-- 15. WAITLIST FOR SOLD-OUT CLASSES
-- ============================================================

CREATE TABLE class_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  entry_id UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (class_id, entry_id)
);

-- ============================================================
-- 16. PUBLIC SHOW SUBMISSIONS (3rd parties submit shows for moderation)
-- ============================================================

CREATE TABLE show_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  discipline TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  website TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 17. ALERT SUBSCRIBERS (weekly emails)
-- ============================================================

CREATE TABLE alert_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  disciplines TEXT[] DEFAULT '{}',
  regions TEXT[] DEFAULT '{}',
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 18. AUDIT LOG (track changes for compliance)
-- ============================================================

CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  show_id UUID REFERENCES shows(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  action TEXT NOT NULL,
  changes JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_audit_show ON audit_log(show_id, created_at DESC);

-- ============================================================
-- HELPER FUNCTION: is user staff of this show?
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_show_staff(_show_id UUID, _user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM shows WHERE id = _show_id AND manager_id = _user_id
    UNION
    SELECT 1 FROM show_staff WHERE show_id = _show_id AND user_id = _user_id
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE shows ENABLE ROW LEVEL SECURITY;
ALTER TABLE rings ENABLE ROW LEVEL SECURITY;
ALTER TABLE divisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE horses ENABLE ROW LEVEL SECURITY;
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE results ENABLE ROW LEVEL SECURITY;
ALTER TABLE stalls ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE show_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE show_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE show_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Profiles: users see/edit their own
CREATE POLICY "Read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Read public profile fields" ON profiles FOR SELECT USING (TRUE);
-- Note: above public read returns all rows; combine with column-level grants in production. For MVP we accept for show staff lookups.

-- Shows: public can read public+published, managers full access
CREATE POLICY "Public read published shows" ON shows FOR SELECT USING (visibility = 'public' AND status IN ('open', 'closed', 'live', 'completed'));
CREATE POLICY "Manager read own shows" ON shows FOR SELECT USING (manager_id = auth.uid() OR is_show_staff(id, auth.uid()));
CREATE POLICY "Manager insert show" ON shows FOR INSERT WITH CHECK (manager_id = auth.uid());
CREATE POLICY "Manager update own show" ON shows FOR UPDATE USING (manager_id = auth.uid());
CREATE POLICY "Manager delete own show" ON shows FOR DELETE USING (manager_id = auth.uid());

-- Rings, Divisions, Classes: public read for visible shows, manager write
CREATE POLICY "Public read rings" ON rings FOR SELECT USING (
  EXISTS (SELECT 1 FROM shows s WHERE s.id = show_id AND s.visibility = 'public')
  OR is_show_staff(show_id, auth.uid())
);
CREATE POLICY "Manager manage rings" ON rings FOR ALL USING (is_show_staff(show_id, auth.uid())) WITH CHECK (is_show_staff(show_id, auth.uid()));

CREATE POLICY "Public read divisions" ON divisions FOR SELECT USING (
  EXISTS (SELECT 1 FROM shows s WHERE s.id = show_id AND s.visibility = 'public')
  OR is_show_staff(show_id, auth.uid())
);
CREATE POLICY "Manager manage divisions" ON divisions FOR ALL USING (is_show_staff(show_id, auth.uid())) WITH CHECK (is_show_staff(show_id, auth.uid()));

CREATE POLICY "Public read classes" ON classes FOR SELECT USING (
  EXISTS (SELECT 1 FROM shows s WHERE s.id = show_id AND s.visibility = 'public')
  OR is_show_staff(show_id, auth.uid())
);
CREATE POLICY "Manager manage classes" ON classes FOR ALL USING (is_show_staff(show_id, auth.uid())) WITH CHECK (is_show_staff(show_id, auth.uid()));

-- Horses: owners only
CREATE POLICY "Owner read horse" ON horses FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "Owner write horse" ON horses FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

-- Entries: exhibitor sees own; manager sees all in their show
CREATE POLICY "Exhibitor read own entry" ON entries FOR SELECT USING (exhibitor_id = auth.uid());
CREATE POLICY "Manager read show entries" ON entries FOR SELECT USING (is_show_staff(show_id, auth.uid()));
CREATE POLICY "Exhibitor insert entry" ON entries FOR INSERT WITH CHECK (exhibitor_id = auth.uid());
CREATE POLICY "Exhibitor update own entry" ON entries FOR UPDATE USING (exhibitor_id = auth.uid());
CREATE POLICY "Manager update show entry" ON entries FOR UPDATE USING (is_show_staff(show_id, auth.uid()));
CREATE POLICY "Manager delete show entry" ON entries FOR DELETE USING (is_show_staff(show_id, auth.uid()));

-- Class entries: linked through entries
CREATE POLICY "Read own class entry" ON class_entries FOR SELECT USING (
  EXISTS (SELECT 1 FROM entries e WHERE e.id = entry_id AND (e.exhibitor_id = auth.uid() OR is_show_staff(e.show_id, auth.uid())))
);
CREATE POLICY "Public read class entry" ON class_entries FOR SELECT USING (
  EXISTS (SELECT 1 FROM classes c JOIN shows s ON s.id = c.show_id WHERE c.id = class_id AND s.visibility = 'public' AND c.status IN ('in_progress', 'completed'))
);
CREATE POLICY "Write class entry" ON class_entries FOR ALL USING (
  EXISTS (SELECT 1 FROM entries e WHERE e.id = entry_id AND (e.exhibitor_id = auth.uid() OR is_show_staff(e.show_id, auth.uid())))
) WITH CHECK (
  EXISTS (SELECT 1 FROM entries e WHERE e.id = entry_id AND (e.exhibitor_id = auth.uid() OR is_show_staff(e.show_id, auth.uid())))
);

-- Results: public read once class is live/done; staff/judge write
CREATE POLICY "Public read results" ON results FOR SELECT USING (
  EXISTS (SELECT 1 FROM classes c JOIN shows s ON s.id = c.show_id WHERE c.id = class_id AND s.visibility = 'public')
);
CREATE POLICY "Staff write results" ON results FOR ALL USING (
  EXISTS (SELECT 1 FROM classes c WHERE c.id = class_id AND is_show_staff(c.show_id, auth.uid()))
) WITH CHECK (
  EXISTS (SELECT 1 FROM classes c WHERE c.id = class_id AND is_show_staff(c.show_id, auth.uid()))
);

-- Stalls
CREATE POLICY "Read stall" ON stalls FOR SELECT USING (
  is_show_staff(show_id, auth.uid())
  OR EXISTS (SELECT 1 FROM entries e WHERE e.id = entry_id AND e.exhibitor_id = auth.uid())
);
CREATE POLICY "Manager write stall" ON stalls FOR ALL USING (is_show_staff(show_id, auth.uid())) WITH CHECK (is_show_staff(show_id, auth.uid()));

-- Invoices & items: exhibitor sees own; staff sees show
CREATE POLICY "Read invoice" ON invoices FOR SELECT USING (exhibitor_id = auth.uid() OR is_show_staff(show_id, auth.uid()));
CREATE POLICY "Staff write invoice" ON invoices FOR ALL USING (is_show_staff(show_id, auth.uid())) WITH CHECK (is_show_staff(show_id, auth.uid()));

CREATE POLICY "Read invoice items" ON invoice_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM invoices i WHERE i.id = invoice_id AND (i.exhibitor_id = auth.uid() OR is_show_staff(i.show_id, auth.uid())))
);
CREATE POLICY "Staff write invoice items" ON invoice_items FOR ALL USING (
  EXISTS (SELECT 1 FROM invoices i WHERE i.id = invoice_id AND is_show_staff(i.show_id, auth.uid()))
) WITH CHECK (
  EXISTS (SELECT 1 FROM invoices i WHERE i.id = invoice_id AND is_show_staff(i.show_id, auth.uid()))
);

-- Payments
CREATE POLICY "Read payment" ON payments FOR SELECT USING (
  EXISTS (SELECT 1 FROM invoices i WHERE i.id = invoice_id AND (i.exhibitor_id = auth.uid() OR is_show_staff(i.show_id, auth.uid())))
);
CREATE POLICY "Write payment" ON payments FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM invoices i WHERE i.id = invoice_id AND (i.exhibitor_id = auth.uid() OR is_show_staff(i.show_id, auth.uid())))
);

-- Show staff
CREATE POLICY "Read show staff" ON show_staff FOR SELECT USING (user_id = auth.uid() OR is_show_staff(show_id, auth.uid()));
CREATE POLICY "Manager write show staff" ON show_staff FOR ALL USING (
  EXISTS (SELECT 1 FROM shows s WHERE s.id = show_id AND s.manager_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM shows s WHERE s.id = show_id AND s.manager_id = auth.uid())
);

-- Announcements
CREATE POLICY "Public read announcements" ON show_announcements FOR SELECT USING (
  EXISTS (SELECT 1 FROM shows s WHERE s.id = show_id AND s.visibility = 'public')
  OR is_show_staff(show_id, auth.uid())
);
CREATE POLICY "Staff write announcements" ON show_announcements FOR ALL USING (is_show_staff(show_id, auth.uid())) WITH CHECK (is_show_staff(show_id, auth.uid()));

-- Waitlist
CREATE POLICY "Read waitlist" ON class_waitlist FOR SELECT USING (
  EXISTS (SELECT 1 FROM entries e WHERE e.id = entry_id AND (e.exhibitor_id = auth.uid() OR is_show_staff(e.show_id, auth.uid())))
);
CREATE POLICY "Write waitlist" ON class_waitlist FOR ALL USING (
  EXISTS (SELECT 1 FROM entries e WHERE e.id = entry_id AND (e.exhibitor_id = auth.uid() OR is_show_staff(e.show_id, auth.uid())))
) WITH CHECK (
  EXISTS (SELECT 1 FROM entries e WHERE e.id = entry_id AND (e.exhibitor_id = auth.uid() OR is_show_staff(e.show_id, auth.uid())))
);

-- Show submissions: anyone can submit, only admins can read
CREATE POLICY "Public submit show" ON show_submissions FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Admin read submissions" ON show_submissions FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);
CREATE POLICY "Admin write submissions" ON show_submissions FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- Alert subscribers: public insert, admin read
CREATE POLICY "Public subscribe alerts" ON alert_subscribers FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Admin read alerts" ON alert_subscribers FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- Audit log: staff read only for their show
CREATE POLICY "Staff read audit" ON audit_log FOR SELECT USING (show_id IS NULL OR is_show_staff(show_id, auth.uid()));
CREATE POLICY "Insert audit" ON audit_log FOR INSERT WITH CHECK (TRUE);

-- ============================================================
-- AUTO-PROFILE ON SIGNUP
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'exhibitor')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- updated_at TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_touch BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_shows_touch BEFORE UPDATE ON shows FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_entries_touch BEFORE UPDATE ON entries FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_invoices_touch BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============================================================
-- INVOICE TOTAL RECALC
-- ============================================================

CREATE OR REPLACE FUNCTION public.recalc_invoice(_invoice_id UUID)
RETURNS VOID AS $$
DECLARE
  _subtotal NUMERIC(12,2);
  _paid NUMERIC(12,2);
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO _subtotal FROM invoice_items WHERE invoice_id = _invoice_id;
  SELECT COALESCE(SUM(amount), 0) INTO _paid FROM payments WHERE invoice_id = _invoice_id;
  UPDATE invoices
  SET subtotal = _subtotal,
      total = _subtotal,
      amount_paid = _paid,
      status = CASE
        WHEN _paid >= _subtotal AND _subtotal > 0 THEN 'paid'
        WHEN _paid > 0 THEN 'partial'
        ELSE 'open'
      END,
      updated_at = now()
  WHERE id = _invoice_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.trg_recalc_invoice_from_item()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.recalc_invoice(COALESCE(NEW.invoice_id, OLD.invoice_id));
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_invoice_items_recalc AFTER INSERT OR UPDATE OR DELETE ON invoice_items FOR EACH ROW EXECUTE FUNCTION public.trg_recalc_invoice_from_item();
CREATE TRIGGER trg_payments_recalc AFTER INSERT OR UPDATE OR DELETE ON payments FOR EACH ROW EXECUTE FUNCTION public.trg_recalc_invoice_from_item();
