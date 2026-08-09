const fs = require('fs'); 
const files = ['src/components/ui/StatsSkeleton.jsx', 'src/pages/Agenda.jsx', 'src/pages/Dashboard.jsx', 'src/pages/WeeklyPlanner.jsx']; 
files.forEach(f => { 
  let text = fs.readFileSync(f, 'utf8'); 
  text = text.replace(/\{\/\*\s*eslint-disable-next-line\s*\*\/\}/g, '// eslint-disable-next-line'); 
  fs.writeFileSync(f, text); 
});
