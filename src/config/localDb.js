const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const supabase = require('./supabase');

// On Vercel serverless functions, the root filesystem is read-only.
// We must write to '/tmp' which is the only writable directory.
const isVercel = process.env.VERCEL || process.env.NOW_BUILDER;
const dbPath = isVercel 
  ? path.join('/tmp', 'local_db.json')
  : path.join(__dirname, '../../local_db.json');

// Initialize the local file if it doesn't exist
async function initLocalDb() {
  if (fs.existsSync(dbPath)) {
    return;
  }
  console.log('Initializing local_db.json from Supabase...');
  try {
    const { data: users } = await supabase.from('users').select('*');
    const { data: dutyPoints } = await supabase.from('duty_points').select('*');
    const { data: assignments } = await supabase.from('user_assignments').select('*');
    const { data: sewaPeriods } = await supabase.from('sewa_periods').select('*');

    const state = {
      users: users || [],
      duty_points: dutyPoints || [],
      user_assignments: assignments || [],
      sewa_periods: sewaPeriods || [],
      pendingChanges: false
    };

    fs.writeFileSync(dbPath, JSON.stringify(state, null, 2), 'utf8');
    console.log('local_db.json successfully initialized.');
  } catch (error) {
    console.error('Error during local DB initialization:', error);
    // Fallback empty state
    const emptyState = {
      users: [],
      duty_points: [],
      user_assignments: [],
      sewa_periods: [],
      pendingChanges: false
    };
    fs.writeFileSync(dbPath, JSON.stringify(emptyState, null, 2), 'utf8');
  }
}

function readLocalDb() {
  if (!fs.existsSync(dbPath)) {
    // Synchronous fallback/init block
    const emptyState = {
      users: [],
      duty_points: [],
      user_assignments: [],
      sewa_periods: [],
      pendingChanges: false
    };
    fs.writeFileSync(dbPath, JSON.stringify(emptyState, null, 2), 'utf8');
    return emptyState;
  }
  const content = fs.readFileSync(dbPath, 'utf8');
  return JSON.parse(content);
}

function writeLocalDb(data) {
  data.pendingChanges = true;
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
}

async function syncWithDatabase() {
  const data = readLocalDb();
  console.log('Syncing local state to Supabase database...');

  try {
    // 1. Delete in reverse dependency order to avoid foreign key errors
    await supabase.from('user_assignments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('users').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('duty_points').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('sewa_periods').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // 2. Insert records back
    if (data.users.length > 0) {
      const { error } = await supabase.from('users').insert(data.users);
      if (error) throw error;
    }
    if (data.duty_points.length > 0) {
      const { error } = await supabase.from('duty_points').insert(data.duty_points);
      if (error) throw error;
    }
    if (data.sewa_periods.length > 0) {
      const { error } = await supabase.from('sewa_periods').insert(data.sewa_periods);
      if (error) throw error;
    }
    if (data.user_assignments.length > 0) {
      const { error } = await supabase.from('user_assignments').insert(data.user_assignments);
      if (error) throw error;
    }

    // Mark pendingChanges as false on successful sync
    data.pendingChanges = false;
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
    console.log('Database synced successfully.');
    return { success: true };
  } catch (error) {
    console.error('Database sync failed:', error);
    throw error;
  }
}

module.exports = {
  initLocalDb,
  readLocalDb,
  writeLocalDb,
  syncWithDatabase,
  generateUuid: () => crypto.randomUUID()
};
