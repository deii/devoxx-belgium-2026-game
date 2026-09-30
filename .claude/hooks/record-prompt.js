// Appends each submitted prompt to .claude/prompts.jsonl. Must print nothing:
// UserPromptSubmit stdout is injected into the model context.
const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'prompts.jsonl');

let input = '';
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  try {
    const event = JSON.parse(input);
    const entry = { ts: new Date().toISOString(), sessionId: event.session_id, prompt: event.prompt };
    fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n');
  } catch {
    // Never block the prompt because logging failed.
  }
  process.exit(0);
});
