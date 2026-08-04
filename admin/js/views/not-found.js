import { layout, mountLayout, emptyState } from '../core/layout.js';

export async function notFoundView(){
  return layout({
    title: 'Sección no encontrada',
    content: emptyState({
      icon: 'fas fa-compass',
      title: 'Esta sección todavía no existe',
      text: 'El enlace apunta a una vista que no está creada. Volvé al dashboard desde el menú.',
      action: { label: 'Ir al dashboard', icon: 'fas fa-home', onclick: "window.location.hash='#/dashboard'" },
    }),
  });
}

export function notFoundViewOnMount(){ mountLayout(); }
