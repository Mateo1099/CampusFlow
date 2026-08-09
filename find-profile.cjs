const fs = require('fs');
const path = require('path');

const p = path.join(__dirname, 'src', 'pages', 'Profile.jsx');
const lines = fs.readFileSync(p, 'utf8').split('\n');

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('NotificationRow')) {
    console.log(`Line ${i+1}: ${lines[i]}`);
    if (lines[i].includes('emailNotif')) {
      for (let j = Math.max(0, i-5); j < Math.min(lines.length, i+15); j++) {
        console.log(`[${j+1}] ${lines[j]}`);
      }
    }
  }
}
