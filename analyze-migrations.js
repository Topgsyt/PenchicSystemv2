const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Function to normalize SQL content
function normalizeSql(content) {
  return content
    .replace(/--.*$/gm, '') // Remove comments
    .replace(/\s+/g, ' ')   // Normalize whitespace
    .trim();
}

// Function to get file hash
function getFileHash(content) {
  return crypto
    .createHash('sha256')
    .update(normalizeSql(content))
    .digest('hex');
}

// Function to analyze migrations
function analyzeMigrations(dir) {
  const files = fs.readdirSync(dir)
    .filter(f => f.endsWith('.sql'))
    .map(f => ({
      name: f,
      path: path.join(dir, f),
      content: fs.readFileSync(path.join(dir, f), 'utf8')
    }));

  // Group files by hash
  const groups = {};
  files.forEach(file => {
    const hash = getFileHash(file.content);
    if (!groups[hash]) {
      groups[hash] = [];
    }
    groups[hash].push(file);
  });

  // Find duplicates
  const duplicates = Object.values(groups)
    .filter(group => group.length > 1);

  return { duplicates };
}

// Main execution
const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');
const { duplicates } = analyzeMigrations(migrationsDir);

console.log('=== Migration Analysis ===\n');

if (duplicates.length > 0) {
  console.log('Found duplicate migrations:');
  duplicates.forEach((group, i) => {
    console.log(`\nGroup ${i + 1}:`);
    group.forEach(file => {
      console.log(`  ${file.name}`);
    });
  });
} else {
  console.log('No duplicate migrations found.');
}