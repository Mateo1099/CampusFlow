const fs = require('fs');
const path = require('path');

const p = path.join(__dirname, 'src', 'pages', 'TaskBoard.jsx');
let content = fs.readFileSync(p, 'utf8');

// Update useState
content = content.replace(
  /const \[formData, setFormData\] = useState\(\{ title: '', courseId: '', startDate: '', dueDate: '' \}\);/g,
  `const [formData, setFormData] = useState({ title: '', courseId: '', startDate: '', dueDate: '', deadlineTime: '' });`
);

// Update setFormData resets
content = content.replace(
  /setFormData\(\{ title: '', courseId: '', startDate: '', dueDate: '' \}\);/g,
  `setFormData({ title: '', courseId: '', startDate: '', dueDate: '', deadlineTime: '' });`
);

// Update taskData construction
content = content.replace(
  `      deadline: formatDateToISO(formData.dueDate)\n    };`,
  `      deadline: formatDateToISO(formData.dueDate),\n      deadline_time: formData.deadlineTime || null\n    };`
);

// Update edit mode loading
content = content.replace(
  `        dueDate: task.deadline || ''\n      });`,
  `        dueDate: task.deadline || '',\n        deadlineTime: task.deadline_time || ''\n      });`
);

// Add Time input in UI (next to dueDate)
const oldUI = `<label style={{ \n                    display: 'block', \n                    fontSize: '0.65rem', \n                    fontWeight: 800, \n                    color: '#00f3ff', \n                    marginBottom: '6px',\n                    textTransform: 'uppercase',\n                    letterSpacing: '0.1em'\n                  }}>\n                    FECHA LÍMITE *\n                  </label>`;

// We will just inject the time input below the date input.
const dateInput = `                  <div onClick={() => setActivePicker('due')} className="input" style={{ \n                    cursor: 'pointer', \n                    display: 'flex', \n                    alignItems: 'center', \n                    justifyContent: 'space-between', \n                    background: 'rgba(255,255,255,0.03)', \n                    padding: '14px 12px', \n                    borderRadius: '10px', \n                    minWidth: 0,\n                    border: '1px solid rgba(0, 243, 255, 0.2)'\n                  }}>\n                    <span style={{ fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, minWidth: 0 }}>\n                      {(formData.dueDate || '').split('T')[0] || 'Selecciona...'}\n                    </span>\n                    <CalendarIcon size={16} color="#00f3ff" style={{ flexShrink: 0, marginLeft: '8px' }} />\n                  </div>\n                </div>`;

const newUI = dateInput + `\n                <div style={{ flex: 1, minWidth: '120px' }}>\n                  <label style={{ \n                    display: 'block', \n                    fontSize: '0.65rem', \n                    fontWeight: 800, \n                    color: '#00f3ff', \n                    marginBottom: '6px',\n                    textTransform: 'uppercase',\n                    letterSpacing: '0.1em'\n                  }}>\n                    HORA (Opcional)\n                  </label>\n                  <input\n                    type="time"\n                    value={formData.deadlineTime}\n                    onChange={(e) => setFormData({ ...formData, deadlineTime: e.target.value })}\n                    style={{ \n                      width: '100%', \n                      background: 'rgba(255,255,255,0.03)', \n                      padding: '13px 12px', \n                      borderRadius: '10px', \n                      border: '1px solid rgba(0, 243, 255, 0.2)',\n                      color: '#fff',\n                      outline: 'none',\n                      fontSize: '0.85rem'\n                    }}\n                  />\n                </div>`;

content = content.replace(dateInput, newUI);

fs.writeFileSync(p, content, 'utf8');
console.log('TaskBoard updated!');
