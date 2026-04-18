const cop = v => new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',minimumFractionDigits:0,maximumFractionDigits:0}).format(v);

// ── SUPPLIERS ─────────────────────────────────────────────────
export function renderSuppliers(suppliers) {
  return `
    <h2>Proveedores</h2>
    <button class="pl-btn pl-primary" id="addSupplierBtn">+ Nuevo Proveedor</button>
    <table style="width:100%;margin-top:1rem">
      <thead><tr><th>Nombre</th><th>Contacto</th><th>Email</th><th>Teléfono</th><th>Ciudad</th><th>Estado</th><th>Acciones</th></tr></thead>
      <tbody>${(suppliers||[]).map(s=>`<tr style="${s.active===false?'opacity:.5':''}">
        <td><strong>${s.name}</strong></td>
        <td>${s.contactPerson||'-'}</td>
        <td>${s.email||'-'}</td>
        <td>${s.phone||'-'}</td>
        <td>${s.city||'-'}</td>
        <td>${s.active===false?'<span style="color:#e74c3c">Inactivo</span>':'<span style="color:#27ae60">Activo</span>'}</td>
        <td>
          <button class="pl-btn pl-ghost" data-edit-supplier="${s._id}">Editar</button>
          <button class="pl-btn pl-primary" data-delete-supplier="${s._id}">Eliminar</button>
        </td>
      </tr>`).join('')}</tbody>
    </table>`;
}

export function renderSupplierForm(supplier) {
  const s = supplier || {};
  return `
    <h2>${s._id ? 'Editar' : 'Nuevo'} Proveedor</h2>
    <form id="supplierForm" style="max-width:600px;">
      <input type="hidden" id="supplierId" value="${s._id||''}">
      <label class="pl-label">Nombre *<input class="pl-input" id="supplierName" value="${s.name||''}" required></label>
      <label class="pl-label">Persona de Contacto<input class="pl-input" id="supplierContact" value="${s.contactPerson||''}"></label>
      <label class="pl-label">Email<input class="pl-input" type="email" id="supplierEmail" value="${s.email||''}"></label>
      <label class="pl-label">Teléfono<input class="pl-input" id="supplierPhone" value="${s.phone||''}"></label>
      <label class="pl-label">Dirección<input class="pl-input" id="supplierAddress" value="${s.address||''}"></label>
      <label class="pl-label">Ciudad<input class="pl-input" id="supplierCity" value="${s.city||''}"></label>
      <label class="pl-label">Notas<textarea class="pl-input" id="supplierNotes" rows="3">${s.notes||''}</textarea></label>
      <div style="margin-top:1rem;display:flex;gap:.5rem">
        <button type="submit" class="pl-btn pl-primary">${s._id?'Guardar Cambios':'Crear Proveedor'}</button>
        <button type="button" class="pl-btn pl-ghost" id="cancelSupplierBtn">Cancelar</button>
      </div>
    </form>`;
}

// ── WAREHOUSES ─────────────────────────────────────────────────
export function renderWarehouses(warehouses) {
  return `
    <h2>Almacenes</h2>
    <button class="pl-btn pl-primary" id="addWarehouseBtn">+ Nuevo Almacén</button>
    ${(warehouses||[]).map(w=>`
      <div class="pl-card" style="margin-top:1rem">
        <div class="pl-card-body">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:.5rem">
            <div>
              <h3 style="margin:0">${w.name}</h3>
              <p class="pl-muted" style="margin:4px 0">${w.location||'Sin ubicación'}</p>
            </div>
            <div style="display:flex;gap:.5rem">
              <button class="pl-btn pl-ghost" data-edit-warehouse="${w._id}">Editar</button>
              <button class="pl-btn pl-primary" data-delete-warehouse="${w._id}">Eliminar</button>
            </div>
          </div>
          <div style="margin-top:.75rem">
            <strong>Estanterías (${w.shelves?.length||0}):</strong>
            <div style="display:flex;flex-wrap:wrap;gap:.5rem;margin-top:.5rem">
              ${(w.shelves||[]).map(sh=>`
                <span style="background:#f0ece4;padding:4px 12px;border-radius:6px;font-size:.85rem;">
                  ${sh.code}${sh.label?' — '+sh.label:''}
                  <button class="pl-btn pl-ghost" style="padding:2px 6px;font-size:.7rem;margin-left:4px" data-remove-shelf="${w._id}||${sh._id}">✕</button>
                </span>`).join('')}
              <button class="pl-btn pl-ghost" style="font-size:.85rem" data-add-shelf="${w._id}">+ Estantería</button>
            </div>
          </div>
        </div>
      </div>`).join('')}`;
}

