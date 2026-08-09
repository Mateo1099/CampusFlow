const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');
const prefetchPath = path.join(srcDir, 'lib', 'prefetchAnalyticsData.js');
const servicePath = path.join(srcDir, 'lib', 'analyticsService.js');
const hookPath = path.join(srcDir, 'hooks', 'useAnalytics.js');

const prefetchContent = fs.readFileSync(prefetchPath, 'utf8');
const hookContent = fs.readFileSync(hookPath, 'utf8');
const serviceContent = fs.readFileSync(servicePath, 'utf8');

// 1. Extract logic from prefetchAnalyticsData.js
// We know lines 4 to 251 contain the constants and computeAnalytics.
// Let's extract using string splitting or regex.
const prefetchLines = prefetchContent.split('\n');
const computeEndIdx = prefetchLines.findIndex(l => l.startsWith('}')) + 1; // Assuming `}` at the end of computeAnalytics

// Let's be precise: extract from `// Constants from useAnalytics` to the end of `computeAnalytics` function.
const startIdx = prefetchLines.findIndex(l => l.includes('Constants from useAnalytics'));
let endIdx = -1;
for (let i = startIdx; i < prefetchLines.length; i++) {
  if (prefetchLines[i].startsWith('function computeAnalytics') || prefetchLines[i].startsWith('export function computeAnalytics')) {
    // find matching brace
    let braceCount = 0;
    let foundStart = false;
    for (let j = i; j < prefetchLines.length; j++) {
      if (prefetchLines[j].includes('{')) { foundStart = true; braceCount += (prefetchLines[j].match(/\{/g) || []).length; }
      if (prefetchLines[j].includes('}')) { braceCount -= (prefetchLines[j].match(/\}/g) || []).length; }
      if (foundStart && braceCount === 0) {
        endIdx = j;
        break;
      }
    }
    if (endIdx !== -1) break;
  }
}

if (startIdx === -1 || endIdx === -1) {
  console.error("Could not find the bounds for extraction in prefetchAnalyticsData.js");
  process.exit(1);
}

const extractedLogicLines = prefetchLines.slice(startIdx, endIdx + 1);
let extractedLogic = extractedLogicLines.join('\n');
extractedLogic = extractedLogic.replace('function computeAnalytics', 'export function computeAnalytics');
// Ensure DEFAULT_ANALYTICS is exported
extractedLogic = extractedLogic.replace('const DEFAULT_ANALYTICS = {', 'export const DEFAULT_ANALYTICS = {');
// Ensure constants are exported if needed
extractedLogic = extractedLogic.replace('const COMPLETED_BLOCK_STATUSES', 'export const COMPLETED_BLOCK_STATUSES');
extractedLogic = extractedLogic.replace('const normalizeText', 'export const normalizeText');
extractedLogic = extractedLogic.replace('const normalizeNumber', 'export const normalizeNumber');


// 2. Append to analyticsService.js
let newServiceContent = serviceContent;
if (!newServiceContent.includes('computeAnalytics')) {
  newServiceContent += '\n\n' + extractedLogic;
  fs.writeFileSync(servicePath, newServiceContent, 'utf8');
  console.log('Appended shared logic to analyticsService.js');
}

// 3. Update prefetchAnalyticsData.js
// Remove extracted lines and add imports
const newPrefetchLines = [
  ...prefetchLines.slice(0, startIdx),
  "import { computeAnalytics, DEFAULT_ANALYTICS } from './analyticsService';",
  ...prefetchLines.slice(endIdx + 1)
];
fs.writeFileSync(prefetchPath, newPrefetchLines.join('\n'), 'utf8');
console.log('Updated prefetchAnalyticsData.js');

// 4. Update useAnalytics.js
// This one is harder because it has inline hooks.
// I will write the replacement manually using AST or complex regex, but it's better to just do it via string replacement of the file content.
