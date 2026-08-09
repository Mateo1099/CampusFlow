const fs = require('fs');

function replaceFile(filePath, search, replaceStr) {
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.split(search).join(replaceStr);
  fs.writeFileSync(filePath, content, 'utf8');
}

function regexReplace(filePath, searchRegex, replaceStr) {
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(searchRegex, replaceStr);
  fs.writeFileSync(filePath, content, 'utf8');
}

const db = 'src/pages/Dashboard.jsx';
replaceFile(db, `import React, { useEffect, useMemo, useRef, useState } from 'react';\nimport { useSettings }`, `import React, { useMemo, useState } from 'react';\nimport { useSettings }`);
replaceFile(db, `import { useAuth } from '../context/AuthContext';\n`, ``);
replaceFile(db, `const { user } = useAuth();\n  `, ``);
regexReplace(db, /const completedActionsForCompliance = [^\n]*\n/, '');
regexReplace(db, /const generalCompliance = [^\n]*\n/, '');
regexReplace(db, /const metricValueColor = [^\n]*\n/, '');
replaceFile(db, `} catch { }`, `} catch { /* ignore */ }`);
regexReplace(db, /catch\s*\{\s*\}/g, `catch { /* ignore */ }`);
replaceFile(db, `}, [courses, tasks, currentFilter]);`, `}, [tasks, currentFilter]);`);
regexReplace(db, /\/\/\s*eslint-disable-next-line react\/jsx-no-comment-textnodes/g, `{/* eslint-disable-next-line react/jsx-no-comment-textnodes */}`);

// Clean up rogue comment lines inside JSX
regexReplace(db, /\{\/\*\s*eslint-disable-next-line\s*[^*]*\*\/\}\s*/g, '');

// Clean up the quotes
regexReplace(db, /“/g, '&ldquo;');
regexReplace(db, /”/g, '&rdquo;');
replaceFile(db, `"solos"`, `&quot;solos&quot;`);

console.log('Dashboard fixed manually');
