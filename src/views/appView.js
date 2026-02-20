import { getPaymentName } from '../strategies/payment.js';
import * as inv from './inventoryView.js';

function cop(value) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
}

export { cop };

export class AppView {
  constructor(){
    this.refs = {
      productsGrid: document.getElementById('productsGrid'),
      cartCount: document.querySelector('.pl-cart-count'),
      cartModal: document.getElementById('cartModal'),
      cartItems: document.getElementById('cartItems'),
      cartTotal: document.getElementById('cartTotal'),
      promoCode: document.getElementById('promoCode'),
      loginModal: document.getElementById('loginModal'),
      registerModal: document.getElementById('registerModal'),
      orderModal: document.getElementById('orderModal'),
      invoiceModal: document.getElementById('invoiceModal'),
      invoiceContent: document.getElementById('invoiceContent'),
      notification: document.getElementById('notification'),
      mainHome: document.getElementById('homeSection'),
      sectionProducts: document.getElementById('productsSection'),
      customerSection: document.getElementById('customerSection'),
      adminSection: document.getElementById('adminSection'),
      aboutSection: document.getElementById('aboutSection'),
      contactSection: document.getElementById('contactSection'),
      userActions: document.querySelector('.pl-actions'),
      customerContent: document.getElementById('customerContent'),
      adminContent: document.getElementById('adminContent'),
      productModal: document.getElementById('productModal'),
      reviewsModal: document.getElementById('reviewsModal'),
      trackingModal: document.getElementById('trackingModal'),
      variantsModal: document.getElementById('variantsModal'),
    };
    // close modal buttons
    document.querySelectorAll('.pl-modal-close').forEach(btn=>btn.addEventListener('click', (e)=>{
      const id = btn.getAttribute('data-close');
      this.toggleModal(id,false);
    }));
  }

  toast(msg, type='success'){
    const n = this.refs.notification; n.textContent = msg; n.classList.add('show');
    setTimeout(()=> n.classList.remove('show'), 2500);
  }

  showSessionWarning() {
    const n = this.refs.notification; 
    n.textContent = '⚠️ Tu sesión expirará en 10 segundos por inactividad'; 
    n.classList.add('show');
    setTimeout(()=> n.classList.remove('show'), 5000);
  }

  showSessionExpired() {
    const n = this.refs.notification; 
    n.textContent = '⏰ Tu sesión ha expirado por inactividad. Redirigiendo al inicio...'; 
    n.classList.add('show');
    setTimeout(()=> n.classList.remove('show'), 8000);
  }

  toggleModal(id, show){ const el=document.getElementById(id); if(!el) return; el.setAttribute('aria-hidden', show? 'false':'true'); }

  renderProducts(products, recommendations){
    const recIds = new Set(recommendations.map(r=>r.id));
    this.refs.productsGrid.innerHTML = products.map(p=>{
      const rec = recIds.has(p.id) ? '<span class="pl-badge" style="position:static;">Recomendado</span>' : '';
      const hasVariants = Array.isArray(p.variants) && p.variants.length>0;
      const outOfStock = hasVariants
        ? p.variants.every(v=>(v.stock||0)<=0)
        : (p.stock||0)<=0;
      let variantControls = '';
      if(hasVariants){
        const sizes = [...new Set(p.variants.map(v=>v.size))];
        const colors = [...new Set(p.variants.map(v=>v.color))];
        variantControls = `
          <div class="pl-row-gap">
            <label style="display:block">Talla
              <select class="pl-input" data-variant-size ${outOfStock?'disabled':''}>
                ${sizes.map(s=>`<option value="${s}">${s}</option>`).join('')}
              </select>
            </label>
            <label style="display:block">Color
              <select class="pl-input" data-variant-color ${outOfStock?'disabled':''}>
                ${colors.map(c=>`<option value="${c}">${c}</option>`).join('')}
              </select>
            </label>
          </div>`;
      }
      const mainImg = (p.images && p.images.length > 0)
        ? `<img src="${p.images[0].url}" alt="${p.name}" style="width:100%;height:100%;object-fit:cover">`
        : '👕';
      const stockBadge = outOfStock ? '<span class="pl-badge" style="position:absolute;top:10px;left:10px;background:#e74c3c;color:#fff;z-index:1;">Agotado</span>' : '';
      return `
        <div class="pl-card" ${outOfStock?'style="opacity:0.6;"':''}>
          <div class="pl-img" style="position:relative;">${stockBadge}${mainImg}</div>
          <div class="pl-card-body">
            <div class="pl-row-gap" style="justify-content:space-between;align-items:center;">
              <h3 class="pl-name">${p.name}</h3>
              <div class="pl-row-gap" style="gap:0.5rem;align-items:center;">
                ${rec}
                <button class="pl-btn pl-ghost" title="Favorito" data-wishlist="${p.id}">❤</button>
              </div>
            </div>
            <p class="pl-muted">${p.description||''}</p>
            <div class="pl-price">${cop(p.price)}</div>
            ${variantControls}
            <div class="pl-row-gap" style="margin-top:0.5rem;gap:0.5rem">
              ${outOfStock
                ? '<button class="pl-btn" disabled style="background:#ccc;cursor:not-allowed;">Agotado</button>'
                : `<button class="pl-btn pl-primary" data-add="${p.id}">Agregar al Carrito</button>`}
              <button class="pl-btn pl-ghost" data-reviews="${p.id}">Ver reseñas</button>
            </div>
          </div>
        </div>`;
    }).join('');
  }

  updateCartCount(count){ 
    if (this.refs.cartCount) {
      this.refs.cartCount.textContent = count;
    }
  }

