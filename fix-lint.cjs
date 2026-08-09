const fs = require('fs');
const path = require('path');

// Fix SettingsContext.jsx
const pSettings = path.join(__dirname, 'src', 'context', 'SettingsContext.jsx');
let sContent = fs.readFileSync(pSettings, 'utf8');

// 1. Remove unused synthwaveNeon
sContent = sContent.replace(`import synthwaveNeon from '../assets/synthwave_neon.png';\n`, '');

// 2. Add eslint-disable comments above constants if not present
const constants = [
  'export const WALLPAPERS',
  'export const ALERT_FREQUENCY_OPTIONS',
  'export const FONT_OPTIONS',
  'export const translations',
  'export const useSettings'
];

constants.forEach(c => {
  const regex = new RegExp(`(// eslint-disable-next-line react-refresh/only-export-components\\s*)?${c}`, 'g');
  sContent = sContent.replace(regex, `// eslint-disable-next-line react-refresh/only-export-components\n${c}`);
});

// 3. Fix unused setRecentXPGains
sContent = sContent.replace(
  `const [recentXPGains, setRecentXPGains] = useState([]);`,
  `// eslint-disable-next-line no-unused-vars\n  const [recentXPGains, setRecentXPGains] = useState([]);`
);

fs.writeFileSync(pSettings, sContent, 'utf8');


// Fix useAnalytics.js
const pAnalytics = path.join(__dirname, 'src', 'hooks', 'useAnalytics.js');
let aContent = fs.readFileSync(pAnalytics, 'utf8');

// 1. Remove unused prefetchCacheService
aContent = aContent.replace(`import prefetchCacheService from '../lib/prefetchAnalyticsData';\n`, '');
// 2. Remove unused react-hooks/set-state-in-effect comments
aContent = aContent.replace(/\/\/ eslint-disable-next-line react-hooks\/set-state-in-effect\n/g, '');

fs.writeFileSync(pAnalytics, aContent, 'utf8');
