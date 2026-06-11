-- ═══════════════════════════════════════════════════════════════════
--  FUTURE CHAMPIONS — COMPLETE SUPABASE SCHEMA
--  Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)
--  Includes: MCQ tables, round-based leaderboard, 5-winner prize tracking
-- ═══════════════════════════════════════════════════════════════════

-- ── Extensions ──────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── ENUM types ──────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE match_round AS ENUM (
    'group_stage', 'round_of_32', 'round_of_16',
    'quarterfinal', 'semifinal', 'third_place', 'final'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE match_status AS ENUM (
    'scheduled', 'live', 'halftime', 'extra_time', 'penalties', 'finished', 'postponed', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE lock_reason AS ENUM (
    'match_started', 'round_locked', 'admin_locked'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Leaderboard round group ENUM ─────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE prize_round AS ENUM (
    'overall', 'round_1_group', 'round_2_r32_r16',
    'round_3_qf_sf', 'round_4_final'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ════════════════════════════════════════════════════════════════════
--  CORE TABLES
-- ════════════════════════════════════════════════════════════════════

-- ── teams ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.teams (
  id               uuid        NOT NULL DEFAULT uuid_generate_v4(),
  name             text        NOT NULL,
  short_code       char(3)     NOT NULL,
  group_letter     char(1)     NOT NULL CHECK (group_letter IN ('A','B','C','D','E','F','G','H','I','J','K','L')),
  logo_url         text,
  flag_url         text,
  flag_code        char(2),
  worldcupapi_id   integer,
  group_position   integer     DEFAULT 0,
  is_eliminated    boolean     DEFAULT false,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now(),
  CONSTRAINT teams_pkey PRIMARY KEY (id)
);

-- ── matches ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.matches (
  id                        uuid          NOT NULL DEFAULT uuid_generate_v4(),
  match_number              integer       NOT NULL UNIQUE,
  round                     match_round   NOT NULL,
  home_team_id              uuid          REFERENCES public.teams(id),
  away_team_id              uuid          REFERENCES public.teams(id),
  home_placeholder          text,
  away_placeholder          text,
  home_score                integer,
  away_score                integer,
  home_extra_time_score     integer,
  away_extra_time_score     integer,
  home_penalty_score        integer,
  away_penalty_score        integer,
  winner_team_id            uuid          REFERENCES public.teams(id),
  status                    match_status  DEFAULT 'scheduled',
  kickoff_time              timestamptz,
  venue                     text,
  city                      text,
  worldcupapi_fixture_id    integer,
  feeds_into_match          integer,
  feeds_into_slot           text          CHECK (feeds_into_slot IN ('home','away')),
  created_at                timestamptz   DEFAULT now(),
  updated_at                timestamptz   DEFAULT now(),
  CONSTRAINT matches_pkey PRIMARY KEY (id)
);

-- ── users ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.users (
  id                         uuid        NOT NULL DEFAULT uuid_generate_v4(),
  full_name                  text        NOT NULL,
  mobile_number              text        NOT NULL UNIQUE,
  email                      text        NOT NULL,
  firebase_uid               text,
  civil_id                   text        CHECK (civil_id ~ '^\d{12}$'),
  favorite_team_id           uuid        REFERENCES public.teams(id),
  otp_code                   text,
  otp_expires_at             timestamptz,
  is_verified                boolean     DEFAULT false,
  has_submitted_prediction   boolean     DEFAULT false,
  total_points               integer     DEFAULT 0,
  -- Round-based point columns for fast leaderboard queries
  points_round_1             integer     DEFAULT 0,   -- group_stage
  points_round_2             integer     DEFAULT 0,   -- round_of_32 + round_of_16
  points_round_3             integer     DEFAULT 0,   -- quarterfinal + semifinal
  points_round_4             integer     DEFAULT 0,   -- final
  mcq_bonus_points           integer     DEFAULT 0,   -- all MCQ bonuses
  jwt_token_version          integer     DEFAULT 1,
  display_name               text,
  company_name               text,
  hear_about_us              text,
  created_at                 timestamptz DEFAULT now(),
  updated_at                 timestamptz DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id)
);

-- ── predictions ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.predictions (
  id                          uuid        NOT NULL DEFAULT uuid_generate_v4(),
  user_id                     uuid        NOT NULL REFERENCES public.users(id),
  match_number                integer     NOT NULL REFERENCES public.matches(match_number),
  predicted_winner_team_id    uuid        REFERENCES public.teams(id),
  predicted_home_score        integer,
  predicted_away_score        integer,
  is_locked                   boolean     DEFAULT false,
  locked_reason               lock_reason,
  points_earned               integer     DEFAULT 0,
  created_at                  timestamptz DEFAULT now(),
  updated_at                  timestamptz DEFAULT now(),
  CONSTRAINT predictions_pkey PRIMARY KEY (id),
  CONSTRAINT predictions_user_match_unique UNIQUE (user_id, match_number)
);

-- ── scoring_rules ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.scoring_rules (
  id                      uuid       NOT NULL DEFAULT uuid_generate_v4(),
  round                   match_round NOT NULL UNIQUE,
  correct_winner_points   integer    NOT NULL DEFAULT 0,
  correct_score_points    integer    NOT NULL DEFAULT 0,
  created_at              timestamptz DEFAULT now(),
  CONSTRAINT scoring_rules_pkey PRIMARY KEY (id)
);

-- Insert default scoring rules
INSERT INTO public.scoring_rules (round, correct_winner_points, correct_score_points)
VALUES
  ('group_stage',  1,  10),
  ('round_of_32',  3,  10),
  ('round_of_16',  5,  10),
  ('quarterfinal', 7,  10),
  ('semifinal',    9,  10),
  ('third_place',  11, 10),
  ('final',        13, 10)
ON CONFLICT (round) DO NOTHING;

-- ── bracket_locks ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bracket_locks (
  id          uuid        NOT NULL DEFAULT uuid_generate_v4(),
  round       match_round NOT NULL UNIQUE,
  is_locked   boolean     DEFAULT false,
  locked_by   uuid,
  locked_at   timestamptz,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  CONSTRAINT bracket_locks_pkey PRIMARY KEY (id)
);

-- ── admin_users ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_users (
  id             uuid NOT NULL DEFAULT uuid_generate_v4(),
  username       text NOT NULL UNIQUE,
  password_hash  text NOT NULL,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now(),
  CONSTRAINT admin_users_pkey PRIMARY KEY (id)
);

-- ════════════════════════════════════════════════════════════════════
--  MCQ TABLES
-- ════════════════════════════════════════════════════════════════════

-- ── mcq_questions ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.mcq_questions (
  id              uuid        NOT NULL DEFAULT uuid_generate_v4(),
  question        text        NOT NULL,
  options         text[]      NOT NULL,           -- array of 4 option strings
  correct_answer  text        NOT NULL,           -- must match one of options
  round_trigger   match_round NOT NULL,           -- shown after this round completes
  is_active       boolean     DEFAULT false,      -- admin can toggle
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  CONSTRAINT mcq_questions_pkey PRIMARY KEY (id),
  CONSTRAINT mcq_correct_in_options CHECK (correct_answer = ANY(options))
);

-- ── mcq_answers ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.mcq_answers (
  id              uuid        NOT NULL DEFAULT uuid_generate_v4(),
  user_id         uuid        NOT NULL REFERENCES public.users(id),
  question_id     uuid        NOT NULL REFERENCES public.mcq_questions(id),
  answer          text        NOT NULL,
  is_correct      boolean     NOT NULL,
  points_earned   integer     NOT NULL DEFAULT 0,
  created_at      timestamptz DEFAULT now(),
  CONSTRAINT mcq_answers_pkey PRIMARY KEY (id),
  CONSTRAINT mcq_answers_user_question_unique UNIQUE (user_id, question_id)
);

-- ════════════════════════════════════════════════════════════════════
--  PRIZE / WINNER TRACKING TABLE
-- ════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.prize_winners (
  id              uuid        NOT NULL DEFAULT uuid_generate_v4(),
  prize_round     prize_round NOT NULL UNIQUE,    -- one winner per round
  user_id         uuid        REFERENCES public.users(id),
  prize_label     text,                           -- e.g. "$1,000 Cash" or "Voucher"
  points_at_win   integer,
  awarded_at      timestamptz,
  notes           text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  CONSTRAINT prize_winners_pkey PRIMARY KEY (id)
);

-- Seed prize slots
INSERT INTO public.prize_winners (prize_round, prize_label)
VALUES
  ('overall',          '$1,000 Cash'),
  ('round_1_group',    'Voucher'),
  ('round_2_r32_r16',  'Voucher'),
  ('round_3_qf_sf',    'Voucher'),
  ('round_4_final',    'Voucher')
ON CONFLICT (prize_round) DO NOTHING;

-- ════════════════════════════════════════════════════════════════════
--  SUPPORT TABLES
-- ════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.champion_predictions (
  id                          uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id                     uuid NOT NULL UNIQUE REFERENCES public.users(id),
  predicted_champion_team_id  uuid NOT NULL REFERENCES public.teams(id),
  points_earned               integer DEFAULT 0,
  created_at                  timestamptz DEFAULT now(),
  updated_at                  timestamptz DEFAULT now(),
  CONSTRAINT champion_predictions_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id         uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id    uuid NOT NULL REFERENCES public.users(id),
  endpoint   text NOT NULL UNIQUE,
  p256dh     text,
  auth_key   text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT push_subscriptions_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.sync_log (
  id                   uuid NOT NULL DEFAULT uuid_generate_v4(),
  started_at           timestamptz DEFAULT now(),
  completed_at         timestamptz,
  matches_updated      integer DEFAULT 0,
  predictions_locked   integer DEFAULT 0,
  points_recalculated  integer DEFAULT 0,
  errors               text,
  status               text DEFAULT 'running' CHECK (status IN ('running','completed','failed')),
  CONSTRAINT sync_log_pkey PRIMARY KEY (id)
);

-- ════════════════════════════════════════════════════════════════════
--  INDEXES
-- ════════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_predictions_user_id       ON public.predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_predictions_match_number  ON public.predictions(match_number);
CREATE INDEX IF NOT EXISTS idx_matches_round             ON public.matches(round);
CREATE INDEX IF NOT EXISTS idx_matches_status            ON public.matches(status);
CREATE INDEX IF NOT EXISTS idx_users_total_points        ON public.users(total_points DESC);
CREATE INDEX IF NOT EXISTS idx_users_points_round_1      ON public.users(points_round_1 DESC);
CREATE INDEX IF NOT EXISTS idx_users_points_round_2      ON public.users(points_round_2 DESC);
CREATE INDEX IF NOT EXISTS idx_users_points_round_3      ON public.users(points_round_3 DESC);
CREATE INDEX IF NOT EXISTS idx_users_points_round_4      ON public.users(points_round_4 DESC);
CREATE INDEX IF NOT EXISTS idx_mcq_questions_active      ON public.mcq_questions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_mcq_answers_user          ON public.mcq_answers(user_id);
CREATE INDEX IF NOT EXISTS idx_mcq_answers_question      ON public.mcq_answers(question_id);

-- ════════════════════════════════════════════════════════════════════
--  FUNCTIONS
-- ════════════════════════════════════════════════════════════════════

-- ── Helper: update updated_at ────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ── Recalculate user total_points + round buckets ────────────────────
CREATE OR REPLACE FUNCTION recalculate_user_points(p_user_id uuid)
RETURNS integer LANGUAGE plpgsql AS $$
DECLARE
  r1_pts    integer;
  r2_pts    integer;
  r3_pts    integer;
  r4_pts    integer;
  mcq_pts   integer;
  champ_pts integer;
  total     integer;
BEGIN
  -- Round 1: group_stage
  SELECT COALESCE(SUM(p.points_earned), 0) INTO r1_pts
  FROM predictions p
  JOIN matches m ON m.match_number = p.match_number
  WHERE p.user_id = p_user_id AND m.round = 'group_stage';

  -- Round 2: round_of_32 + round_of_16
  SELECT COALESCE(SUM(p.points_earned), 0) INTO r2_pts
  FROM predictions p
  JOIN matches m ON m.match_number = p.match_number
  WHERE p.user_id = p_user_id AND m.round IN ('round_of_32', 'round_of_16');

  -- Round 3: quarterfinal + semifinal
  SELECT COALESCE(SUM(p.points_earned), 0) INTO r3_pts
  FROM predictions p
  JOIN matches m ON m.match_number = p.match_number
  WHERE p.user_id = p_user_id AND m.round IN ('quarterfinal', 'semifinal');

  -- Round 4: final (+ third_place)
  SELECT COALESCE(SUM(p.points_earned), 0) INTO r4_pts
  FROM predictions p
  JOIN matches m ON m.match_number = p.match_number
  WHERE p.user_id = p_user_id AND m.round IN ('final', 'third_place');

  -- MCQ bonus points
  SELECT COALESCE(SUM(points_earned), 0) INTO mcq_pts
  FROM mcq_answers
  WHERE user_id = p_user_id AND is_correct = true;

  -- Champion prediction points
  SELECT COALESCE(points_earned, 0) INTO champ_pts
  FROM champion_predictions
  WHERE user_id = p_user_id;

  total := r1_pts + r2_pts + r3_pts + r4_pts + mcq_pts + COALESCE(champ_pts, 0);

  UPDATE users SET
    total_points      = total,
    points_round_1    = r1_pts,
    points_round_2    = r2_pts,
    points_round_3    = r3_pts,
    points_round_4    = r4_pts,
    mcq_bonus_points  = mcq_pts,
    updated_at        = NOW()
  WHERE id = p_user_id;

  RETURN total;
END;
$$;

-- ── Score a finished match ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION score_match_predictions(p_match_number integer)
RETURNS integer LANGUAGE plpgsql AS $$
DECLARE
  m              RECORD;
  rule           RECORD;
  pred           RECORD;
  winner_correct BOOLEAN;
  score_correct  BOOLEAN;
  pts            INTEGER;
  total_scored   INTEGER := 0;
BEGIN
  SELECT * INTO m FROM matches WHERE match_number = p_match_number;
  IF NOT FOUND THEN RETURN 0; END IF;
  IF m.status != 'finished' THEN RETURN 0; END IF;

  SELECT * INTO rule FROM scoring_rules WHERE round = m.round;
  IF NOT FOUND THEN
    rule.correct_winner_points := 3;
    rule.correct_score_points  := 7;
  END IF;

  FOR pred IN
    SELECT * FROM predictions
    WHERE match_number = p_match_number AND is_locked = true
  LOOP
    pts := 0;

    winner_correct :=
      pred.predicted_winner_team_id IS NOT DISTINCT FROM m.winner_team_id;

    score_correct := (
      m.home_score IS NOT NULL AND
      m.away_score IS NOT NULL AND
      pred.predicted_home_score = m.home_score AND
      pred.predicted_away_score = m.away_score
    );

    IF winner_correct THEN pts := pts + rule.correct_winner_points; END IF;
    IF score_correct  THEN pts := pts + rule.correct_score_points;  END IF;

    UPDATE predictions
    SET points_earned = pts, updated_at = NOW()
    WHERE id = pred.id;

    PERFORM recalculate_user_points(pred.user_id);
    total_scored := total_scored + 1;
  END LOOP;

  RETURN total_scored;
END;
$$;

-- ── Add MCQ bonus points to user ─────────────────────────────────────
CREATE OR REPLACE FUNCTION add_mcq_bonus_points(p_user_id uuid, p_points integer)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE users SET
    mcq_bonus_points = mcq_bonus_points + p_points,
    total_points     = total_points + p_points,
    updated_at       = NOW()
  WHERE id = p_user_id;
END;
$$;

-- ── Can player still edit this prediction? ────────────────────────────
CREATE OR REPLACE FUNCTION can_predict(p_user_id uuid, p_match_number integer)
RETURNS boolean LANGUAGE plpgsql AS $$
DECLARE
  pred_locked  BOOLEAN;
  m_kickoff    TIMESTAMPTZ;
  m_status     TEXT;
BEGIN
  SELECT is_locked INTO pred_locked
  FROM predictions
  WHERE user_id = p_user_id AND match_number = p_match_number;
  IF pred_locked = true THEN RETURN false; END IF;

  SELECT kickoff_time, status::TEXT INTO m_kickoff, m_status
  FROM matches WHERE match_number = p_match_number;

  IF m_status IS NULL OR m_status != 'scheduled' THEN RETURN false; END IF;

  IF m_kickoff IS NOT NULL AND NOW() >= m_kickoff - INTERVAL '5 minutes' THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

-- ── Get round leaderboard (fast, uses pre-computed columns) ───────────
CREATE OR REPLACE FUNCTION get_round_leaderboard(p_prize_round text, p_limit integer DEFAULT 200)
RETURNS TABLE (
  id           uuid,
  full_name    text,
  total_points integer,
  rank         bigint
) LANGUAGE plpgsql AS $$
BEGIN
  IF p_prize_round = 'overall' THEN
    RETURN QUERY
      SELECT u.id, u.full_name, u.total_points,
             ROW_NUMBER() OVER (ORDER BY u.total_points DESC) AS rank
      FROM users u
      WHERE u.has_submitted_prediction = true
      ORDER BY u.total_points DESC
      LIMIT p_limit;

  ELSIF p_prize_round = 'round_1_group' THEN
    RETURN QUERY
      SELECT u.id, u.full_name, u.points_round_1 AS total_points,
             ROW_NUMBER() OVER (ORDER BY u.points_round_1 DESC) AS rank
      FROM users u WHERE u.has_submitted_prediction = true
      ORDER BY u.points_round_1 DESC LIMIT p_limit;

  ELSIF p_prize_round = 'round_2_r32_r16' THEN
    RETURN QUERY
      SELECT u.id, u.full_name, u.points_round_2 AS total_points,
             ROW_NUMBER() OVER (ORDER BY u.points_round_2 DESC) AS rank
      FROM users u WHERE u.has_submitted_prediction = true
      ORDER BY u.points_round_2 DESC LIMIT p_limit;

  ELSIF p_prize_round = 'round_3_qf_sf' THEN
    RETURN QUERY
      SELECT u.id, u.full_name, u.points_round_3 AS total_points,
             ROW_NUMBER() OVER (ORDER BY u.points_round_3 DESC) AS rank
      FROM users u WHERE u.has_submitted_prediction = true
      ORDER BY u.points_round_3 DESC LIMIT p_limit;

  ELSIF p_prize_round = 'round_4_final' THEN
    RETURN QUERY
      SELECT u.id, u.full_name, u.points_round_4 AS total_points,
             ROW_NUMBER() OVER (ORDER BY u.points_round_4 DESC) AS rank
      FROM users u WHERE u.has_submitted_prediction = true
      ORDER BY u.points_round_4 DESC LIMIT p_limit;
  END IF;
END;
$$;

-- ════════════════════════════════════════════════════════════════════
--  TRIGGER FUNCTIONS
-- ════════════════════════════════════════════════════════════════════

-- Auto-score when match finishes
CREATE OR REPLACE FUNCTION trigger_auto_score_on_finish()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'finished' AND (OLD.status IS DISTINCT FROM 'finished') THEN
    PERFORM score_match_predictions(NEW.match_number);
  END IF;
  RETURN NEW;
END;
$$;

-- Lock predictions when match goes live
CREATE OR REPLACE FUNCTION trigger_lock_predictions_on_live()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status != 'scheduled' AND OLD.status = 'scheduled' THEN
    UPDATE predictions
    SET is_locked     = true,
        locked_reason = 'match_started',
        updated_at    = NOW()
    WHERE match_number = NEW.match_number AND is_locked = false;
  END IF;
  RETURN NEW;
END;
$$;

-- ════════════════════════════════════════════════════════════════════
--  TRIGGERS
-- ════════════════════════════════════════════════════════════════════

-- updated_at triggers
CREATE OR REPLACE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_matches_updated_at
  BEFORE UPDATE ON public.matches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_predictions_updated_at
  BEFORE UPDATE ON public.predictions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_bracket_locks_updated_at
  BEFORE UPDATE ON public.bracket_locks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_admin_users_updated_at
  BEFORE UPDATE ON public.admin_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_champion_predictions_updated_at
  BEFORE UPDATE ON public.champion_predictions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_mcq_questions_updated_at
  BEFORE UPDATE ON public.mcq_questions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_prize_winners_updated_at
  BEFORE UPDATE ON public.prize_winners
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Match state triggers
CREATE OR REPLACE TRIGGER auto_score_on_match_finish
  AFTER UPDATE ON public.matches
  FOR EACH ROW EXECUTE FUNCTION trigger_auto_score_on_finish();

CREATE OR REPLACE TRIGGER lock_predictions_on_live
  AFTER UPDATE ON public.matches
  FOR EACH ROW EXECUTE FUNCTION trigger_lock_predictions_on_live();

-- ════════════════════════════════════════════════════════════════════
--  ROW LEVEL SECURITY (RLS)
-- ════════════════════════════════════════════════════════════════════

ALTER TABLE public.users              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcq_answers        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcq_questions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scoring_rules      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prize_winners      ENABLE ROW LEVEL SECURITY;

-- Public read for teams, matches, scoring_rules, prize_winners
CREATE POLICY "teams_public_read"         ON public.teams         FOR SELECT USING (true);
CREATE POLICY "matches_public_read"       ON public.matches        FOR SELECT USING (true);
CREATE POLICY "scoring_rules_public_read" ON public.scoring_rules  FOR SELECT USING (true);
CREATE POLICY "prize_winners_public_read" ON public.prize_winners  FOR SELECT USING (true);
CREATE POLICY "mcq_questions_active_read" ON public.mcq_questions  FOR SELECT USING (is_active = true);

-- Users can read their own data; service role can read all
CREATE POLICY "users_own_read" ON public.users
  FOR SELECT USING (auth.uid()::text = firebase_uid OR auth.role() = 'service_role');

CREATE POLICY "users_own_update" ON public.users
  FOR UPDATE USING (auth.uid()::text = firebase_uid OR auth.role() = 'service_role');

-- Predictions: users can read/write their own
CREATE POLICY "predictions_own_read" ON public.predictions
  FOR SELECT USING (user_id IN (SELECT id FROM users WHERE firebase_uid = auth.uid()::text) OR auth.role() = 'service_role');

CREATE POLICY "predictions_own_write" ON public.predictions
  FOR INSERT WITH CHECK (user_id IN (SELECT id FROM users WHERE firebase_uid = auth.uid()::text) OR auth.role() = 'service_role');

CREATE POLICY "predictions_own_update" ON public.predictions
  FOR UPDATE USING (user_id IN (SELECT id FROM users WHERE firebase_uid = auth.uid()::text) OR auth.role() = 'service_role');

-- MCQ answers: users own
CREATE POLICY "mcq_answers_own" ON public.mcq_answers
  FOR ALL USING (user_id IN (SELECT id FROM users WHERE firebase_uid = auth.uid()::text) OR auth.role() = 'service_role');

-- Service role bypass for backend
CREATE POLICY "service_role_bypass_users"     ON public.users       FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_bypass_teams"     ON public.teams       FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_bypass_matches"   ON public.matches     FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_bypass_mcq_q"     ON public.mcq_questions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_bypass_prize"     ON public.prize_winners FOR ALL USING (auth.role() = 'service_role');

-- ════════════════════════════════════════════════════════════════════
--  CONVENIENCE VIEWS
-- ════════════════════════════════════════════════════════════════════

-- Overall leaderboard view
CREATE OR REPLACE VIEW public.v_leaderboard_overall AS
SELECT
  u.id,
  u.full_name,
  u.total_points,
  u.points_round_1,
  u.points_round_2,
  u.points_round_3,
  u.points_round_4,
  u.mcq_bonus_points,
  ROW_NUMBER() OVER (ORDER BY u.total_points DESC) AS rank
FROM public.users u
WHERE u.has_submitted_prediction = true;

-- Round 1 leaderboard
CREATE OR REPLACE VIEW public.v_leaderboard_round1 AS
SELECT id, full_name, points_round_1 AS round_points,
       ROW_NUMBER() OVER (ORDER BY points_round_1 DESC) AS rank
FROM public.users WHERE has_submitted_prediction = true;

-- Round 2 leaderboard
CREATE OR REPLACE VIEW public.v_leaderboard_round2 AS
SELECT id, full_name, points_round_2 AS round_points,
       ROW_NUMBER() OVER (ORDER BY points_round_2 DESC) AS rank
FROM public.users WHERE has_submitted_prediction = true;

-- Round 3 leaderboard
CREATE OR REPLACE VIEW public.v_leaderboard_round3 AS
SELECT id, full_name, points_round_3 AS round_points,
       ROW_NUMBER() OVER (ORDER BY points_round_3 DESC) AS rank
FROM public.users WHERE has_submitted_prediction = true;

-- Round 4 leaderboard
CREATE OR REPLACE VIEW public.v_leaderboard_round4 AS
SELECT id, full_name, points_round_4 AS round_points,
       ROW_NUMBER() OVER (ORDER BY points_round_4 DESC) AS rank
FROM public.users WHERE has_submitted_prediction = true;

-- ════════════════════════════════════════════════════════════════════
--  DONE — Future Champions Database Schema
-- ════════════════════════════════════════════════════════════════════