export function renderWarehouseForm(warehouse) {
  const w = warehouse || {};
  return `
    <h2>${w._id ? 'Editar' : 'Nuevo'} Almacén</h2>
    <form id="warehouseForm" style="max-width:600px;">
      <input type="hidden" id="warehouseId" value="${w._id||''}">
      <label class="pl-label">Nombre *<input class="pl-input" id="warehouseName" value="${w.name||''}" required></label>
      <label class="pl-label">Ubicación<input class="pl-input" id="warehouseLocation" value="${w.location||''}"></label>
      <div style="margin-top:1rem;display:flex;gap:.5rem">
        <button type="submit" class="pl-btn pl-primary">${w._id?'Guardar Cambios':'Crear Almacén'}</button>
        <button type="button" class="pl-btn pl-ghost" id="cancelWarehouseBtn">Cancelar</button>
      </div>
    </form>`;
}

// ── PURCHASE ORDERS (ALBARANES) ───────────────────────────────
export function renderPurchaseOrders(pos) {
  const statusColors = { borrador:'#999', enviado:'#2980b9', parcial:'#f39c12', completo:'#27ae60', cancelado:'#e74c3c' };
  return `
    <h2>Albaranes (Pedidos a Proveedores)</h2>
    <button class="pl-btn pl-primary" id="addPOBtn">+ Nuevo Albarán</button>
    <table style="width:100%;margin-top:1rem">
      <thead><tr><th>Nº Albarán</th><th>Proveedor</th><th>Productos</th><th>Costo Total</th><th>Estado</th><th>Fecha</th><th>Acciones</th></tr></thead>
      <tbody>${(pos||[]).map(po=>`<tr>
        <td><strong>${po.poNumber}</strong></td>
        <td>${po.supplierName}</td>
        <td>${po.items?.length||0} líneas</td>
        <td>${cop(po.totalCost||0)}</td>
        <td><span style="color:${statusColors[po.status]||'#555'};font-weight:600;text-transform:capitalize">${po.status}</span></td>
        <td>${new Date(po.createdAt).toLocaleDateString('es-CO')}</td>
        <td style="white-space:nowrap">
          <button class="pl-btn pl-ghost" data-view-po="${po._id}">Ver</button>
          ${po.status==='enviado'||po.status==='parcial'?`<button class="pl-btn pl-primary" data-receive-po="${po._id}">Recibir</button>`:''}
          ${po.status==='borrador'?`<button class="pl-btn pl-ghost" data-edit-po="${po._id}">Editar</button><button class="pl-btn pl-ghost" data-send-po="${po._id}">Enviar</button><button class="pl-btn pl-primary" data-delete-po="${po._id}">Eliminar</button>`:''}
          <button class="pl-btn pl-ghost" data-print-po="${po._id}">🖨️ PDF</button>
        </td>
      </tr>`).join('')}</tbody>
    </table>`;
}

