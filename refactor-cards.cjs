const fs = require('fs');
const path = require('path');

// 1. Refactor TaskBoard.jsx
const pTaskBoard = path.join(__dirname, 'src', 'pages', 'TaskBoard.jsx');
let tbContent = fs.readFileSync(pTaskBoard, 'utf8');

// Remove TaskCard from TaskBoard.jsx
// It starts at `const TaskCard = ` and ends before `const TaskBoard = () => {`
const tbStart = tbContent.indexOf('const TaskCard = ');
const tbEnd = tbContent.indexOf('const TaskBoard = () => {');
if (tbStart !== -1 && tbEnd !== -1) {
  tbContent = tbContent.slice(0, tbStart) + tbContent.slice(tbEnd);
}

// Add import
if (!tbContent.includes("import { TaskCard }")) {
  tbContent = tbContent.replace(
    "import { useTasksContext } from '../context/TaskContext';",
    "import { useTasksContext } from '../context/TaskContext';\nimport { TaskCard } from '../components/TaskCard';"
  );
}

fs.writeFileSync(pTaskBoard, tbContent, 'utf8');

// 2. Refactor Agenda.jsx
const pAgenda = path.join(__dirname, 'src', 'pages', 'Agenda.jsx');
let aContent = fs.readFileSync(pAgenda, 'utf8');

// Remove CourseCard from Agenda.jsx
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
// Remove unused imports in Agenda.jsx (Hash, Building2, User, Pencil, Trash2)
// Agenda uses Plus, Hash is only used in CourseCard? Wait, I need to check what lucide-react icons Agenda uses.
// Let's just run ESLint later, it will tell us if there are unused imports.

fs.writeFileSync(pAgenda, aContent, 'utf8');

console.log('Cards extracted successfully');
