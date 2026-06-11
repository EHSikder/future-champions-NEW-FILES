// Bracket structure
export const BRACKET_FLOW = {
  73: { feedsInto: 89, slot: 'home' },
  75: { feedsInto: 89, slot: 'away' },
  74: { feedsInto: 90, slot: 'home' },
  77: { feedsInto: 90, slot: 'away' },
  76: { feedsInto: 91, slot: 'home' },
  78: { feedsInto: 91, slot: 'away' },
  79: { feedsInto: 92, slot: 'home' },
  80: { feedsInto: 92, slot: 'away' },
  83: { feedsInto: 93, slot: 'home' },
  84: { feedsInto: 93, slot: 'away' },
  81: { feedsInto: 94, slot: 'home' },
  82: { feedsInto: 94, slot: 'away' },
  86: { feedsInto: 95, slot: 'home' },
  88: { feedsInto: 95, slot: 'away' },
  85: { feedsInto: 96, slot: 'home' },
  87: { feedsInto: 96, slot: 'away' },
  89: { feedsInto: 97, slot: 'home' },
  90: { feedsInto: 97, slot: 'away' },
  91: { feedsInto: 99, slot: 'home' },
  92: { feedsInto: 99, slot: 'away' },
  93: { feedsInto: 98, slot: 'home' },
  94: { feedsInto: 98, slot: 'away' },
  95: { feedsInto: 100, slot: 'home' },
  96: { feedsInto: 100, slot: 'away' },
  97: { feedsInto: 101, slot: 'home' },
  98: { feedsInto: 101, slot: 'away' },
  99: { feedsInto: 102, slot: 'home' },
  100: { feedsInto: 102, slot: 'away' },
  101: { feedsInto: 104, slot: 'home' },
  102: { feedsInto: 104, slot: 'away' },
  104: { feedsInto: null, slot: null },
};

export const ROUND_NAMES = {
  group_stage: 'Group Stage',
  round_of_32: 'Round of 32',
  round_of_16: 'Round of 16',
  quarterfinal: 'Quarter-Finals',
  semifinal: 'Semi-Finals',
  third_place: 'Third Place',
  final: 'Final',
};

export const ROUND_ORDER = [
  'group_stage',
  'round_of_32',
  'round_of_16',
  'quarterfinal',
  'semifinal',
  'final',
];

// Scoring table — same point system as original
export const SCORING_TABLE = [
  { round: 'Group Stage',               roundKey: 'scoring_round_group',  points: 1,  exact: 10 },
  { round: 'Round of 32',               roundKey: 'scoring_round_r32',    points: 3,  exact: 10 },
  { round: 'Round of 16',               roundKey: 'scoring_round_r16',    points: 5,  exact: 10 },
  { round: 'Quarter-Finals',            roundKey: 'scoring_round_qf',     points: 7,  exact: 10 },
  { round: 'Semi-Finals',               roundKey: 'scoring_round_sf',     points: 9,  exact: 10 },
  { round: 'Third Place',               roundKey: 'scoring_round_3rd',    points: 11, exact: 10 },
  { round: 'Final / Champion',          roundKey: 'scoring_round_final',  points: 13, exact: 10 },
];

// MCQ bonus points per correct answer
export const MCQ_BONUS_POINTS = 5;

// Prize structure
export const PRIZE_STRUCTURE = {
  grand: { label: 'Full Tournament', prize: '$1,000 Cash', desc: 'Top predictor across all rounds' },
  round_1: { label: 'Round 1 (Group Stage)', prize: 'Voucher', desc: '1 winner' },
  round_2: { label: 'Round 2 (R32 & R16)', prize: 'Voucher', desc: '1 winner' },
  round_3: { label: 'Round 3 (QF & SF)', prize: 'Voucher', desc: '1 winner' },
  round_4: { label: 'Round 4 (Final)', prize: 'Voucher', desc: '1 winner' },
};

// Round groups for leaderboard tabs
export const LEADERBOARD_ROUNDS = {
  overall: { label: 'Overall', rounds: null },
  group_stage: { label: 'Round 1 — Group Stage', rounds: ['group_stage'] },
  round_of_32_16: { label: 'Round 2 — R32 & R16', rounds: ['round_of_32', 'round_of_16'] },
  quarterfinal_semifinal: { label: 'Round 3 — QF & SF', rounds: ['quarterfinal', 'semifinal'] },
  final: { label: 'Round 4 — Final', rounds: ['final'] },
};

export const GROUPS = ['A','B','C','D','E','F','G','H','I','J','K','L'];