export function renderPOForm(suppliers, products, po) {
  const isEdit = !!po;
  const items = po?.items || [];
  return `
    <h2>${isEdit?'Editar':'Nuevo'} Albarán</h2>
    <form id="poForm" style="max-width:960px;" novalidate>
      <input type="hidden" id="poId" value="${po?._id||''}">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
        <label class="pl-label">Proveedor *
          <select class="pl-input" id="poSupplier" required>
            <option value="">Seleccionar proveedor...</option>
            ${suppliers.map(s=>`<option value="${s._id}" data-name="${s.name}" ${po?.supplierId===s._id?'selected':''}>${s.name}</option>`).join('')}
          </select>
        </label>
        <label class="pl-label">Fecha estimada entrega
          <input class="pl-input" type="date" id="poExpectedDate" value="${po?.expectedDate?po.expectedDate.substring(0,10):''}">
        </label>
      </div>
      <label class="pl-label">Notas<textarea class="pl-input" id="poNotes" rows="2">${po?.notes||''}</textarea></label>

      <div id="poSupplierInfo" style="margin-top:1rem;padding:10px 14px;background:#f0ece4;border-radius:8px;display:${po?.supplierId?'block':'none'}">
        <span id="poSupplierLabel" style="font-weight:600">${po?.supplierName||'Selecciona un proveedor para ver sus productos'}</span>
        <span style="margin-left:1rem;font-size:.85rem;color:#666" id="poProductCount"></span>
      </div>

      <h3 style="margin-top:1.5rem">Líneas de Producto</h3>
      <div id="poLines">
        ${items.length>0 ? items.map((it,i)=>poLineTemplate(i, products, it)).join('') : ''}
      </div>
      <div style="display:flex;gap:.5rem;margin-top:.5rem">
        <button type="button" class="pl-btn pl-ghost" id="addPOLine">+ Agregar Producto Existente</button>
        <button type="button" class="pl-btn pl-ghost" id="addPONewLine" style="border-color:#27ae60;color:#27ae60">+ Producto Nuevo</button>
      </div>

      <div style="margin-top:1.5rem;display:flex;gap:.5rem">
        <button type="submit" class="pl-btn pl-primary">${isEdit?'Guardar Cambios':'Crear Albarán'}</button>
        <button type="button" class="pl-btn pl-ghost" id="cancelPOBtn">Cancelar</button>
      </div>
    </form>`;
}

export function poLineTemplate(index, products, item) {
  const it = item || {};
  const isNew = it.isNewProduct || false;
  if(isNew){
    return poNewLineTemplate(index, it);
  }
  return `
    <div class="po-line" data-line="${index}" data-new="false" style="display:grid;grid-template-columns:2fr 1fr 1fr auto;gap:.5rem;align-items:end;margin-top:.5rem;padding:.75rem;background:#faf9f7;border-radius:8px">
      <label class="pl-label" style="margin:0">Producto
        <select class="pl-input po-product" data-idx="${index}">
          <option value="">Seleccionar...</option>
          ${(products||[]).map(p=>{
            const hasV = p.variants && p.variants.length>0;
            if(hasV){
              return p.variants.map(v=>`<option value="${p._id}||${v._id}" data-pname="${p.name}" data-vlabel="${v.size}/${v.color}" ${it.productId===String(p._id)&&it.variantId===String(v._id)?'selected':''}>${p.name} — ${v.size}/${v.color}</option>`).join('');
            }
            return `<option value="${p._id}||" data-pname="${p.name}" data-vlabel="" ${it.productId===String(p._id)&&!it.variantId?'selected':''}>${p.name}</option>`;
          }).join('')}
        </select>
      </label>
      <label class="pl-label" style="margin:0">Cantidad
        <input class="pl-input po-qty" type="number" min="1" value="${it.quantityOrdered||1}">
      </label>
      <label class="pl-label" style="margin:0">Costo Unit.
        <input class="pl-input po-cost" type="number" min="0" step="100" value="${it.unitCost||0}">
      </label>
      <button type="button" class="pl-btn pl-primary po-remove-line" style="height:38px;padding:0 12px">✕</button>
    </div>`;
}

export function poNewLineTemplate(index, item) {
  const it = item || {};
  const npd = it.newProductData || {};
  return `
    <div class="po-line" data-line="${index}" data-new="true" style="margin-top:.5rem;padding:.75rem;background:#e8f5e9;border:1px solid #a5d6a7;border-radius:8px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.5rem">
        <span style="font-weight:600;color:#2e7d32">🆕 Producto Nuevo</span>
        <button type="button" class="pl-btn pl-primary po-remove-line" style="padding:2px 10px;font-size:.85rem">✕</button>
      </div>
      <div style="display:grid;grid-template-columns:2fr 1fr 1fr;gap:.5rem;align-items:end">
        <label class="pl-label" style="margin:0">Nombre del producto *
          <input class="pl-input po-new-name" value="${it.productName||''}" placeholder="Ej: Camiseta Monastery">
        </label>
        <label class="pl-label" style="margin:0">Categoría
          <select class="pl-input po-new-category">
            <option value="ropa" ${npd.category==='ropa'||!npd.category?'selected':''}>Ropa</option>
            <option value="hogar" ${npd.category==='hogar'?'selected':''}>Hogar</option>
          </select>
        </label>
        <label class="pl-label" style="margin:0">Precio Venta
          <input class="pl-input po-new-price" type="number" min="0" step="100" value="${npd.price||0}" placeholder="Precio público">
        </label>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:.5rem;margin-top:.5rem;align-items:end">
        <label class="pl-label" style="margin:0">Cantidad a Pedir *
          <input class="pl-input po-qty" type="number" min="1" value="${it.quantityOrdered||1}">
        </label>
        <label class="pl-label" style="margin:0">Costo Unitario
          <input class="pl-input po-cost" type="number" min="0" step="100" value="${it.unitCost||0}">
        </label>
        <label class="pl-label" style="margin:0">Descripción
          <input class="pl-input po-new-desc" value="${npd.description||''}" placeholder="Opcional">
        </label>
      </div>
    </div>`;
}