  renderCart(cart, currentPromo){
    if(!this.refs.cartItems || !this.refs.cartTotal) {
      console.warn('Cart elements not found');
      return;
    }
    
    if(cart.length===0){
      this.refs.cartItems.innerHTML = '<p>Tu carrito está vacío</p>';
      this.refs.cartTotal.innerHTML = '';
      return;
    }
    let total = 0;
    this.refs.cartItems.innerHTML = cart.map(item=>{
      const sub = item.product.price * item.quantity; total+=sub;
      const variantLabel = item.variant? ` <span class="pl-muted">(${item.variant.size}/${item.variant.color})</span>`: '';
      const removePayload = `${item.productId}||${item.variantId||''}`;
      return `<div class="pl-card pl-mt"><div class="pl-card-body">
        <h4>${item.product.name}${variantLabel}</h4>
        <p>Precio: ${cop(item.product.price)} x ${item.quantity} = ${cop(sub)}</p>
        <button class="pl-btn pl-ghost" data-remove="${removePayload}">Eliminar</button>
      </div></div>`;
    }).join('');
    if(currentPromo){
      const discount = cart.reduce((s,i)=>s+(i.product.price*i.quantity)*(currentPromo.discount/100),0);
      const newTotal = cart.reduce((s,i)=>s+(i.product.price*i.quantity),0) - discount;
      this.refs.cartTotal.innerHTML = `<div>Subtotal: ${cop(cart.reduce((s,i)=>s+(i.product.price*i.quantity),0))}</div><div>Descuento (${currentPromo.code}): -${cop(discount)}</div><div class="pl-total">Total: ${cop(newTotal)}</div>`;
    } else {
      this.refs.cartTotal.innerHTML = `<div class="pl-total">Total: ${cop(cart.reduce((s,i)=>s+(i.product.price*i.quantity),0))}</div>`;
    }
    // add continue shopping button if missing
    if(!document.getElementById('continueShoppingBtn') && cart.length > 0){
      const continueBtn = document.createElement('button');
      continueBtn.className = 'pl-btn pl-primary';
      continueBtn.textContent = 'Continuar Comprando';
      continueBtn.id = 'continueShoppingBtn';
      continueBtn.style.marginTop = '1rem';
      this.refs.cartItems.appendChild(continueBtn);
      continueBtn.addEventListener('click', ()=> this.toggleModal('cartModal', false));
      this.refs.cartItems.parentElement.appendChild(continueBtn);
    }
  }

  setUserUI(user){
    console.log('🔧 setUserUI called with user:', !!user);
    console.log('🔧 this.refs.userActions:', this.refs.userActions);
    console.log('🔧 userActions element:', document.querySelector('.pl-actions'));
    
    if(!this.refs.userActions) {
      console.warn('User actions element not found');
      // Try to find it dynamically
      this.refs.userActions = document.querySelector('.pl-actions');
      console.log('🔧 Updated userActions ref:', this.refs.userActions);
    }
    
    if(!user){
      console.log('🔧 Setting up UI for non-logged user');
      this.refs.userActions.innerHTML = `
        <button class="pl-icon-btn" id="cartBtn" aria-label="Carrito de compras">
          🛒 <span class="pl-cart-count">0</span>
        </button>
        <button class="pl-btn pl-ghost" id="loginBtn">Iniciar Sesión</button>
        <button class="pl-btn pl-primary" id="registerBtn">Registrarse</button>
      `;
    } else {
      console.log('🔧 Setting up UI for logged user');
      // Check if user is admin
      const isAdmin = user.role === 'admin';
      this.refs.userActions.innerHTML = `
        <button class="pl-icon-btn" id="cartBtn" aria-label="Carrito de compras">
          🛒 <span class="pl-cart-count">0</span>
        </button>
        <button class="pl-btn pl-ghost" id="${isAdmin ? 'adminPanelBtn' : 'myAccountBtn'}">${isAdmin ? 'Panel Admin' : 'Mi Cuenta'}</button>
        <button class="pl-btn pl-primary" id="logoutBtn">Cerrar Sesión</button>
      `;
    }
    // Re-bind cart button after UI update
    this.refs.cartCount = document.querySelector('.pl-cart-count');
    
    // Force immediate re-bind by calling controller method directly
    console.log('🔧 Forcing immediate re-bind...');
    if (typeof window.appController !== 'undefined' && window.appController.bindHeaderActions) {
      console.log('🔧 Calling window.appController.bindHeaderActions()');
      // Call the controller method directly
      setTimeout(() => {
        window.appController.bindHeaderActions();
      }, 10);
    } else {
      console.log('🔧 window.appController not available');
    }
  }

  showSections({home=true, products=true, customer=false, admin=false, about=false, contact=false}){
    this.refs.mainHome.style.display = home? 'block':'none';
    this.refs.sectionProducts.style.display = products? 'block':'none';
    this.refs.customerSection.style.display = customer? 'block':'none';
    this.refs.adminSection.style.display = admin? 'block':'none';
    if(this.refs.aboutSection) this.refs.aboutSection.style.display = about? 'block':'none';
    if(this.refs.contactSection) this.refs.contactSection.style.display = contact? 'block':'none';
  }

