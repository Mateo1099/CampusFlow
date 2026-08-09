const fs = require('fs');
const path = require('path');

const p = path.join(__dirname, 'src', 'pages', 'Profile.jsx');
let content = fs.readFileSync(p, 'utf8');

const target = `<NotificationRow
                  checked={Boolean(emailNotif)}
                  isLoading={settingsLoading || emailNotif === null}
                  onChange={handleEmailNotifChange}
                  label="Correo Electrónico"
                />`;

const injection = `
                <NotificationRow
                  checked={Boolean(settings.inAppAlertsEnabled ?? true)}
                  isLoading={settingsLoading}
                  onChange={(val) => updateSettings({ inAppAlertsEnabled: val })}
                  label="In-App (Última Hora)"
                />`;

if (content.includes(target)) {
  content = content.replace(target, target + '\n' + injection);
  
  // Also we need to make sure the "CONSOLA DE FRECUENCIA POR ZONA" is ALWAYS visible now,
  // or visible if EITHER emailNotif OR inAppAlertsEnabled is true.
  // Previously it was: gridTemplateRows: emailNotif ? '1fr' : '0fr',
  content = content.replace(
    /gridTemplateRows: emailNotif \? '1fr' : '0fr',/g,
    `gridTemplateRows: (emailNotif || (settings.inAppAlertsEnabled ?? true)) ? '1fr' : '0fr',`
  );
  
  fs.writeFileSync(p, content, 'utf8');
  console.log('Profile updated successfully!');
} else {
  console.log('Target not found in Profile.jsx');
}