// ── VIEW SINGLE PO (Detail) ──
export function renderPODetail(po) {
  const statusColors = { borrador:'#999', enviado:'#2980b9', parcial:'#f39c12', completo:'#27ae60', cancelado:'#e74c3c' };
  return `
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem">
      <h2>Albarán ${po.poNumber}</h2>
      <span style="background:${statusColors[po.status]||'#555'};color:#fff;padding:6px 16px;border-radius:20px;font-weight:600;text-transform:capitalize">${po.status}</span>
    </div>
    <div class="pl-card" style="margin-top:1rem"><div class="pl-card-body">
      <p><strong>Proveedor:</strong> ${po.supplierName}</p>
      ${po.expectedDate?`<p><strong>Fecha estimada:</strong> ${new Date(po.expectedDate).toLocaleDateString('es-CO')}</p>`:''}
      ${po.notes?`<p><strong>Notas:</strong> ${po.notes}</p>`:''}
    </div></div>

    <table style="width:100%;margin-top:1rem">
      <thead><tr style="background:#8b7355;color:#fff">
        <th style="padding:10px 12px;text-align:left">Producto</th>
        <th style="padding:10px 12px;text-align:center">Variante</th>
        <th style="padding:10px 12px;text-align:center">Pedido</th>
        <th style="padding:10px 12px;text-align:center">Recibido</th>
        <th style="padding:10px 12px;text-align:center">Estado</th>
        <th style="padding:10px 12px;text-align:right">Costo Unit.</th>
        <th style="padding:10px 12px;text-align:right">Subtotal</th>
      </tr></thead>
      <tbody>${(po.items||[]).map(it=>{
        const diff = it.quantityReceived - it.quantityOrdered;
        let stLabel = '<span style="color:#999">Pendiente</span>';
        if(it.quantityReceived >= it.quantityOrdered) stLabel = '<span style="color:#27ae60">✔ Completo</span>';
        else if(it.quantityReceived > 0) stLabel = `<span style="color:#f39c12">Parcial (faltan ${-diff})</span>`;
        if(diff > 0) stLabel = `<span style="color:#2980b9">+${diff} excedente</span>`;
        return `<tr>
          <td style="padding:8px 12px">${it.productName}</td>
          <td style="padding:8px 12px;text-align:center">${it.variantLabel||'-'}</td>
          <td style="padding:8px 12px;text-align:center">${it.quantityOrdered}</td>
          <td style="padding:8px 12px;text-align:center;font-weight:600">${it.quantityReceived||0}</td>
          <td style="padding:8px 12px;text-align:center">${stLabel}</td>
          <td style="padding:8px 12px;text-align:right">${cop(it.unitCost||0)}</td>
          <td style="padding:8px 12px;text-align:right">${cop((it.unitCost||0)*it.quantityOrdered)}</td>
        </tr>`;
      }).join('')}</tbody>
      <tfoot><tr style="border-top:2px solid #8b7355">
        <td colspan="6" style="padding:10px 12px;text-align:right;font-weight:700">TOTAL:</td>
        <td style="padding:10px 12px;text-align:right;font-weight:700;font-size:1.1rem">${cop(po.totalCost||0)}</td>
      </tr></tfoot>
    </table>

    <div style="margin-top:1rem;display:flex;gap:.5rem">
      <button class="pl-btn pl-ghost" id="backToPOs">← Volver</button>
      <button class="pl-btn pl-ghost" data-print-po="${po._id}">🖨️ Imprimir PDF</button>
    </div>`;
}

