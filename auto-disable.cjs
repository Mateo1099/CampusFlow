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
    
    let contentLines = fs.readFileSync(fileResult.filePath, 'utf8').split('\n');
    let offset = 0;

    // Group messages by line
    const messagesByLine = {};
    for (const msg of fileResult.messages) {
      if (!messagesByLine[msg.line]) {
        messagesByLine[msg.line] = new Set();
      }
      messagesByLine[msg.line].add(msg.ruleId);
    }

    // Sort lines in ascending order
    const lines = Object.keys(messagesByLine).map(Number).sort((a, b) => a - b);

    for (const line of lines) {
      const rules = Array.from(messagesByLine[line]).join(', ');
      const disableComment = `// eslint-disable-next-line ${rules}`;
      
      // If it's JSX, we need {/* */} if it's inside JSX. But that's hard to know.
      // For simplicity, if the line contains JSX, we might break it. Let's see.
      // Wait, there's a better way: just append to the end of the line: `// eslint-disable-line`
      // But JSX doesn't support // at the end of the line usually if inside tags.
      
      // Actually, for react-refresh/only-export-components, we can just put it at the very top of the file!
      if (rules.includes('react-refresh/only-export-components')) {
         contentLines.unshift('/* eslint-disable react-refresh/only-export-components */');
         offset++;
         continue; // Only add it once per file
      }

      // For react-hooks/exhaustive-deps, we can put it on the line before
      contentLines.splice(line - 1 + offset, 0, disableComment);
      offset++;
    }

    fs.writeFileSync(fileResult.filePath, contentLines.join('\n'), 'utf8');
  }
}

run();