  renderCustomerHome(user){
    const name = user.name||''; const email = user.email||''; const username = user.username||''; const address=user.address||''; const phone=user.phone||'';
    const emailVerified = user.emailVerified || false;
    const verificationStatus = emailVerified 
      ? '<span style="color: #28a745;">✅ Cuenta Verificada</span>'
      : '<span style="color: #dc3545;">❌ Cuenta sin Verificar</span>';
    
    this.refs.customerContent.innerHTML = `
      <h3>Mi Perfil</h3>
      <div class="pl-card pl-mb">
        <div class="pl-card-body">
          <h4>Estado de Verificación</h4>
          <p>${verificationStatus}</p>
          ${!emailVerified ? `
            <p class="pl-muted">Revisa tu correo para el enlace de verificación. ¿No lo recibiste?</p>
            <button class="pl-btn pl-ghost" id="resendVerificationBtn">Reenviar Correo de Verificación</button>
          ` : ''}
        </div>
      </div>
      <form id="profileForm" class="pl-form" style="max-width:420px">
        <label>Nombre Completo<input id="profileName" class="pl-input" value="${name}" /></label>
        <label>Usuario<input id="profileUsername" class="pl-input" value="${username}" /></label>
        <label>Dirección<textarea id="profileAddress" class="pl-input" rows="3">${address}</textarea></label>
        <label>Teléfono<input id="profilePhone" class="pl-input" value="${phone}" /></label>
        <label>Correo Electrónico<input id="profileEmail" class="pl-input" value="${email}" disabled /></label>
        <div class="pl-row-gap" style="margin-top:0.5rem">
          <button class="pl-btn pl-primary" type="button" id="saveProfileBtn">Guardar Cambios</button>
        </div>
      </form>`;
  }

