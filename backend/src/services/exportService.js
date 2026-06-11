const { stringify } = require('fast-csv');
const supabase = require('../config/database');

/**
 * Fetch the rows for a given export type from Supabase.
 */
async function fetchData(type) {
  switch (type) {
    case 'users': {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, mobile_number, email, civil_id, is_verified, has_submitted_prediction, total_points, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
    case 'predictions': {
      const { data, error } = await supabase
        .from('predictions')
        .select('user_id, match_number, predicted_winner_team_id, predicted_home_score, predicted_away_score, points_earned, is_locked, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
    case 'leaderboard': {
      const { data, error } = await supabase
        .from('users')
        .select('full_name, mobile_number, total_points, has_submitted_prediction')
        .eq('has_submitted_prediction', true)
        .order('total_points', { ascending: false });
      if (error) throw error;
      return data || [];
    }
    default:
      throw new Error(`Unknown export type: ${type}`);
  }
}

/**
 * Generate a CSV string for the given type.
 */
async function generateCsv(type) {
  const rows = await fetchData(type);
  if (!rows.length) return '';

  return new Promise((resolve, reject) => {
    const chunks = [];
    const stream = stringify(rows, { headers: true });
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => resolve(chunks.join('')));
    stream.on('error', reject);
  });
}

/**
 * Generate an XLSX-compatible buffer.
 * Uses a CSV-inside-xlsx envelope so no extra library is needed.
 * For proper xlsx formatting install exceljs and replace this implementation.
 */
async function generateXlsx(type) {
  // Fallback: return CSV bytes — clients will still open it in Excel.
  // To upgrade: `npm install exceljs` and rewrite using ExcelJS workbook.
  const csv = await generateCsv(type);
  return Buffer.from(csv, 'utf8');
}

module.exports = { generateCsv, generateXlsx };
