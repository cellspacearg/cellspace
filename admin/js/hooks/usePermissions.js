// ============================================================
// Permisos del panel (RBAC) — Fase B
// Lee los permisos del usuario actual desde role_permissions y expone can(key).
// El owner (ADMIN_EMAIL) siempre tiene todo ('*'), sin depender de la DB → sin lockout.
// ============================================================
import { supabase, ADMIN_EMAIL } from '../config.js';

let _perms = null;   // Set de permission_key ('*' = todos)
let _role  = null;

export async function loadPermissions(force = false){
  if (_perms && !force) return _perms;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { _perms = new Set(); _role = 'visitor'; return _perms; }

  // Owner = super_admin, siempre todo (ancla client-side).
  if (session.user.email === ADMIN_EMAIL) { _role = 'super_admin'; _perms = new Set(['*']); return _perms; }

  try {
    const { data: prof } = await supabase.from('profiles').select('role').eq('id', session.user.id).maybeSingle();
    _role = (prof && prof.role) || 'client';
    if (_role === 'super_admin') { _perms = new Set(['*']); return _perms; }
    const { data: rp, error } = await supabase.from('role_permissions').select('permission_key').eq('role', _role);
    if (error) throw error;
    _perms = new Set((rp || []).map(r => r.permission_key));
  } catch (e) {
    console.warn('No se pudieron cargar permisos:', e && e.message);
    _perms = new Set();
  }
  return _perms;
}

export function can(key){
  if (!_perms) return false;
  return _perms.has('*') || _perms.has(key);
}

export function currentRole(){ return _role; }

export function resetPermissions(){ _perms = null; _role = null; }
