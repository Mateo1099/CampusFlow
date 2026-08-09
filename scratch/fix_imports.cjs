const fs = require('fs');

const data = JSON.parse(fs.readFileSync('eslint-results.json', 'utf8'));

const COMPONENTS = {
  'framer-motion': ['motion', 'AnimatePresence'],
  'lucide-react': [
    'Check', 'ImageIcon', 'Camera', 'Shield', 'ChevronDown', 'X', 'Loader2', 'Smartphone', 'Lock', 'ScanLine', 'Copy', 'Languages', 'Type', 'LayoutIcon', 'Palette', 'Plus', 'ArrowUpDown', 'CalendarIcon', 'Trash2', 'Folder', 'Pencil', 'ArrowLeft', 'BarChart2', 'CheckCircle2', 'Circle', 'Clock', 'Calendar', 'Play',
    'LayoutDashboard', 'Cpu', 'CheckSquare', 'CalendarDays', 'PieChart', 'Timer', 'LogOut', 'Save', 'ChevronLeft', 'ChevronRight', 'AlertCircle', 'CheckCircle', 'Loader', 'Target', 'Zap', 'Clock3', 'BrainCircuit', 'Flame', 'Activity', 'GraduationCap', 'User', 'ArrowRight', 'RotateCcw', 'Pause', 'Music', 'VolumeX', 'Volume2', 'Bell'
  ],
  'react-router-dom': ['Outlet', 'NavLink'],
  './Sidebar': ['Sidebar'],
  './BottomNavigation': ['BottomNavigation'],
  '../components/ui/InstitutionFilterPills': ['InstitutionFilterPills'],
  '../components/ui/CustomSelect': ['CustomSelect'],
  '../components/ui/CustomCalendar': ['CustomCalendar'],
  '../components/ui/WeeklyPlannerSkeleton': ['WeeklyPlannerSkeleton'],
  '../components/ui/ColorPicker': ['ColorPicker'],
};

function getSourcePackage(varName) {
  for (const [pkg, vars] of Object.entries(COMPONENTS)) {
    if (vars.includes(varName)) return pkg;
  }
  return null;
}

data.forEach(fileResult => {
  if (fileResult.errorCount === 0) return;
  
  const undefinedVars = new Set();
  fileResult.messages.forEach(msg => {
    if (msg.ruleId === 'react/jsx-no-undef') {
      const match = msg.message.match(/'([^']+)' is not defined/);
      if (match) {
        undefinedVars.add(match[1]);
      }
    }
  });

  if (undefinedVars.size === 0) return;

  const importsToAdd = {};
  let content = fs.readFileSync(fileResult.filePath, 'utf8');

  undefinedVars.forEach(v => {
    // Basic check if the variable is already imported
    if (content.includes(`import `) && content.includes(v) && new RegExp(`import.*\\b${v}\\b.*from`).test(content)) {
       return;
    }
    const pkg = getSourcePackage(v);
    if (pkg) {
      if (!importsToAdd[pkg]) importsToAdd[pkg] = [];
      importsToAdd[pkg].push(v);
    } else {
      console.log(`Unknown variable ${v} in ${fileResult.filePath}`);
    }
  });

  if (Object.keys(importsToAdd).length > 0) {
    let importStatements = '';
    
    for (const [pkg, vars] of Object.entries(importsToAdd)) {
      if (pkg.startsWith('.')) {
        importStatements += `import ${vars[0]} from '${pkg}';\n`;
      } else {
        importStatements += `import { ${vars.join(', ')} } from '${pkg}';\n`;
      }
    }
    
    // Insert after the first import or at top
    const lines = content.split('\n');
    let insertIdx = 0;
    while (insertIdx < lines.length && lines[insertIdx].startsWith('import ')) {
      insertIdx++;
    }
    
    lines.splice(insertIdx, 0, importStatements);
    fs.writeFileSync(fileResult.filePath, lines.join('\n'));
    console.log(`Fixed imports in ${fileResult.filePath}`);
  }
});