  renderPurchaseHistory(orders){
    if(orders.length===0){ this.refs.customerContent.innerHTML = '<p>No tienes pedidos anteriores</p>'; return; }
    this.refs.customerContent.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:.5rem">
        <h3 style="margin:0">Historial de Compras</h3>
        <button class="pl-btn pl-ghost" id="myReturnsBtn" style="font-size:.9rem">📦 Mis Devoluciones</button>
      </div>
      <table style="width:100%;border-collapse:collapse">
        <thead><tr><th>Pedido #</th><th>Fecha</th><th>Total</th><th>Estado</th><th>Acciones</th></tr></thead>
        <tbody>
          ${orders.map(o=>{ const oid = o._id || o.id; return `<tr><td>${o.id}</td><td>${new Date(o.date).toLocaleDateString()}</td><td>${cop(o.total)}</td><td>${o.status}</td><td><button class=\"pl-btn pl-ghost\" data-view-invoice=\"${oid}\">Ver Factura</button> <button class=\"pl-btn pl-primary\" data-track-order=\"${oid}\">Rastrear</button> <button class=\"pl-btn pl-ghost\" data-return-order=\"${oid}\">Devolver</button></td></tr>`; }).join('')}
        </tbody>
      </table>`;
  }

  renderInvoice(order){
    const html = `
      <div id="invoicePrintArea" style="font-family:'Segoe UI',Arial,sans-serif;max-width:700px;margin:0 auto;padding:24px;background:#fff;color:#000">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #8b7355;padding-bottom:16px;margin-bottom:20px">
          <div>
            <h1 style="margin:0;color:#8b7355;font-size:1.8rem;letter-spacing:1px">PURA LINO</h1>
            <p style="margin:4px 0 0;color:#888;font-size:.85rem">Lino Puro, Comodidad Pura</p>
          </div>
          <div style="text-align:right">
            <h2 style="margin:0;color:#333;font-size:1.1rem">FACTURA</h2>
            <p style="margin:4px 0 0;font-size:1rem;font-weight:700;color:#8b7355">${order.invoiceNumber||'—'}</p>
            <p style="margin:4px 0 0;font-size:.85rem;color:#888">${new Date(order.date).toLocaleDateString('es-CO',{year:'numeric',month:'long',day:'numeric'})}</p>
          </div>
        </div>

        <div style="display:flex;justify-content:space-between;gap:2rem;margin-bottom:20px">
          <div style="flex:1">
            <p style="margin:0 0 4px;font-weight:700;color:#555;font-size:.8rem;text-transform:uppercase;letter-spacing:.5px">Facturar a</p>
            <p style="margin:0;font-weight:600">${order.userName||'—'}</p>
            <p style="margin:2px 0;color:#555;font-size:.9rem">${order.email||''}</p>
            <p style="margin:2px 0;color:#555;font-size:.9rem">${order.phone||''}</p>
          </div>
          <div style="flex:1">
            <p style="margin:0 0 4px;font-weight:700;color:#555;font-size:.8rem;text-transform:uppercase;letter-spacing:.5px">Enviar a</p>
            <p style="margin:0;font-size:.9rem;color:#333">${order.address||'—'}</p>
            ${order.shippingCity?`<p style="margin:2px 0;font-size:.9rem;color:#555">${order.shippingCity}</p>`:''}
          </div>
        </div>

        <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
          <thead>
            <tr style="background:#8b7355;color:#fff">
              <th style="padding:10px 12px;text-align:left;font-size:.85rem">Producto</th>
              <th style="padding:10px 12px;text-align:center;font-size:.85rem;width:60px">Cant.</th>
              <th style="padding:10px 12px;text-align:right;font-size:.85rem;width:120px">Precio Unit.</th>
              <th style="padding:10px 12px;text-align:right;font-size:.85rem;width:120px">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${order.items.map((i,idx)=>`<tr style="background:${idx%2===0?'#faf9f7':'#fff'}">
              <td style="padding:8px 12px;border-bottom:1px solid #eee">${i.product.name}${i.variant?` <span style="color:#888;font-size:.85rem">(${i.variant.size||''}/${i.variant.color||''})</span>`:''}</td>
              <td style="padding:8px 12px;text-align:center;border-bottom:1px solid #eee">${i.quantity}</td>
              <td style="padding:8px 12px;text-align:right;border-bottom:1px solid #eee">${cop(i.product.price)}</td>
              <td style="padding:8px 12px;text-align:right;border-bottom:1px solid #eee">${cop(i.product.price*i.quantity)}</td>
            </tr>`).join('')}
          </tbody>
        </table>

        <div style="display:flex;justify-content:flex-end">
          <div style="width:280px">
            <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:.9rem;color:#555">
              <span>Subtotal</span><span>${cop(order.subtotal)}</span>
            </div>
            ${order.discount>0?`<div style="display:flex;justify-content:space-between;padding:6px 0;font-size:.9rem;color:#e74c3c">
              <span>Descuento</span><span>-${cop(order.discount)}</span>
            </div>`:''}
            ${order.giftApplied>0?`<div style="display:flex;justify-content:space-between;padding:6px 0;font-size:.9rem;color:#27ae60">
              <span>Gift Card (${order.giftCardCode||''})</span><span>-${cop(order.giftApplied)}</span>
            </div>`:''}
            ${order.shippingCost>0?`<div style="display:flex;justify-content:space-between;padding:6px 0;font-size:.9rem;color:#555">
              <span>Envío (${order.shippingCity||''})</span><span>${cop(order.shippingCost)}</span>
            </div>`:''}
            <div style="display:flex;justify-content:space-between;padding:10px 0;border-top:2px solid #8b7355;margin-top:4px;font-size:1.1rem;font-weight:700;color:#333">
              <span>TOTAL</span><span>${cop(order.total)}</span>
            </div>
            <div style="text-align:right;font-size:.85rem;color:#888;margin-top:2px">
              Pago: ${getPaymentName(order.paymentMethod)}
            </div>
          </div>
        </div>

        <div style="margin-top:30px;padding-top:16px;border-top:1px solid #eee;text-align:center;font-size:.8rem;color:#aaa">
          <p style="margin:0">Pura Lino — Bogotá, Colombia — contacto@puralino.com</p>
          <p style="margin:4px 0 0">Gracias por tu compra</p>
        </div>
      </div>`;
    this.refs.invoiceContent.innerHTML = html;
  }

  toggleModal(id, show){
    console.log('🔧 Toggle modal:', id, show);
    const modal = this.refs[id];
    console.log('🔧 Modal element found:', !!modal);
    
    if(!modal) {
      console.warn('🔧 Modal not found:', id);
      return;
    }
    
    if(show){
      console.log('🔧 Showing modal:', id);
      modal.style.display = 'flex';
    } else {
      console.log('🔧 Hiding modal:', id);
      modal.style.display = 'none';
    }
  }

  renderAdmin(section, state){
    const el = this.refs.adminContent;
    switch(section){
      case 'dashboard':{
        const t = state.totals();
        el.innerHTML = `
          <h2>Panel Principal</h2>
          <div class="pl-grid" style="grid-template-columns:repeat(auto-fit,minmax(220px,1fr));">
            <div class="pl-card"><div class="pl-card-body"><h3>Total Pedidos</h3><p style="font-size:1.6rem">${state.state.orders.length}</p></div></div>
            <div class="pl-card"><div class="pl-card-body"><h3>Total Productos</h3><p style="font-size:1.6rem">${state.state.products.length}</p></div></div>
            <div class="pl-card"><div class="pl-card-body"><h3>Total Clientes</h3><p style="font-size:1.6rem">${state.state.users.filter(u=>u.role==='client').length}</p></div></div>
            <div class="pl-card"><div class="pl-card-body"><h3>Total Ventas</h3><p style="font-size:1.6rem">${cop(t.totalSales)}</p></div></div>
          </div>`;
        break; }
      case 'products':{
        el.innerHTML = `
          <h2>Gestión de Productos</h2>
          <button class="pl-btn pl-primary" id="addProductBtn">+ Nuevo Producto</button>
          <table style="width:100%;margin-top:1rem">
            <thead><tr><th>Imagen</th><th>Nombre</th><th>Proveedor</th><th>Categoría</th><th>Precio</th><th>Stock</th><th>Acciones</th></tr></thead>
            <tbody>${state.state.products.map(p=>{
              const hasVar = Array.isArray(p.variants) && p.variants.length>0;
              const noStock = hasVar ? p.variants.every(v=>(v.stock||0)<=0) : (p.stock||0)<=0;
              const thumb = (p.images && p.images.length > 0) ? `<img src="${p.images[0].url}" style="width:48px;height:48px;object-fit:cover;border-radius:6px;">` : '<span style="font-size:1.5rem">👕</span>';
              return `<tr style="${noStock?'background:#f8d7da;opacity:0.7;':''}">
                <td style="width:60px;text-align:center">${thumb}</td>
                <td><strong>${p.name}</strong>${noStock?' <span style="color:#e74c3c;font-size:.75rem;font-weight:700;">⛔ AGOTADO</span>':''}<br><span class="pl-muted" style="font-size:.8rem">${(p.description||'').substring(0,40)}</span></td>
                <td style="font-size:.85rem">${p.supplierName||'<span class="pl-muted">—</span>'}</td>
                <td>${p.category||''}</td>
                <td>${cop(p.price)}</td>
                <td style="${noStock?'color:#e74c3c;font-weight:700;':''}">${p.stock}</td>
                <td>
                  <button class="pl-btn pl-ghost" data-edit-product="${p.id}">Editar</button>
                  <button class="pl-btn pl-ghost" data-edit-variants="${p.id}">Variantes</button>
                  <button class="pl-btn pl-primary" data-delete-product="${p.id}">Eliminar</button>
                </td>
              </tr>`;
            }).join('')}</tbody>
          </table>`;
        break; }
      case 'clients':{
        el.innerHTML = `
          <h2>Gestión de Clientes</h2>
          <table style="width:100%;margin-top:1rem">
            <thead><tr><th>ID</th><th>Nombre</th><th>Email</th><th>Usuario</th><th>Acciones</th></tr></thead>
            <tbody>${state.state.users.filter(u=>u.role==='client').map(u=>`<tr><td>${u.id}</td><td>${u.name}</td><td>${u.email||'N/A'}</td><td>${u.username}</td><td><button class="pl-btn pl-ghost" data-view-client-orders="${u.id}">Ver Pedidos</button></td></tr>`).join('')}</tbody>
          </table>`;
        break; }
      case 'orders':{
        const statusCol = { confirmado:'#f39c12', enviado:'#2980b9', entregado:'#27ae60' };
        el.innerHTML = `
          <h2>Gestión de Pedidos</h2>
          <table style="width:100%;margin-top:1rem">
            <thead><tr><th>Factura</th><th>Cliente</th><th>Total</th><th>Estado</th><th>Fecha</th><th>Acciones</th></tr></thead>
            <tbody>${state.state.orders.map(o=>`<tr>
              <td><strong>${o.invoiceNumber||o.id}</strong></td>
              <td>${o.userName||'—'}</td>
              <td>${cop(o.total)}</td>
              <td><span style="background:${statusCol[o.status]||'#999'};color:#fff;padding:3px 10px;border-radius:12px;font-size:.8rem;font-weight:600">${o.status}</span></td>
              <td>${new Date(o.date).toLocaleDateString('es-CO')}</td>
              <td><button class="pl-btn pl-primary" data-admin-order-detail="${o._id||o.id}">Gestionar</button></td>
            </tr>`).join('')}</tbody>
          </table>`;
        break; }
      case 'orderDetail':{
        const o = state._viewingOrder;
        if(!o){ el.innerHTML='<p>Pedido no encontrado</p>'; break; }
        const stCol = { confirmado:'#f39c12', enviado:'#2980b9', entregado:'#27ae60' };
        const trk = state._orderTracking || {};
        const events = trk.events || [];
        el.innerHTML = `
          <button class="pl-btn pl-ghost" id="backToOrders" style="margin-bottom:1rem">← Volver a Pedidos</button>
          <h2>Pedido ${o.invoiceNumber||o.id}</h2>
          <span style="display:inline-block;background:${stCol[o.status]||'#999'};color:#fff;padding:6px 16px;border-radius:16px;font-weight:600;margin-bottom:1rem">${o.status}</span>

          <div class="pl-grid" style="grid-template-columns:1fr 1fr;gap:1.5rem;margin:1rem 0">
            <div class="pl-card"><div class="pl-card-body">
              <h3 style="margin-top:0">Información del Cliente</h3>
              <p><strong>Nombre:</strong> ${o.userName||'—'}</p>
              <p><strong>Email:</strong> ${o.email||'—'}</p>
              <p><strong>Teléfono:</strong> ${o.phone||'—'}</p>
              <p><strong>Dirección:</strong> ${o.address||'—'}</p>
              ${o.shippingCity?`<p><strong>Ciudad envío:</strong> ${o.shippingCity}</p>`:''}
            </div></div>
            <div class="pl-card"><div class="pl-card-body">
              <h3 style="margin-top:0">Resumen</h3>
              <p><strong>Subtotal:</strong> ${cop(o.subtotal||0)}</p>
              ${o.discount>0?`<p><strong>Descuento:</strong> -${cop(o.discount)}</p>`:''}
              ${o.giftApplied>0?`<p><strong>Gift Card:</strong> -${cop(o.giftApplied)}</p>`:''}
              ${o.shippingCost>0?`<p><strong>Envío:</strong> ${cop(o.shippingCost)}</p>`:''}
              <p style="font-size:1.2rem"><strong>Total: ${cop(o.total)}</strong></p>
              <p><strong>Pago:</strong> ${getPaymentName(o.paymentMethod)}</p>
              <p><strong>Fecha:</strong> ${new Date(o.date).toLocaleString('es-CO')}</p>
            </div></div>
          </div>

          <div class="pl-card" style="margin:1rem 0"><div class="pl-card-body">
            <h3 style="margin-top:0">Productos</h3>
            <table style="width:100%;border-collapse:collapse">
              <thead><tr><th>Producto</th><th>Cant.</th><th>Precio Unit.</th><th>Subtotal</th></tr></thead>
              <tbody>${(o.items||[]).map(i=>`<tr>
                <td>${i.product?.name||i.productName||'—'}${i.variant?` <span class="pl-muted">(${i.variant.size||''}/${i.variant.color||''})</span>`:''}</td>
                <td>${i.quantity}</td>
                <td>${cop(i.product?.price||i.productPrice||0)}</td>
                <td>${cop((i.product?.price||i.productPrice||0)*i.quantity)}</td>
              </tr>`).join('')}</tbody>
            </table>
          </div></div>

          <div class="pl-grid" style="grid-template-columns:1fr 1fr;gap:1.5rem;margin:1rem 0">
            <div class="pl-card" style="border-left:4px solid #8b7355"><div class="pl-card-body">
              <h3 style="margin-top:0">Actualizar Estado</h3>
              <div style="display:flex;gap:.75rem;flex-wrap:wrap;margin:.5rem 0">
                <select id="orderStatusSelect" class="pl-input" style="flex:1;min-width:160px">
                  <option value="confirmado" ${o.status==='confirmado'?'selected':''}>Confirmado</option>
                  <option value="enviado" ${o.status==='enviado'?'selected':''}>Enviado</option>
                  <option value="entregado" ${o.status==='entregado'?'selected':''}>Entregado</option>
                </select>
                <button class="pl-btn pl-primary" id="saveOrderStatusBtn" data-id="${o._id||o.id}">Guardar Estado</button>
              </div>
            </div></div>

            <div class="pl-card" style="border-left:4px solid #2980b9"><div class="pl-card-body">
              <h3 style="margin-top:0">Datos de Envío / Tracking</h3>
              <label class="pl-label" style="margin-bottom:.5rem">Número de guía
                <input id="trkNumber" class="pl-input" value="${trk.trackingNumber||''}" placeholder="Ej: 1234567890">
              </label>
              <label class="pl-label" style="margin-bottom:.5rem">Transportadora
                <input id="trkCarrier" class="pl-input" value="${trk.carrier||''}" placeholder="Ej: Servientrega, Envia, etc.">
              </label>
              <button class="pl-btn pl-primary" id="saveTrackMetaBtn" data-id="${o._id||o.id}" style="margin-top:.25rem">Guardar Tracking</button>
            </div></div>
          </div>

          <div class="pl-card" style="margin:1rem 0"><div class="pl-card-body">
            <h3 style="margin-top:0">Historial de Eventos</h3>
            <div id="trackEventsWrap">
              ${events.length===0?'<p class="pl-muted">Sin eventos registrados</p>':
                events.map(ev=>`<div style="display:flex;gap:1rem;align-items:flex-start;padding:8px 0;border-bottom:1px solid #eee">
                  <div style="min-width:140px;font-size:.85rem;color:#888">${new Date(ev.date).toLocaleString('es-CO')}</div>
                  <div><strong>${ev.status}</strong>${ev.note?` — <span class="pl-muted">${ev.note}</span>`:''}</div>
                </div>`).join('')}
            </div>
            <div style="display:flex;gap:.75rem;margin-top:1rem;flex-wrap:wrap">
              <select id="trkEventStatus" class="pl-input" style="flex:1;min-width:140px">
                <option value="">Estado del evento...</option>
                <option value="Pedido confirmado">Pedido confirmado</option>
                <option value="En preparación">En preparación</option>
                <option value="Empacado">Empacado</option>
                <option value="Recogido por transportadora">Recogido por transportadora</option>
                <option value="En tránsito">En tránsito</option>
                <option value="En ciudad destino">En ciudad destino</option>
                <option value="En reparto">En reparto</option>
                <option value="Entregado">Entregado</option>
                <option value="Intento de entrega fallido">Intento de entrega fallido</option>
              </select>
              <input id="trkEventNote" class="pl-input" placeholder="Nota (opcional)" style="flex:1;min-width:140px">
              <button class="pl-btn pl-ghost" id="addTrackEventBtn" data-id="${o._id||o.id}">+ Evento</button>
            </div>
          </div></div>`;
        break; }
      case 'reviews':{
        const pending = (state._pendingReviews||[]);
        const stars = (n)=> '★'.repeat(n) + '☆'.repeat(5-n);
        el.innerHTML = `
          <h2>Gestión de Reseñas</h2>
          ${pending.length>0?`<div style="background:#fff3cd;padding:12px 16px;border-radius:8px;margin-bottom:1rem;border-left:4px solid #f39c12"><strong>⚠️ ${pending.length} reseña(s) pendiente(s) de aprobación</strong></div>`:'<div style="background:#d4edda;padding:12px 16px;border-radius:8px;margin-bottom:1rem;border-left:4px solid #27ae60"><strong>✅ No hay reseñas pendientes</strong></div>'}
          ${pending.length>0?`
          <table style="width:100%;margin-top:1rem">
            <thead><tr><th>Producto</th><th>Calificación</th><th>Comentario</th><th>Fecha</th><th>Acciones</th></tr></thead>
            <tbody>${pending.map(r=>{
              const prod = state.state.products.find(p=>String(p._id||p.id)===String(r.productId));
              return `<tr>
                <td><strong>${prod?.name||'Producto desconocido'}</strong></td>
                <td><span style="color:#f39c12;letter-spacing:1px">${stars(r.rating)}</span></td>
                <td style="max-width:300px">${r.comment||'<span class="pl-muted">Sin comentario</span>'}</td>
                <td style="font-size:.85rem">${new Date(r.createdAt).toLocaleDateString('es-CO')}</td>
                <td>
                  <button class="pl-btn pl-primary" data-approve-review="${r._id}" style="margin-right:.25rem">Aprobar</button>
                  <button class="pl-btn pl-ghost" data-reject-review="${r._id}" style="color:#e74c3c">Rechazar</button>
                </td>
              </tr>`;
            }).join('')}</tbody>
          </table>`:''}`;
        break; }
      case 'returns':{
        const statusColors = { solicitada:'#f39c12', aprobada:'#2980b9', rechazada:'#e74c3c', enviada_cliente:'#8e44ad', recibida:'#3498db', revisada_apta:'#27ae60', revisada_no_apta:'#e74c3c', completada:'#27ae60' };
        const statusLabels = { solicitada:'Solicitada', aprobada:'Aprobada', rechazada:'Rechazada', enviada_cliente:'Enviada', recibida:'Recibida', revisada_apta:'Apta', revisada_no_apta:'No Apta', completada:'Completada' };
        const typeLabels = { garantia:'Garantía', cambio_talla:'Cambio talla', cambio_color:'Cambio color', defecto:'Defecto', otro:'Otro' };
        const pending = state.state.returns.filter(r=>r.status==='solicitada').length;
        const received = state.state.returns.filter(r=>r.status==='recibida').length;
        el.innerHTML = `
          <h2>Gestión de Devoluciones</h2>
          ${pending>0?`<div style="background:#fff3cd;padding:12px 16px;border-radius:8px;margin-bottom:1rem;border-left:4px solid #f39c12"><strong>⚠️ ${pending} solicitud(es) pendiente(s) de revisión</strong></div>`:''}
          ${received>0?`<div style="background:#e3f2fd;padding:12px 16px;border-radius:8px;margin-bottom:1rem;border-left:4px solid #2196f3"><strong>📦 ${received} devolución(es) recibida(s) pendiente(s) de revisión de producto</strong></div>`:''}
          <table style="width:100%;margin-top:1rem">
            <thead><tr><th>#</th><th>Cliente</th><th>Producto</th><th>Tipo</th><th>Valor</th><th>Estado</th><th>Fecha</th><th>Acciones</th></tr></thead>
            <tbody>${state.state.returns.map(r=>`<tr>
              <td><strong>${r.returnNumber||'—'}</strong></td>
              <td>${r.customerName||'—'}<br><span class="pl-muted" style="font-size:.8rem">${r.orderNumber||''}</span></td>
              <td>${r.productName||'—'}${r.variantLabel?` <span class="pl-muted">(${r.variantLabel})</span>`:''}</td>
              <td style="font-size:.85rem">${typeLabels[r.type]||r.type||'—'}</td>
              <td>${cop(r.productPrice||0)}</td>
              <td><span style="background:${statusColors[r.status]||'#999'};color:#fff;padding:3px 10px;border-radius:12px;font-size:.8rem;font-weight:600">${statusLabels[r.status]||r.status}</span></td>
              <td style="font-size:.85rem">${new Date(r.createdAt||r.date).toLocaleDateString('es-CO')}</td>
              <td><button class="pl-btn pl-ghost" data-view-return="${r._id}">Ver</button></td>
            </tr>`).join('')}</tbody>
          </table>`;
        break; }
      case 'returnDetail':{
        const r = state._viewingReturn;
        if(!r){ el.innerHTML='<p>No encontrada</p>'; break; }
        const sc = { solicitada:'#f39c12', aprobada:'#2980b9', rechazada:'#e74c3c', enviada_cliente:'#8e44ad', recibida:'#3498db', revisada_apta:'#27ae60', revisada_no_apta:'#e74c3c', completada:'#27ae60' };
        const sl = { solicitada:'Solicitada', aprobada:'Aprobada', rechazada:'Rechazada', enviada_cliente:'Enviada por cliente', recibida:'Recibida en bodega', revisada_apta:'Revisada — Apta', revisada_no_apta:'Revisada — No Apta', completada:'Completada' };
        const tl = { garantia:'Garantía', cambio_talla:'Cambio de talla', cambio_color:'Cambio de color', defecto:'Defecto de fábrica', otro:'Otro' };
        el.innerHTML = `
          <button class="pl-btn pl-ghost" id="backToReturns" style="margin-bottom:1rem">← Volver a Devoluciones</button>
          <h2>Devolución ${r.returnNumber||''}</h2>
          <div style="display:inline-block;background:${sc[r.status]||'#999'};color:#fff;padding:6px 16px;border-radius:16px;font-weight:600;margin-bottom:1rem">${sl[r.status]||r.status}</div>

          <div class="pl-grid" style="grid-template-columns:1fr 1fr;gap:1.5rem;margin:1rem 0">
            <div class="pl-card"><div class="pl-card-body">
              <h3 style="margin-top:0">Información del Cliente</h3>
              <p><strong>Nombre:</strong> ${r.customerName||'—'}</p>
              <p><strong>Email:</strong> ${r.customerEmail||'—'}</p>
              <p><strong>Pedido:</strong> ${r.orderNumber||'—'}</p>
              <p><strong>Fecha compra:</strong> ${r.orderDate?new Date(r.orderDate).toLocaleDateString('es-CO'):'—'}</p>
            </div></div>
            <div class="pl-card"><div class="pl-card-body">
              <h3 style="margin-top:0">Producto</h3>
              <p><strong>Nombre:</strong> ${r.productName||'—'}</p>
              ${r.variantLabel?`<p><strong>Variante:</strong> ${r.variantLabel}</p>`:''}
              <p><strong>Cantidad:</strong> ${r.quantity||1}</p>
              <p><strong>Valor:</strong> ${cop(r.productPrice||0)}</p>
            </div></div>
          </div>

          <div class="pl-card" style="margin:1rem 0"><div class="pl-card-body">
            <h3 style="margin-top:0">Motivo de Devolución</h3>
            <p><strong>Tipo:</strong> ${tl[r.type]||r.type}</p>
            <p><strong>Razón:</strong> ${r.reason||'—'}</p>
            <p><strong>Envío pagado por:</strong> ${r.customerPaysShipping?'<span style="color:#e74c3c">Cliente (no es garantía)</span>':'<span style="color:#27ae60">Pura Lino (garantía)</span>'}</p>
          </div></div>

          ${r.warehouseName?`<div class="pl-card" style="margin:1rem 0"><div class="pl-card-body">
            <h3 style="margin-top:0">Bodega de Destino</h3>
            <p><strong>Bodega:</strong> ${r.warehouseName}</p>
            <p><strong>Dirección:</strong> ${r.warehouseAddress||'—'}</p>
          </div></div>`:''}

          ${r.adminNotes?`<div class="pl-card" style="margin:1rem 0"><div class="pl-card-body"><h3 style="margin-top:0">Notas Admin</h3><p>${r.adminNotes}</p></div></div>`:''}
          ${r.rejectionReason?`<div class="pl-card" style="margin:1rem 0;border-left:4px solid #e74c3c"><div class="pl-card-body"><h3 style="margin-top:0;color:#e74c3c">Motivo de Rechazo</h3><p>${r.rejectionReason}</p></div></div>`:''}

          ${r.reviewResult?`<div class="pl-card" style="margin:1rem 0;border-left:4px solid ${r.reviewResult==='apta'?'#27ae60':'#e74c3c'}"><div class="pl-card-body">
            <h3 style="margin-top:0">Resultado de Revisión: ${r.reviewResult==='apta'?'✅ Apta':'❌ No Apta'}</h3>
            ${r.reviewNotes?`<p>${r.reviewNotes}</p>`:''}
            ${r.reviewRejectionReason?`<p style="color:#e74c3c">${r.reviewRejectionReason}</p>`:''}
            ${r.reviewPhotos&&r.reviewPhotos.length>0?`<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">${r.reviewPhotos.map(p=>`<img src="${p.url}" style="width:100px;height:100px;object-fit:cover;border-radius:6px">`).join('')}</div>`:''}
          </div></div>`:''}

          ${r.couponCode?`<div class="pl-card" style="margin:1rem 0;border-left:4px solid #27ae60;background:#e8f5e9"><div class="pl-card-body">
            <h3 style="margin-top:0;color:#27ae60">Cupón Generado</h3>
            <p style="font-size:1.3rem;font-weight:700;letter-spacing:2px">${r.couponCode}</p>
            <p>Valor: <strong>${cop(r.couponValue||0)}</strong></p>
          </div></div>`:''}

          <div style="margin-top:1.5rem;display:flex;gap:.75rem;flex-wrap:wrap">
            ${r.status==='solicitada'?`
              <button class="pl-btn pl-primary" id="approveReturnBtn" data-id="${r._id}" style="background:#27ae60">✅ Aprobar</button>
              <button class="pl-btn pl-primary" id="rejectReturnBtn" data-id="${r._id}" style="background:#e74c3c">❌ Rechazar</button>
            `:''}
            ${r.status==='aprobada'||r.status==='enviada_cliente'?`
              <button class="pl-btn pl-primary" id="receivedReturnBtn" data-id="${r._id}" style="background:#2980b9">📦 Marcar como Recibida</button>
            `:''}
            ${r.status==='recibida'?`
              <button class="pl-btn pl-primary" id="reviewReturnBtn" data-id="${r._id}" style="background:#8b7355">🔍 Revisar Producto</button>
            `:''}
          </div>`;
        break; }
      case 'promotions':{
        el.innerHTML = `
          <h2>Gestión de Promociones</h2>
          <button class="pl-btn pl-primary" id="newPromoBtn">Nueva Promoción</button>
          <table style="width:100%;margin-top:1rem">
            <thead><tr><th>ID</th><th>Código</th><th>Descuento %</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>${state.state.promotions.map(p=>`<tr><td>${p.id}</td><td>${p.code}</td><td>${p.discount}%</td><td>${p.active?'Activa':'Inactiva'}</td><td><button class="pl-btn pl-ghost" data-toggle-promo="${p.id}">${p.active?'Desactivar':'Activar'}</button></td></tr>`).join('')}</tbody>
          </table>`;
        break; }
      case 'reviews':{
        el.innerHTML = `
          <h2>Reseñas pendientes</h2>
          <div id="adminReviewsContent">Cargando...</div>
        `;
        break; }
      case 'reports':{
        const t = state.totals();
        el.innerHTML = `
          <h2>Reportes de Ventas</h2>
          <div class="pl-grid" style="grid-template-columns:repeat(auto-fit,minmax(220px,1fr));margin:1rem 0;">
            <div class="pl-card"><div class="pl-card-body"><h3>Ventas Totales</h3><p style="font-size:1.2rem">${cop(t.totalSales)}</p></div></div>
            <div class="pl-card"><div class="pl-card-body"><h3>Total Pedidos</h3><p style="font-size:1.2rem">${t.ordersCount}</p></div></div>
            <div class="pl-card"><div class="pl-card-body"><h3>Valor Promedio</h3><p style="font-size:1.2rem">${cop(t.avgOrder)}</p></div></div>
          </div>
          <h3>Productos Más Vendidos</h3>
          <table style="width:100%;margin-top:1rem"><thead><tr><th>Producto</th><th>Cantidad Vendida</th></tr></thead><tbody>${t.best.map(b=>`<tr><td>${b.product}</td><td>${b.quantity}</td></tr>`).join('')}</tbody></table>`;
        break; }
      case 'suppliers':{
        el.innerHTML = inv.renderSuppliers(state.state.suppliers);
        break; }
      case 'supplierForm':{
        el.innerHTML = inv.renderSupplierForm(state._editingSupplier || null);
        break; }
      case 'warehouses':{
        el.innerHTML = inv.renderWarehouses(state.state.warehouses);
        break; }
      case 'warehouseForm':{
        el.innerHTML = inv.renderWarehouseForm(state._editingWarehouse || null);
        break; }
      case 'purchaseOrders':{
        el.innerHTML = inv.renderPurchaseOrders(state.state.purchaseOrders);
        break; }
      case 'poForm':{
        el.innerHTML = inv.renderPOForm(state.state.suppliers, state.state.products, state._editingPO || null);
        break; }
      case 'poDetail':{
        el.innerHTML = inv.renderPODetail(state._viewingPO);
        break; }
      case 'poReceive':{
        el.innerHTML = inv.renderReceiveForm(state._receivingPO, state.state.warehouses);
        break; }
      case 'stockMovements':{
        el.innerHTML = inv.renderStockMovements(state._stockMovements || []);
        break; }
      case 'lowStock':{
        el.innerHTML = inv.renderLowStock(state._lowStockAlerts || []);
        break; }
    }
  }

  printPO(po){ inv.printPurchaseOrder(po); }
}