// ── RECEIVE GOODS FORM ──
export function renderReceiveForm(po, warehouses) {
  return `
    <h2>Recibir Mercancía — ${po.poNumber}</h2>
    <p class="pl-muted">Proveedor: <strong>${po.supplierName}</strong></p>
    <form id="receiveForm">
      <table style="width:100%;margin-top:1rem">
        <thead><tr style="background:#8b7355;color:#fff">
          <th style="padding:10px 12px;text-align:left">Producto</th>
          <th style="padding:10px 12px;text-align:center">Pedido</th>
          <th style="padding:10px 12px;text-align:center">Ya Recibido</th>
          <th style="padding:10px 12px;text-align:center">Recibir Ahora</th>
          <th style="padding:10px 12px">Almacén</th>
          <th style="padding:10px 12px">Estantería</th>
        </tr></thead>
        <tbody>${(po.items||[]).map(it=>{
          const pending = it.quantityOrdered - (it.quantityReceived||0);
          return `<tr data-item-id="${it._id}">
            <td style="padding:8px 12px">${it.productName}${it.variantLabel?` <em>(${it.variantLabel})</em>`:''}</td>
            <td style="padding:8px 12px;text-align:center">${it.quantityOrdered}</td>
            <td style="padding:8px 12px;text-align:center">${it.quantityReceived||0}</td>
            <td style="padding:8px 12px;text-align:center">
              <input class="pl-input recv-qty" type="number" min="0" max="${pending}" value="${pending>0?pending:0}" style="width:80px;text-align:center" ${pending<=0?'disabled':''}>
            </td>
            <td style="padding:8px 12px">
              <select class="pl-input recv-warehouse" style="min-width:120px">
                <option value="">—</option>
                ${warehouses.map(w=>`<option value="${w._id}" data-shelves='${JSON.stringify(w.shelves||[])}'>${w.name}</option>`).join('')}
              </select>
            </td>
            <td style="padding:8px 12px">
              <select class="pl-input recv-shelf" style="min-width:100px">
                <option value="">—</option>
              </select>
            </td>
          </tr>`;
        }).join('')}</tbody>
      </table>
      <div style="margin-top:1rem;display:flex;gap:.5rem">
        <button type="submit" class="pl-btn pl-primary">Confirmar Recepción</button>
        <button type="button" class="pl-btn pl-ghost" id="cancelReceiveBtn">Cancelar</button>
      </div>
    </form>`;
}

// ── STOCK MOVEMENTS ──
export function renderStockMovements(movements) {
  const typeIcons = { entrada:'📥', salida:'📤', ajuste:'🔧' };
  const typeColors = { entrada:'#27ae60', salida:'#e74c3c', ajuste:'#2980b9' };
  return `
    <h2>Movimientos de Inventario</h2>
    <table style="width:100%;margin-top:1rem">
      <thead><tr><th>Fecha</th><th>Tipo</th><th>Producto</th><th>Variante</th><th>Cantidad</th><th>Razón</th><th>Almacén</th><th>Estantería</th><th>Usuario</th></tr></thead>
      <tbody>${(movements||[]).map(m=>`<tr>
        <td>${new Date(m.createdAt).toLocaleString('es-CO')}</td>
        <td><span style="color:${typeColors[m.type]||'#555'};font-weight:600">${typeIcons[m.type]||''} ${m.type}</span></td>
        <td>${m.productName}</td>
        <td>${m.variantLabel||'-'}</td>
        <td style="font-weight:600">${m.type==='salida'?'-':''}${m.quantity}</td>
        <td class="pl-muted">${m.reason||'-'}</td>
        <td>${m.warehouseName||'-'}</td>
        <td>${m.shelfCode||'-'}</td>
        <td>${m.userName||'-'}</td>
      </tr>`).join('')}</tbody>
    </table>`;
}

