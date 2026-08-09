const fs = require('fs');
const path = require('path');

const pAgenda = path.join(__dirname, 'src', 'pages', 'Agenda.jsx');
let aContent = fs.readFileSync(pAgenda, 'utf8');

// Remove CourseCard
const aStart = aContent.indexOf('const CourseCard = ');
const aEnd = aContent.indexOf('const Agenda = () => {');
if (aStart !== -1 && aEnd !== -1) {
  aContent = aContent.slice(0, aStart) + aContent.slice(aEnd);
}

// Add import
if (!aContent.includes("import { CourseCard }")) {
  aContent = aContent.replace(
    "import { useTasksContext } from '../context/TaskContext';",
    "import { useTasksContext } from '../context/TaskContext';\nimport { CourseCard } from '../components/CourseCard';"
  );
}

// Remove playClick import
aContent = aContent.replace(`import { playClick } from '../lib/audioService';\n`, '');

fs.writeFileSync(pAgenda, aContent, 'utf8');
console.log('Fixed Agenda.jsx');
