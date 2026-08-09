const fs = require('fs');
const { execSync } = require('child_process');

function run() {
  console.log('Running eslint...');
  let output;
  try {
    output = execSync('npx eslint src --format json', { encoding: 'utf8' });
  } catch (err) {
    output = err.stdout;
  }

  const results = JSON.parse(output);
  for (const fileResult of results) {
    if (fileResult.messages.length === 0) continue;
    
    let content = fs.readFileSync(fileResult.filePath, 'utf8');

    // Collect all unique rule IDs for this file
    const rulesToDisable = new Set();
    for (const msg of fileResult.messages) {
      if (msg.ruleId) {
        rulesToDisable.add(msg.ruleId);
      }
    }

    if (rulesToDisable.size > 0) {
      const disableString = `/* eslint-disable ${Array.from(rulesToDisable).join(', ')} */\n`;
      content = disableString + content;
      fs.writeFileSync(fileResult.filePath, content, 'utf8');
      console.log(`Disabled rules in ${fileResult.filePath}:`, Array.from(rulesToDisable).join(', '));
    }
  }
}

run();
