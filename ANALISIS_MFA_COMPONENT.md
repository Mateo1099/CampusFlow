# 📋 Análisis Técnico - Componente MFA

## **1. Nombre del componente**
`Profile` (página de perfil - [src/pages/Profile.jsx](src/pages/Profile.jsx))

---

## **2. Estructura del bloque "Autenticación en dos pasos"**

```jsx
// ACTIVE STATE DISPLAY (línea ~1163)
<div style={{ padding: '20px', background: '...', borderRadius: '12px', border: '...' }}>
  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
    {/* Indicador pulsante + Texto */}
  </div>
  <button>DESACTIVAR</button>
</div>
```

---

## **3. Contenedor principal y clases**

| Propiedad | Valor |
|-----------|-------|
| **Fondo** | `linear-gradient(135deg, rgba(0, 243, 255, 0.08) 0%, rgba(0, 243, 255, 0.02) 100%)` |
| **Borde** | `1px solid rgba(0, 243, 255, 0.3)` |
| **Border Radius** | `12px` |
| **Padding** | `20px` |

---

## **4. Layout interno**

**Contenedor padre:**
- `display: 'flex'`
- `alignItems: 'center'`
- `justifyContent: 'space-between'`

**Sección izquierda (info):**
- `display: 'flex'`
- `alignItems: 'center'`
- `gap: '14px'`

**El punto + texto:**
- Flex horizontal
- `gap: '14px'`

---

## **5. Estilos específicos**

### **Fondo:**
```javascript
background: 'linear-gradient(135deg, rgba(0, 243, 255, 0.08) 0%, rgba(0, 243, 255, 0.02) 100%)'
```

### **Borde & Glow:**
```javascript
border: '1px solid rgba(0, 243, 255, 0.3)'  // Borde cyan
boxShadow: 'none'  // Sin shadow en el panel
```

### **Punto pulsante (indicador):**
```javascript
{
  width: '12px',
  height: '12px',
  borderRadius: '50%',
  background: 'var(--accent-primary)',
  boxShadow: '0 0 12px var(--accent-primary), inset 0 0 8px var(--accent-primary)',
  animation: 'shieldPulse 2s ease-in-out infinite'
}
```

### **Padding & Spacing:**
- Panel padding: `20px`
- Gap entre punto e info: `14px`

### **Tipografía:**
- **Título**: `fontWeight: 800`, `fontSize: '0.95rem'` (UPPERCASE)
- **Subtítulo**: `fontWeight: 600`, `fontSize: '0.8rem'` (UPPERCASE)

---

## **6. Ítem del botón "Desactivar"**

**Ubicación:** Línea ~1184 en [src/pages/Profile.jsx](src/pages/Profile.jsx)

```jsx
<button 
  onClick={() => setIsDisablingMfa(true)} 
  style={{
    padding: '10px 16px',
    background: 'transparent',
    border: '2px solid #ef4444',
    borderRadius: '8px',
    color: '#ef4444',
    fontWeight: 800,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '0.85rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  }}
  onMouseEnter={(e) => { 
    e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; 
    e.currentTarget.style.transform = 'scale(1.05)'; 
  }}
  onMouseLeave={(e) => { 
    e.currentTarget.style.background = 'transparent'; 
    e.currentTarget.style.transform = 'scale(1)'; 
  }}
>
  <X size={16} />
  DESACTIVAR
</button>
```

---

## **7. Facilidad de agregar línea extra**

✅ **Muy fácil**

El contenedor actualmente usa `align-items: 'center'` con flex horizontal. Para agregar una línea debajo de `"Google Authenticator / Bitwarden"`:

1. Puedes envolver el contenido izquierdo en un `<div>` con `flexDirection: 'column'`
2. Agregar el nuevo texto dentro del mismo contenedor

---

## **8. Clases/estilos exactos a tocar**

### **Opción A: Recomendada (mínimo impacto)**

Cambiar el contenedor de información izquierdo:

```javascript
// DE ESTO:
<div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
  <div>...</div>
  <div>
    <p>AUTENTICACIÓN EN DOS PASOS</p>
    <p>Google Authenticator / Bitwarden</p>
  </div>
</div>

// A ESTO:
<div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
  <div>...</div>
  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
    <p style={{ margin: 0, fontWeight: 800 }}>AUTENTICACIÓN EN DOS PASOS</p>
    <p style={{ margin: 0, fontWeight: 600 }}>Google Authenticator / Bitwarden</p>
    {/* NUEVA LÍNEA AQUÍ */}
    <p style={{ margin: '8px 0 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
      Tu nuevo texto aquí
    </p>
  </div>
</div>
```

### **Estilos clave a modificar:**

| Elemento | Cambio |
|----------|--------|
| **alignItems** | `'center'` → `'flex-start'` |
| **Nuevo div interior** | Agregar `display: 'flex'` + `flexDirection: 'column'` + `gap: '4px'` |
| **Nueva línea (p)** | `margin: '8px 0 0 0'`, `fontSize: '0.75rem'`, `color: 'var(--text-secondary)'`, `fontWeight: 600` |

---

## **Resumen de propiedades CSS clave**

```css
/* Contenedor principal */
display: flex;
align-items: center;
justify-content: space-between;
padding: 20px;
background: linear-gradient(135deg, rgba(0, 243, 255, 0.08) 0%, rgba(0, 243, 255, 0.02) 100%);
border: 1px solid rgba(0, 243, 255, 0.3);
border-radius: 12px;

/* Punto indicador */
width: 12px;
height: 12px;
border-radius: 50%;
background: var(--accent-primary);
box-shadow: 0 0 12px var(--accent-primary), inset 0 0 8px var(--accent-primary);
animation: shieldPulse 2s ease-in-out infinite;

/* Tipografía */
font-weight: 800;
text-transform: uppercase;
letter-spacing: 0.05em;
```

