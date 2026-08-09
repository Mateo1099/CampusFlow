const fs = require('fs');

function applyFixes(filePath, fixes) {
  let text = fs.readFileSync(filePath, 'utf8');
  for (const { search, replace } of fixes) {
    if (typeof search === 'string') {
      text = text.replace(search, replace);
    } else {
      text = text.replace(search, replace);
    }
  }
  fs.writeFileSync(filePath, text, 'utf8');
}

// 1. TaskBoard.jsx
applyFixes('src/pages/TaskBoard.jsx', [
  { search: 'import React, { useState, useCallback, useRef, useMemo } from \'react\';', replace: 'import React, { useState, useRef, useMemo } from \'react\';' },
  { search: '  const { t } = useSettings();\n  const navigate = useNavigate();', replace: '  const navigate = useNavigate();' },
  { search: 'catch {}', replace: 'catch { /* ignore */ }' },
  { search: '{/* eslint-disable-next-line react/jsx-no-comment-textnodes */}\n', replace: '' } // clean up just in case
]);

// 2. Profile.jsx
applyFixes('src/pages/Profile.jsx', [
  { search: '  const [avatarUrl, setAvatarUrl] = useState(null);\n  const [isLoadingAvatar, setIsLoadingAvatar] = useState(false);', replace: '' }, // they are unused
  { search: 'setAvatarUrl', replace: '' }, // Just in case, but they are unused entirely.
  { search: 'setIsLoadingAvatar', replace: '' }
]);

// 3. MFAChallenge.jsx
applyFixes('src/pages/MFAChallenge.jsx', [
  { search: 'const [successShow, setSuccessShow] = useState(false);', replace: '' },
  { search: 'setSuccessShow(true);', replace: '' },
  { search: '  const [verifyData, setVerifyData] = useState(null);', replace: '' }
]);

// 4. Dashboard.jsx
// Has escaping issues: `“` `”` `"`
applyFixes('src/pages/Dashboard.jsx', [
  { search: /“/g, replace: '&ldquo;' },
  { search: /”/g, replace: '&rdquo;' },
  // For `"` we only want to escape it inside JSX text.
  // Actually, let's just use `&quot;` for any `"` that causes error 683.
  { search: '¡La educación a distancia y el formato asincrónico a veces pueden hacernos sentir "solos", pero aquí estamos todos en la misma sintonía!', replace: '¡La educación a distancia y el formato asincrónico a veces pueden hacernos sentir &quot;solos&quot;, pero aquí estamos todos en la misma sintonía!' }
]);

// 5. Agenda.jsx, WeeklyPlanner.jsx, TaskBoard.jsx, Dashboard.jsx, etc.
// The `react/jsx-no-comment-textnodes` are caused by `// eslint-disable-next-line` being inside JSX in the `fix-remaining.cjs` run.
// BUT I reverted to master and then re-ran `refactor.cjs` without `fix-remaining.cjs`!
// So where are the `react/jsx-no-comment-textnodes` coming from NOW?!
// Ah! They were inserted by my `multi_replace_file_content` or by `fix-jsx-comments.cjs`?
// Let me verify if there are any `// eslint-disable-next-line` inside JSX.
