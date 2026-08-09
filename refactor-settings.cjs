const fs = require('fs');
const path = require('path');

const p = path.join(__dirname, 'src', 'context', 'SettingsContext.jsx');
let content = fs.readFileSync(p, 'utf8');

content = content.replace(
  `    redAlertCustomDays: 1,\n    yellowAlertCustomDays: 1,\n    greenAlertCustomDays: 1\n  });`,
  `    redAlertCustomDays: 1,\n    yellowAlertCustomDays: 1,\n    greenAlertCustomDays: 1,\n    inAppAlertsEnabled: true\n  });`
);

content = content.replace(
  `two_factor_enabled, email_notifications, red_alert_freq, yellow_alert_freq, green_alert_freq, red_alert_custom_days, yellow_alert_custom_days, green_alert_custom_days'`,
  `two_factor_enabled, email_notifications, red_alert_freq, yellow_alert_freq, green_alert_freq, red_alert_custom_days, yellow_alert_custom_days, green_alert_custom_days, in_app_alerts_enabled'`
);

content = content.replace(
  `          greenAlertCustomDays: Number(data.green_alert_custom_days) || prev.greenAlertCustomDays || 1\n        }));`,
  `          greenAlertCustomDays: Number(data.green_alert_custom_days) || prev.greenAlertCustomDays || 1,\n          inAppAlertsEnabled: data.in_app_alerts_enabled ?? true\n        }));`
);

content = content.replace(
  `        green_alert_custom_days: current.greenAlertCustomDays\n      });`,
  `        green_alert_custom_days: current.greenAlertCustomDays,\n        in_app_alerts_enabled: current.inAppAlertsEnabled\n      });`
);

fs.writeFileSync(p, content, 'utf8');
console.log('Settings updated!');
