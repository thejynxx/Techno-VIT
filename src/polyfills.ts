// Global polyfills for Base64, atob, btoa to satisfy loaders that expect them
// This file must be imported BEFORE any other modules in App.tsx

try {
  const { Base64 } = require('js-base64');
  const base64Pkg = require('base-64');

  const g: any = globalThis as any;

  // Attach Base64 object
  if (!g.Base64 && Base64) g.Base64 = Base64;

  // Attach btoa/atob using js-base64
  if (!g.btoa && Base64?.encode) g.btoa = Base64.encode;
  if (!g.atob && Base64?.decode) g.atob = Base64.decode;

  // Fallback to base-64 package if js-base64 isn't available
  if (!g.btoa && base64Pkg?.encode) g.btoa = base64Pkg.encode;
  if (!g.atob && base64Pkg?.decode) g.atob = base64Pkg.decode;

  // Also mirror onto window for web environments if available
  if (typeof window !== 'undefined') {
    const w: any = window as any;
    if (!w.Base64 && g.Base64) w.Base64 = g.Base64;
    if (!w.btoa && g.btoa) w.btoa = g.btoa;
    if (!w.atob && g.atob) w.atob = g.atob;
  }
} catch (e) {
  // noop: best-effort polyfill
}