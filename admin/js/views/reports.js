import { supabase } from '../config.js?v=cb11';
import { layout, mountLayout } from '../core/layout.js?v=cb11';

function money(n){ n=Number(n)||0; return (n%1===0)? n.toLocaleString('es-AR') : n.toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function esc(s){ return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

const REPAIR_LABEL = { recibido:'Recibido', diagnostico:'Diagnóstico', presupuesto:'Presupuesto', esperando_aprobacion:'Esp. aprobación', en_reparacion:'En reparación', esperando_repuesto:'Esp. repuesto', pausado:'Pausado', reparado:'Reparado', listo:'Listo', entregado:'Entregado', cancelado:'Cancelado' };

export async function reportsView(){
  const kpi = (id, label, color) => `
    <div class="stat-card"><div class="stat-icon" style="background:${color}1a;color:${color};"><i class="fas fa-chart-simple"></i></div>
      <div class="stat-content"><span class="stat-label">${label}</span><span class="stat-value" id="${id}">…</span></div></div>`;
  const content = `
    <div class="stats-grid" style="margin-bottom:24px;">
      ${kpi('kpiRevenue','Ingresos (cobrados)','#4CAF50')}
      ${kpi('kpiOrders','Pedidos','#2196F3')}
      ${kpi('kpiTicket','Ticket promedio','#FF6A00')}
      ${kpi('kpiRepairsOpen','Reparaciones abiertas','#9C27B0')}
    </div>
    <div class="quick-actions"><h3 class="section-title">Ventas por mes (cobradas)</h3><div id="repSales"><p class="loading-text">Cargando...</p></div></div>
    <div class="quick-actions"><h3 class="section-title">Reparaciones por estado</h3><div id="repRepairs"><p class="loading-text">Cargando...</p></div></div>
    <div class="quick-actions"><h3 class="section-title">Productos más vendidos</h3><div id="repTop"><p class="loading-text">Cargando...</p></div></div>`;
  return layout({ title: 'Reportes', content });
}

export function reportsViewOnMount(){ mountLayout(); loadReports(); }

function setText(id, v){ const el = document.getElementById(id); if (el) el.textContent = v; }

function bars(rows, colorFn){
  const max = Math.max(1, ...rows.map(r => r.value));
  return `<div style="display:flex;flex-direction:column;gap:10px;">${rows.map(r => `
    <div style="display:flex;align-items:center;gap:12px;">
      <div style="width:150px;color:#ccc;font-size:13px;flex-shrink:0;">${esc(r.label)}</div>
      <div style="flex:1;background:rgba(255,255,255,0.05);border-radius:6px;height:22px;overflow:hidden;">
        <div style="width:${Math.round(r.value/max*100)}%;height:100%;background:${colorFn?colorFn(r):'var(--admin-orange,#FF6A00)'};min-width:2px;"></div>
      </div>
      <div style="width:120px;text-align:right;color:#fff;font-weight:700;font-size:13px;">${esc(r.text!=null?r.text:r.value)}</div>
    </div>`).join('')}</div>`;
}

async function loadReports(){
  try {
    const [ordersRes, repairsRes, productsRes] = await Promise.all([
      supabase.from('orders').select('total,payment_status,created_at'),
      supabase.from('repairs').select('status'),
      supabase.from('products').select('name,sold_count,stock'),
    ]);
    const orders = ordersRes.data || [];
    const repairs = repairsRes.data || [];
    const productsD = productsRes.data || [];

    // KPIs
    const paid = orders.filter(o => o.payment_status === 'approved');
    const revenue = paid.reduce((s, o) => s + (Number(o.total) || 0), 0);
    setText('kpiRevenue', '$' + money(revenue));
    setText('kpiOrders', String(orders.length));
    setText('kpiTicket', paid.length ? '$' + money(Math.round(revenue / paid.length)) : '$0');
    setText('kpiRepairsOpen', String(repairs.filter(r => !['entregado','cancelado'].includes(r.status)).length));

    // Ventas por mes (últimos 6, cobradas)
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); months.push({ key: d.getFullYear() + '-' + d.getMonth(), label: d.toLocaleDateString('es-AR', { month: 'short', year: '2-digit' }), value: 0 }); }
    paid.forEach(o => { const d = new Date(o.created_at); const k = d.getFullYear() + '-' + d.getMonth(); const m = months.find(x => x.key === k); if (m) m.value += Number(o.total) || 0; });
    document.getElementById('repSales').innerHTML = bars(months.map(m => ({ label: m.label, value: m.value, text: '$' + money(m.value) })), () => '#4CAF50');

    // Reparaciones por estado
    const byStatus = {};
    repairs.forEach(r => { const k = r.status || 'recibido'; byStatus[k] = (byStatus[k] || 0) + 1; });
    const repRows = Object.entries(byStatus).map(([k, v]) => ({ label: REPAIR_LABEL[k] || k, value: v })).sort((a, b) => b.value - a.value);
    document.getElementById('repRepairs').innerHTML = repairs.length ? bars(repRows, () => '#9C27B0') : '<p class="loading-text">Todavía no hay reparaciones.</p>';

    // Top productos vendidos
    const top = productsD.map(p => ({ label: p.name, value: Number(p.sold_count) || 0 })).filter(p => p.value > 0).sort((a, b) => b.value - a.value).slice(0, 8);
    document.getElementById('repTop').innerHTML = top.length ? bars(top, () => '#FF6A00') : '<p class="loading-text">Todavía no hay ventas registradas por producto.</p>';
  } catch (e) {
    console.error('reports', e);
    ['repSales','repRepairs','repTop'].forEach(id => { const el = document.getElementById(id); if (el) el.innerHTML = `<p class="loading-text" style="color:#ff4444">Error: ${esc(e.message)}</p>`; });
  }
}
