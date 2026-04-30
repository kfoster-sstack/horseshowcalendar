-- ============================================================
-- HorseShowCalendar — Sample Data
-- Run AFTER migration.sql, and AFTER you have at least one
-- manager profile (sign up at /login.html?tab=signup&role=manager,
-- then run this file with your manager UUID below).
-- ============================================================

-- Replace with your manager's auth.users UUID
-- Find it: select id, email from auth.users;
DO $$
DECLARE
  _manager UUID;
  _show1 UUID;
  _show2 UUID;
  _ring1 UUID;
  _ring2 UUID;
  _div1 UUID;
  _div2 UUID;
BEGIN
  SELECT id INTO _manager FROM profiles WHERE role = 'manager' LIMIT 1;
  IF _manager IS NULL THEN
    RAISE NOTICE 'No manager profile found. Sign up first as role=manager, then re-run this seed.';
    RETURN;
  END IF;

  -- Show 1: Spring Schooling Show
  INSERT INTO shows (manager_id, name, slug, discipline, region, start_date, end_date,
    venue_name, venue_address, city, state, zip, description, contact_email,
    status, visibility, office_fee, drug_fee, prize_money_total)
  VALUES (_manager, 'Spring Hill Schooling Show', 'spring-hill-2026', 'Hunter/Jumper', 'Northeast',
    CURRENT_DATE + 14, CURRENT_DATE + 14,
    'Spring Hill Equestrian', '450 Hill Rd', 'Chagrin Falls', 'OH', '44022',
    'Friendly schooling show open to all. Crossrails through 3''. Lunch served by the boosters.',
    'shows@springhill.example', 'open', 'public', 25, 0, 1500)
  RETURNING id INTO _show1;

  INSERT INTO rings (show_id, name, display_order) VALUES (_show1, 'Main Ring', 0) RETURNING id INTO _ring1;
  INSERT INTO rings (show_id, name, display_order) VALUES (_show1, 'Schooling Ring', 1) RETURNING id INTO _ring2;

  INSERT INTO divisions (show_id, name, level, height, age_group, prize_money, display_order)
  VALUES (_show1, 'Crossrails Hunter', 'Schooling', 'Crossrails', 'Open', 200, 0) RETURNING id INTO _div1;
  INSERT INTO divisions (show_id, name, level, height, age_group, prize_money, display_order)
  VALUES (_show1, '2''6" Hunter', 'Schooling', '2''6"', 'Open', 400, 1) RETURNING id INTO _div2;

  INSERT INTO classes (show_id, division_id, ring_id, number, name, judging_format, fee, prize_money, height, schedule_date, schedule_time, schedule_order)
  VALUES
    (_show1, _div1, _ring1, '1', 'Crossrails Hunter Over Fences', 'hunter', 30, 50, 'Crossrails', CURRENT_DATE + 14, '08:30', 1),
    (_show1, _div1, _ring1, '2', 'Crossrails Hunter Under Saddle', 'eq_flat', 30, 50, 'Crossrails', CURRENT_DATE + 14, '09:15', 2),
    (_show1, _div1, _ring1, '3', 'Crossrails Equitation', 'eq_over_fences', 30, 50, 'Crossrails', CURRENT_DATE + 14, '10:00', 3),
    (_show1, _div2, _ring1, '10', '2''6" Hunter Over Fences', 'hunter', 35, 100, '2''6"', CURRENT_DATE + 14, '11:00', 4),
    (_show1, _div2, _ring1, '11', '2''6" Hunter Under Saddle', 'eq_flat', 35, 100, '2''6"', CURRENT_DATE + 14, '11:45', 5),
    (_show1, _div2, _ring1, '12', '2''6" Equitation', 'eq_over_fences', 35, 100, '2''6"', CURRENT_DATE + 14, '12:30', 6);

  INSERT INTO show_announcements (show_id, author_id, title, body, priority, pinned)
  VALUES (_show1, _manager, 'Welcome!', 'Office opens at 7am show day. See you there!', 'normal', TRUE);

  -- Show 2: Recognized Hunter/Jumper
  INSERT INTO shows (manager_id, name, slug, discipline, region, start_date, end_date,
    venue_name, city, state, description,
    status, visibility, office_fee, drug_fee, usef_fee, stall_fee, prize_money_total, usef_competition_id)
  VALUES (_manager, 'Cleveland Classic Horse Show', 'cleveland-classic-2026', 'Hunter/Jumper', 'Midwest',
    CURRENT_DATE + 45, CURRENT_DATE + 49,
    'Chagrin Valley Hunt Club', 'Gates Mills', 'OH',
    'A-rated hunter/jumper. WCHR/USHJA Outreach divisions. $25,000 Grand Prix Saturday night.',
    'open', 'public', 75, 16, 12, 250, 25000, '12345')
  RETURNING id INTO _show2;

END $$;
