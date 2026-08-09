const fs = require('fs');
const path = require('path');

const p = path.join(__dirname, 'src', 'pages', 'Stats.jsx');
let content = fs.readFileSync(p, 'utf8');

// Import recharts
if (!content.includes('recharts')) {
  content = content.replace(
    `import { BarChart3, CheckCircle2, Clock3, Sparkles, Sun, Sunset, Moon, AlertCircle, AlertTriangle, Info } from 'lucide-react';`,
    `import { BarChart3, CheckCircle2, Clock3, Sparkles, Sun, Sunset, Moon, AlertCircle, AlertTriangle, Info } from 'lucide-react';\nimport { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, PieChart, Pie, Cell } from 'recharts';`
  );
}

// 1. Replace Weekly Bar Chart
// We need to replace the entire map over `weekDays` with a Recharts component
const oldWeeklyChartSection = `          ) : !hasWeeklyMinutes ? (
            <div
              style={{
                minHeight: '240px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px dashed var(--border-glass-top)',
                borderRadius: '16px',
                background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015))',
                textAlign: 'center',
                padding: '24px'
              }}
            >
              <BarChart3 size={24} color="var(--text-muted)" />
              <p style={{ margin: '14px 0 6px', color: 'var(--text-primary)', fontWeight: 700 }}>Sin actividad semanal registrada</p>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.86rem' }}>Agrega bloques al planner para visualizar esta grafica.</p>
            </div>
          ) : (
            <div style={{ height: '260px', display: 'flex', gap: '10px', alignItems: 'flex-end', padding: '8px 4px 0' }}>
              {weekDays.map((label, index) => {
                const dayMinutes = safeMinutesByDay[index] || 0;
                const ratio = maxDayMinutes > 0 ? dayMinutes / maxDayMinutes : 0;
                const height = Math.max(ratio * 100, dayMinutes > 0 ? 12 : 4);

                return (
                  <div key={label} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <div style={{ fontSize: '0.68rem', color: dayMinutes > 0 ? 'var(--accent-secondary)' : 'var(--text-muted)', fontWeight: 700, minHeight: '16px' }}>
                      {dayMinutes > 0 ? \`\${dayMinutes}m\` : ''}
                    </div>
                    <div
                      style={{
                        width: '100%',
                        height: '190px',
                        borderRadius: '12px',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        display: 'flex',
                        alignItems: 'flex-end',
                        overflow: 'hidden'
                      }}
                    >
                      <div
                        style={{
                          width: '100%',
                          height: \`\${height}%\`,
                          background: dayMinutes > 0
                            ? 'linear-gradient(180deg, var(--accent-secondary), var(--accent-primary))'
                            : 'rgba(255,255,255,0.08)',
                          boxShadow: dayMinutes > 0 ? '0 0 18px var(--accent-secondary)33' : 'none',
                          transition: 'height 0.7s var(--ease-out-expo)'
                        }}
                      />
                    </div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>{label}</span>
                  </div>
                );
              })}
            </div>
          )}`;

const newWeeklyChartSection = `          ) : !hasWeeklyMinutes ? (
            <div
              style={{
                minHeight: '240px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px dashed var(--border-glass-top)',
                borderRadius: '16px',
                background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015))',
                textAlign: 'center',
                padding: '24px'
              }}
            >
              <BarChart3 size={24} color="var(--text-muted)" />
              <p style={{ margin: '14px 0 6px', color: 'var(--text-primary)', fontWeight: 700 }}>Sin actividad semanal registrada</p>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.86rem' }}>Agrega bloques al planner para visualizar esta gráfica.</p>
            </div>
          ) : (
            <div style={{ height: '260px', width: '100%', marginTop: '10px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weekDays.map((label, i) => ({ name: label, minutos: safeMinutesByDay[i] || 0 }))} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12, fontWeight: 700 }} dy={10} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }} 
                    contentStyle={{ background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(0, 243, 255, 0.2)', borderRadius: '8px', color: '#fff' }} 
                    formatter={(value) => [\`\${value} min\`, 'Tiempo']}
                  />
                  <Bar dataKey="minutos" fill="var(--accent-secondary)" radius={[6, 6, 6, 6]} maxBarSize={45}>
                    {weekDays.map((entry, index) => (
                      <Cell key={\`cell-\${index}\`} fill={safeMinutesByDay[index] > 0 ? 'var(--accent-secondary)' : 'rgba(255,255,255,0.05)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}`;

content = content.replace(oldWeeklyChartSection, newWeeklyChartSection);

// 2. Replace Time Distribution Donut Chart
const oldDistributionSection = `          ) : !hasTimeDistribution ? (
            <div
              style={{
                minHeight: '180px',
                border: '1px dashed var(--border-glass-top)',
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-secondary)',
                fontSize: '0.86rem',
                textAlign: 'center',
                padding: '16px'
              }}
            >
              Sin registro de minutos por franja horaria.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '10px' }}>
              {dayDistribution.map((slot) => {
                const percent = totalTimeDistribution > 0 ? Math.round((slot.value / totalTimeDistribution) * 100) : 0;
                const SlotIcon = slot.icon;

                return (
                  <div key={slot.key}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.84rem', color: 'var(--text-primary)' }}>
                        <SlotIcon size={14} color={slot.color} /> {slot.label}
                      </span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{slot.value} min · {percent}%</span>
                    </div>
                    <div style={{ height: '8px', borderRadius: '999px', overflow: 'hidden', background: 'rgba(0,0,0,0.28)' }}>
                      <div style={{ width: \`\${percent}%\`, height: '100%', background: \`linear-gradient(90deg, \${slot.color}, var(--accent-primary))\` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}`;

const newDistributionSection = `          ) : !hasTimeDistribution ? (
            <div
              style={{
                minHeight: '180px',
                border: '1px dashed var(--border-glass-top)',
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-secondary)',
                fontSize: '0.86rem',
                textAlign: 'center',
                padding: '16px'
              }}
            >
              Sin registro de minutos por franja horaria.
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginTop: '10px', height: '180px' }}>
              <div style={{ flex: 1, height: '100%', position: 'relative' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dayDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {dayDistribution.map((entry, index) => (
                        <Cell key={\`cell-\${index}\`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(0, 243, 255, 0.2)', borderRadius: '8px', color: '#fff' }} 
                      formatter={(value) => [\`\${value} min\`, 'Tiempo']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
                {dayDistribution.map((slot) => {
                  const percent = totalTimeDistribution > 0 ? Math.round((slot.value / totalTimeDistribution) * 100) : 0;
                  const SlotIcon = slot.icon;

                  return (
                    <div key={slot.key}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.84rem', color: 'var(--text-primary)' }}>
                          <SlotIcon size={14} color={slot.color} /> {slot.label}
                        </span>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{percent}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}`;

content = content.replace(oldDistributionSection, newDistributionSection);

fs.writeFileSync(p, content, 'utf8');
console.log('Stats.jsx refactored with recharts!');
