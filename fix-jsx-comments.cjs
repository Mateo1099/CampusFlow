const fs = require('fs'); 
const files = ['src/components/ui/StatsSkeleton.jsx', 'src/pages/Agenda.jsx', 'src/pages/Dashboard.jsx', 'src/pages/WeeklyPlanner.jsx']; 
files.forEach(f => { 
  let text = fs.readFileSync(f, 'utf8'); 
  text = text.replace(/(\s+)\/\/\s*eslint-disable-next-line[^\n]*/g, (match, p1) => {
    // If it's already inside a JS block or if it's outside JSX, this could break, 
    // but we only apply it to known files where it's breaking JSX.
    return `${p1}{/* eslint-disable-next-line */}`;
  }); 
  fs.writeFileSync(f, text); 
});
