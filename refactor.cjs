const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');
const prefetchPath = path.join(srcDir, 'lib', 'prefetchAnalyticsData.js');
const servicePath = path.join(srcDir, 'lib', 'analyticsService.js');

const prefetchContent = fs.readFileSync(prefetchPath, 'utf8');
const serviceContent = fs.readFileSync(servicePath, 'utf8');

const prefetchLines = prefetchContent.split('\n');
const startIdx = prefetchLines.findIndex(l => l.includes('Constants from useAnalytics'));
let endIdx = -1;
for (let i = startIdx; i < prefetchLines.length; i++) {
  if (prefetchLines[i].startsWith('function computeAnalytics')) {
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

let extractedLogic = prefetchLines.slice(startIdx, endIdx + 1).join('\n');
extractedLogic = extractedLogic.replace('function computeAnalytics', 'export function computeAnalytics');
extractedLogic = extractedLogic.replace('const DEFAULT_ANALYTICS = {', 'export const DEFAULT_ANALYTICS = {');
extractedLogic = extractedLogic.replace('const COMPLETED_BLOCK_STATUSES', 'export const COMPLETED_BLOCK_STATUSES');
extractedLogic = extractedLogic.replace('const normalizeText', 'export const normalizeText');
extractedLogic = extractedLogic.replace('const normalizeNumber', 'export const normalizeNumber');

if (!serviceContent.includes('computeAnalytics')) {
  fs.writeFileSync(servicePath, serviceContent + '\n\n' + extractedLogic, 'utf8');
}

const newPrefetchLines = [
  ...prefetchLines.slice(0, startIdx),
  "import { computeAnalytics, DEFAULT_ANALYTICS } from './analyticsService';",
  ...prefetchLines.slice(endIdx + 1)
];
fs.writeFileSync(prefetchPath, newPrefetchLines.join('\n'), 'utf8');
console.log('Successfully refactored prefetchAnalyticsData and analyticsService!');