// ── LOW STOCK ALERTS ──
export function renderLowStock(alerts) {
  return `
    <h2>Alertas de Stock Bajo</h2>
    <p class="pl-muted">Productos con stock igual o menor al umbral (5 unidades por defecto)</p>
    ${alerts.length===0?'<div class="pl-card"><div class="pl-card-body" style="text-align:center;color:#27ae60"><h3>✅ Todo en orden</h3><p>No hay productos con stock bajo.</p></div></div>':''}
    <table style="width:100%;margin-top:1rem">
      ${alerts.length>0?`<thead><tr><th>Producto</th><th>Variante</th><th>Stock Actual</th><th>Umbral</th><th>Estado</th></tr></thead>
      <tbody>${alerts.map(a=>`<tr class="${a.currentStock===0?'stock-out':'stock-low'}">
        <td><strong>${a.productName}</strong></td>
        <td>${a.variantLabel||'General'}</td>
        <td style="font-weight:700;color:${a.currentStock===0?'#e74c3c':'#f39c12'}">${a.currentStock}</td>
        <td>${a.threshold}</td>
        <td>${a.currentStock===0?'<span style="color:#e74c3c;font-weight:700">⛔ AGOTADO</span>':'<span style="color:#f39c12;font-weight:700">⚠️ BAJO</span>'}</td>
      </tr>`).join('')}</tbody>`:''}
    </table>`;
}

// ── PDF PRINT ──
export function printPurchaseOrder(po) {
  const itemsRows = (po.items||[]).map(it=>`
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #ddd">${it.productName}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #ddd;text-align:center">${it.variantLabel||'-'}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #ddd;text-align:center">${it.quantityOrdered}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #ddd;text-align:right">${cop(it.unitCost||0)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #ddd;text-align:right">${cop((it.unitCost||0)*it.quantityOrdered)}</td>
    </tr>`).join('');

  const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8">
<title>Albarán ${po.poNumber}</title>
<style>
  body{font-family:'Segoe UI',Arial,sans-serif;margin:0;padding:20px;color:#333}
  .header{background:#8b7355;color:#fff;padding:20px 30px;display:flex;justify-content:space-between;align-items:center}
  .header h1{margin:0;font-size:20px;letter-spacing:2px}
  .header .po-num{font-size:24px;font-weight:700}
  .info{display:grid;grid-template-columns:1fr 1fr;gap:20px;padding:20px 30px;background:#faf9f7}
  .info p{margin:4px 0}
  table{width:100%;border-collapse:collapse;margin-top:20px}
  thead tr{background:#8b7355;color:#fff}
  th{padding:10px 12px;text-align:left;font-weight:600}
  tfoot td{padding:10px 12px;border-top:2px solid #8b7355;font-weight:700}
  .footer{margin-top:40px;padding-top:20px;border-top:1px solid #ddd;display:grid;grid-template-columns:1fr 1fr;gap:40px}
  .sig-line{border-top:1px solid #333;margin-top:60px;padding-top:8px;text-align:center;font-size:13px;color:#666}
  @media print{body{padding:0}button{display:none!important}}
</style></head>
<body>
  <div class="header">
    <h1>PURA LINO</h1>
    <div class="po-num">${po.poNumber}</div>
  </div>
  <div class="info">
    <div>
      <p><strong>Proveedor:</strong> ${po.supplierName}</p>
      <p><strong>Fecha Emisión:</strong> ${new Date(po.createdAt).toLocaleDateString('es-CO')}</p>
      ${po.expectedDate?`<p><strong>Fecha Estimada:</strong> ${new Date(po.expectedDate).toLocaleDateString('es-CO')}</p>`:''}
    </div>
    <div>
      <p><strong>Estado:</strong> ${po.status}</p>
      ${po.notes?`<p><strong>Notas:</strong> ${po.notes}</p>`:''}
    </div>
  </div>
  <table>
    <thead><tr>
      <th>Producto</th><th style="text-align:center">Variante</th><th style="text-align:center">Cantidad</th><th style="text-align:right">Costo Unit.</th><th style="text-align:right">Subtotal</th>
    </tr></thead>
    <tbody>${itemsRows}</tbody>
    <tfoot><tr>
      <td colspan="4" style="text-align:right">TOTAL:</td>
      <td style="text-align:right;font-size:1.1rem">${cop(po.totalCost||0)}</td>
    </tr></tfoot>
  </table>
  <div class="footer">
    <div><div class="sig-line">Firma Autorizada — Pura Lino</div></div>
    <div><div class="sig-line">Firma Proveedor</div></div>
  </div>
  <script>window.onload=()=>window.print();</script>
</body></html>`;

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
}
