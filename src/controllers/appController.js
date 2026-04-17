import { bus } from '../core/observer.js';
import { AppModel } from '../models/appModel.js';
import { AppView, cop } from '../views/appView.js';
import { api, wishlistApi, reviewsApi, paymentsApi, settingsApi, backlogApi, chatbotApi } from '../api/client.js';
import { PaymentStrategies } from '../strategies/payment.js';
import { DEPARTMENTS } from '../data/colombiaDepts.js';
import { LEGAL_PAGES } from '../data/legalPages.js';

export class AppController {
  constructor(){
    this.model = new AppModel();
    this.view = new AppView();
    this.currentAdminSection = 'dashboard';
    this.currentPage = 1;
    this.PRODUCTS_PER_PAGE = 12;

    // Connect view to model for session timeout notifications
    this.model.setView(this.view);

    bus.on('state:change', ()=>{
      this.view.updateCartCount(this.model.cartCount());
    });

    // Track user activity to reset session timeout
    this.setupActivityTracking();

    // Menu is handled by inline script in index.html

    // Setup accessibility
    this.setupAccessibility();

    // Expose bindHeaderActions globally
    window.rebindHeaderActions = () => this.bindHeaderActions();
    
    // Expose appController globally for direct access
    window.appController = this;

    this.bindGlobalEvents();
    this.bootstrapReady = this.bootstrap();
  }

  setupSlideInMenu() {
    const menuToggle = document.getElementById('menuToggle');
    const navLinks = document.getElementById('navLinks');
    // Create overlay dynamically if missing (e.g. cached HTML)
    let menuOverlay = document.getElementById('menuOverlay');
    if (!menuOverlay) {
      menuOverlay = document.createElement('div');
      menuOverlay.className = 'menu-overlay';
      menuOverlay.id = 'menuOverlay';
      document.body.insertBefore(menuOverlay, document.body.firstChild);
    }

    if (!menuToggle || !navLinks) return;

    const closeMenu = () => {
      menuToggle.classList.remove('active');
      navLinks.classList.remove('active');
      menuOverlay.classList.remove('active');
    };

    menuToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      menuToggle.classList.toggle('active');
      navLinks.classList.toggle('active');
      menuOverlay.classList.toggle('active');
    });

    navLinks.addEventListener('click', (e) => {
      if (e.target.tagName === 'A') closeMenu();
    });

    menuOverlay.addEventListener('click', closeMenu);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeMenu();
    });
  }

  setupAccessibility() {
    const btn = document.getElementById('accessibilityBtn');
    const modal = document.getElementById('accessibilityModal');
    const closeBtn = document.getElementById('closeAccessibility');
    const resetBtn = document.getElementById('resetAccessibility');
    const fontSlider = document.getElementById('fontSizeSlider');
    const contrastSlider = document.getElementById('contrastSlider');
    const lineSlider = document.getElementById('lineHeightSlider');
    const fontVal = document.getElementById('fontSizeValue');
    const contrastVal = document.getElementById('contrastValue');
    const lineVal = document.getElementById('lineHeightValue');
    const highlightLinks = document.getElementById('highlightLinksToggle');
    const bigCursor = document.getElementById('bigCursorToggle');
    const preview = document.getElementById('accessibilityPreview');

    if (!btn || !modal) return;

    const DEFAULTS = { fontSize: '16', contrast: '0', lineHeight: '1.6', highlightLinks: false, bigCursor: false };
    const contrastLabels = ['Normal', 'Alto', 'Muy alto'];
    const contrastFilters = ['none', 'contrast(1.4)', 'contrast(1.8) saturate(0.2)'];

    // --- Apply a single setting ---
    const applySettings = (s) => {
      if (fontSlider) { fontSlider.value = s.fontSize; if (fontVal) fontVal.textContent = s.fontSize + 'px'; }
      if (contrastSlider) { contrastSlider.value = s.contrast; if (contrastVal) contrastVal.textContent = contrastLabels[+s.contrast] || 'Normal'; }
      if (lineSlider) { lineSlider.value = s.lineHeight; if (lineVal) lineVal.textContent = s.lineHeight; }
      if (highlightLinks) highlightLinks.checked = !!s.highlightLinks;
      if (bigCursor) bigCursor.checked = !!s.bigCursor;

      document.body.style.fontSize = s.fontSize + 'px';
      document.body.style.lineHeight = s.lineHeight;
      document.body.style.filter = contrastFilters[+s.contrast] || 'none';
      document.body.classList.toggle('a11y-highlight-links', !!s.highlightLinks);
      document.body.classList.toggle('a11y-big-cursor', !!s.bigCursor);

      if (preview) {
        preview.style.fontSize = s.fontSize + 'px';
        preview.style.lineHeight = s.lineHeight;
      }
    };

    const currentSettings = () => ({
      fontSize: fontSlider ? fontSlider.value : DEFAULTS.fontSize,
      contrast: contrastSlider ? contrastSlider.value : DEFAULTS.contrast,
      lineHeight: lineSlider ? lineSlider.value : DEFAULTS.lineHeight,
      highlightLinks: highlightLinks ? highlightLinks.checked : false,
      bigCursor: bigCursor ? bigCursor.checked : false
    });

    const save = () => localStorage.setItem('a11y', JSON.stringify(currentSettings()));

    const closeModal = () => { save(); modal.classList.remove('active'); };

    // --- Open / Close ---
    btn.addEventListener('click', () => modal.classList.add('active'));
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

    // --- Sliders ---
    if (fontSlider) fontSlider.addEventListener('input', () => { applySettings(currentSettings()); });
    if (contrastSlider) contrastSlider.addEventListener('input', () => { applySettings(currentSettings()); });
    if (lineSlider) lineSlider.addEventListener('input', () => { applySettings(currentSettings()); });
    if (highlightLinks) highlightLinks.addEventListener('change', () => { applySettings(currentSettings()); });
    if (bigCursor) bigCursor.addEventListener('change', () => { applySettings(currentSettings()); });

    // --- Reset ---
    if (resetBtn) resetBtn.addEventListener('click', () => {
      applySettings(DEFAULTS);
      save();
    });

    // --- Load saved ---
    try {
      const saved = localStorage.getItem('a11y');
      if (saved) applySettings({ ...DEFAULTS, ...JSON.parse(saved) });
    } catch(_) { /* ignore corrupt data */ }
  }

  setupActivityTracking() {
    // Track mouse movement, clicks, and keyboard input
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const resetTimeout = (event) => {
      if (this.model.state.currentUser) {
        this.model.resetSessionTimeout();
      }
    };

    activityEvents.forEach(event => {
      document.addEventListener(event, (e) => resetTimeout(e), true);
    });

    // Also reset on page visibility change
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.model.state.currentUser) {
        this.model.resetSessionTimeout();
      }
    });
  }

  async bootstrap(){
    await this.model.init();
    this.renderProducts();
    this.view.updateCartCount(this.model.cartCount());
    this.bindHeaderActions();
    // if session restored from token, reflect it in UI
    if(this.model.state.currentUser){
      const user = this.model.state.currentUser;
      this.view.setUserUI(user);
      this.bindHeaderActions();
      this.view.updateCartCount(this.model.cartCount());

      // Restore admin state if user is admin
      if(user.role === 'admin'){
        try{
          await Promise.all([
            this.model.refreshAllOrders(),
            this.model.refreshUsers(),
            this.model.refreshReturns(),
            this.model.refreshSuppliers(),
            this.model.refreshWarehouses(),
            this.model.refreshPurchaseOrders(),
          ]);
        }catch(e){ /* data load errors are non-critical */ }
        const savedSection = sessionStorage.getItem('pl_admin_section');
        if(savedSection){
          this.view.showSections({home:false,products:false,customer:false,admin:true});
          this.currentAdminSection = savedSection;
          this.loadAdminSection(savedSection);
        }
      }
    }

    // ── Load banner settings ──
    this._loadBanner();

    // ── Setup chatbot ──
    this.setupChatbot();

    // ── Handle Mercado Pago return ──
    this._handleMPReturn();
  }

  async _loadBanner(){
    try{
      const banner = await settingsApi.getBanner();
      const hero = document.getElementById('homeSection');
      const titleEl = document.getElementById('heroBannerTitle');
      const subtitleEl = document.getElementById('heroBannerSubtitle');
      if(banner.title && titleEl) titleEl.textContent = banner.title;
      if(banner.subtitle && subtitleEl) subtitleEl.textContent = banner.subtitle;
      if(banner.imageUrl && hero){
        hero.style.background = `linear-gradient(rgba(17,17,17,.55),rgba(17,17,17,.55)),url('${banner.imageUrl}')`;
        hero.style.backgroundSize = 'cover';
        hero.style.backgroundPosition = 'center';
      }
    }catch(e){ /* banner load is non-critical */ }
  }

  _bindBannerAdmin(){
    const preview = document.getElementById('bannerPreview');
    const titleInput = document.getElementById('bannerTitle');
    const subtitleInput = document.getElementById('bannerSubtitle');
    const imageInput = document.getElementById('bannerImageInput');
    const saveTextBtn = document.getElementById('saveBannerTextBtn');
    const deleteImgBtn = document.getElementById('deleteBannerImageBtn');
    const uploadBtn = document.getElementById('bannerUploadBtn');
    if(!preview) return;

    // Upload button triggers file input
    if(uploadBtn && imageInput) uploadBtn.onclick = ()=> imageInput.click();

    // Upload image
    if(imageInput) imageInput.onchange = async ()=>{
      const file = imageInput.files[0];
      if(!file) return;
      if(file.size > 10 * 1024 * 1024){ this.view.toast('La imagen no puede superar 10 MB', 'error'); return; }
      preview.innerHTML = '<span class="pl-muted" style="padding:2rem">Subiendo imagen...</span>';
      try{
        const result = await settingsApi.uploadBannerImage(file);
        preview.innerHTML = `<img src="${result.imageUrl}" style="width:100%;max-height:200px;object-fit:cover" />`;
        this.view.toast('Imagen de banner actualizada');
        this._loadBanner();
      }catch(err){
        this.view.toast('Error al subir imagen: ' + err.message, 'error');
        preview.innerHTML = '<span class="pl-muted" style="padding:2rem">Error al subir</span>';
      }
      imageInput.value = '';
    };

    // Save text
    if(saveTextBtn) saveTextBtn.onclick = async ()=>{
      try{
        await settingsApi.updateBanner({ title: titleInput.value, subtitle: subtitleInput.value });
        this.view.toast('Texto del banner actualizado');
        this._loadBanner();
      }catch(err){ this.view.toast('Error: ' + err.message, 'error'); }
    };

    // Delete image
    if(deleteImgBtn) deleteImgBtn.onclick = async ()=>{
      if(!confirm('¿Eliminar la imagen del banner?')) return;
      try{
        await settingsApi.deleteBannerImage();
        preview.innerHTML = '<span class="pl-muted" style="padding:2rem">Sin imagen de banner</span>';
        this.view.toast('Imagen de banner eliminada');
        this._loadBanner();
      }catch(err){ this.view.toast('Error: ' + err.message, 'error'); }
    };

    // Load current banner data (async, after handlers are bound)
    settingsApi.getBanner().then(banner => {
      if(titleInput) titleInput.value = banner.title || '';
      if(subtitleInput) subtitleInput.value = banner.subtitle || '';
      if(banner.imageUrl){
        preview.innerHTML = `<img src="${banner.imageUrl}" style="width:100%;max-height:200px;object-fit:cover" />`;
      } else {
        preview.innerHTML = '<span class="pl-muted" style="padding:2rem">Sin imagen de banner — se muestra el fondo por defecto</span>';
      }
    }).catch(() => {
      preview.innerHTML = '<span class="pl-muted" style="padding:2rem">Error al cargar banner</span>';
    });
  }

  async _handleMPReturn(){
    const params = new URLSearchParams(window.location.search);
    const mpStatus = params.get('mp_status') || params.get('collection_status');
    const orderId = params.get('order_id') || params.get('external_reference');
    if(!mpStatus || !orderId) return;

    // Clean URL params without reload
    const cleanUrl = window.location.origin + window.location.pathname + (window.location.hash || '');
    window.history.replaceState({}, '', cleanUrl);

    if(mpStatus === 'approved'){
      this.view.toast('¡Pago aprobado! Tu pedido ha sido confirmado.', 'success');
      // Try to show invoice
      if(this.model.state.currentUser){
        try{
          const status = await paymentsApi.getStatus(orderId);
          if(status){
            await this.model.refreshMyOrders();
            const order = this.model.state.orders.find(o => String(o._id || o.id) === String(orderId));
            if(order){
              this._lastInvoiceOrder = order;
              this.view.renderInvoice(order);
              this.view.toggleModal('invoiceModal', true);
            }
          }
        }catch(e){ /* non-critical */ }
      }
    } else if(mpStatus === 'rejected'){
      this.view.toast('El pago fue rechazado. Intenta con otro método de pago.', 'error');
    } else if(mpStatus === 'pending'){
      this.view.toast('Tu pago está pendiente de confirmación. Te notificaremos cuando sea aprobado.', 'warning');
    }
  }

  async _initMPBrick(){
    if(this._mpBrickInstance) return; // already initialized
    try{
      const container = document.getElementById('mpBrickContainer');
      if(!container) return;
      container.innerHTML = '<p style="text-align:center;color:#888;">Cargando formulario de pago…</p>';

      const configRes = await paymentsApi.getConfig();
      if(!configRes.publicKey){ container.innerHTML='<p style="color:red;">Mercado Pago no está configurado.</p>'; return; }

      const mp = new window.MercadoPago(configRes.publicKey, { locale: 'es-CO' });
      const bricksBuilder = mp.bricks();

      // Calculate approximate total for display
      const cart = this.model.state.cart;
      let approxTotal = cart.reduce((s,c)=> s + ((c.variant?.priceOverride ?? c.product.price) * c.quantity), 0);
      if(this.model.state.currentPromo?.discount) approxTotal -= approxTotal * (this.model.state.currentPromo.discount / 100);
      if(this.currentShipping?.cost) approxTotal += this.currentShipping.cost;
      approxTotal = Math.max(approxTotal, 1000); // MP minimum

      const self = this;
      this._mpBrickInstance = await bricksBuilder.create('cardPayment', 'mpBrickContainer', {
        initialization: { amount: approxTotal },
        customization: {
          visual: { style: { theme: 'default' } },
          paymentMethods: { maxInstallments: 1, minInstallments: 1 }
        },
        callbacks: {
          onReady: ()=>{ },
          onSubmit: (cardFormData)=>{
            console.log('MP Brick onSubmit fired', cardFormData);
            // Read order fields from the form
            const nameVal = document.getElementById('orderName')?.value?.trim() || '';
            const addrVal = document.getElementById('orderAddress')?.value?.trim() || '';
            const addr2Val = document.getElementById('orderAddress2')?.value?.trim() || '';
            const deptVal = document.getElementById('orderDepartment')?.value || '';
            const postalVal = document.getElementById('orderPostalCode')?.value?.trim() || '';
            const cedulaVal = document.getElementById('orderCedula')?.value?.trim() || '';
            const phoneVal = document.getElementById('orderPhone')?.value?.trim() || '';
            const cityVal = document.getElementById('orderCity')?.value || '';
            const emailVal = self.model.state.currentUser?.email || '';
            const giftCardCode = document.getElementById('giftCardCode')?.value || undefined;

            if(!nameVal || !addrVal || !phoneVal || !cityVal || !deptVal){
              self.view.toast('Completa todos los campos obligatorios del formulario de envío antes de pagar.','error');
              return Promise.reject(new Error('Campos incompletos'));
            }

            const cartItems = self.model.state.cart;
            const payload = {
              token: cardFormData.token,
              installments: cardFormData.installments || 1,
              issuerId: cardFormData.issuer_id || cardFormData.issuerId || '',
              paymentMethodId: cardFormData.payment_method_id || cardFormData.paymentMethodId || '',
              payerEmail: cardFormData.payer?.email || emailVal,
              userName: nameVal,
              email: emailVal,
              address: addrVal,
              address2: addr2Val,
              department: deptVal,
              postalCode: postalVal,
              cedula: cedulaVal,
              phone: phoneVal,
              paymentMethod: 'mercadopago',
              shippingCity: cityVal,
              shippingCost: (typeof self.currentShipping?.cost==='number'? self.currentShipping.cost: undefined),
              giftCardCode: giftCardCode,
              items: cartItems.map(c => ({
                productId: c.product.id || c.product._id,
                variantId: c.variantId || undefined,
                quantity: c.quantity,
              })),
              promoCode: self.model.state.currentPromo?.code || undefined,
            };

            console.log('Sending payload to backend:', payload);
            return paymentsApi.processPayment(payload).then(result => {
              console.log('Backend result:', result);
              if(result.status === 'approved' && result.order){
                self.model.updateCurrentUser({ name: nameVal, address: addrVal, phone: phoneVal }).catch(()=>{});
                self.model.clearCart();
                self.view.toggleModal('orderModal', false);
                self.view.toast('¡Pago aprobado! Pedido confirmado.');
                const order = self.model._adaptOrder(result.order);
                self.model.state.orders.push(order);
                self.model.addInvoice(order);
                self._lastInvoiceOrder = order;
                self.view.renderInvoice(order);
                self.view.toggleModal('invoiceModal', true);
              } else {
                self.view.toast(result.message || 'Pago pendiente de confirmación', 'warning');
                self.model.clearCart();
                self.view.toggleModal('orderModal', false);
              }
            }).catch(err => {
              console.error('MP payment error:', err);
              self.view.toast(err.message || 'Error al procesar el pago con Mercado Pago','error');
              return Promise.reject(err);
            });
          },
          onError: (error)=>{
            console.error('MP Brick error:', error);
            self.view.toast('Error en el formulario de pago de Mercado Pago.','error');
          },
        },
      });
    }catch(err){
      console.error('MP Brick init error:', err);
      const container = document.getElementById('mpBrickContainer');
      if(container) container.innerHTML='<p style="color:red;">No se pudo cargar el formulario de Mercado Pago. Intenta refrescar la página.</p>';
    }
  }

  _destroyMPBrick(){
    if(this._mpBrickInstance){
      try{ this._mpBrickInstance.unmount(); }catch(e){}
      this._mpBrickInstance = null;
    }
    const container = document.getElementById('mpBrickContainer');
    if(container) container.innerHTML = '';
  }

  bindGlobalEvents(){
    document.addEventListener('click', (e)=>{
      const routeEl = e.target.closest('[data-route]');
      if(routeEl){ e.preventDefault(); this.route(routeEl.getAttribute('data-route')); }

      // Ensure login/register buttons always work (delegated)
      if(e.target && e.target.id === 'loginBtn'){
        e.preventDefault(); this.view.toggleModal('loginModal', true);
      }
      if(e.target && e.target.id === 'registerBtn'){
        e.preventDefault(); this.view.toggleModal('registerModal', true);
      }

      // Forgot password link
      if(e.target && e.target.id === 'forgotPasswordLink'){
        e.preventDefault(); 
        this.view.toggleModal('loginModal', false); 
        this.view.toggleModal('forgotPasswordModal', true);
      }

      // Legal page links (data-legal attribute)
      const legalLink = e.target.closest('[data-legal]');
      if(legalLink){
        e.preventDefault();
        const page = legalLink.getAttribute('data-legal');
        const legal = LEGAL_PAGES[page];
        if(legal){
          const el = document.getElementById('legalContent');
          if(el) el.innerHTML = `<h2 style="margin-top:0">${legal.title}</h2>${legal.content}`;
          this.view.toggleModal('legalModal', true);
        }
      }

      // Pagination buttons
      const pageBtn = e.target.closest('[data-page]');
      if(pageBtn && !pageBtn.disabled){
        e.preventDefault();
        const page = parseInt(pageBtn.getAttribute('data-page'));
        if(page >= 1) this.goToPage(page);
      }

      const add = e.target.closest('[data-add]');
      if(add){
        const id = add.getAttribute('data-add');
        
        try{
          const card = add.closest('.pl-card');
          const sizeEl = card?.querySelector('[data-variant-size]');
          const colorEl = card?.querySelector('[data-variant-color]');
          const opts = { size: sizeEl?.value, color: colorEl?.value };
          this.model.addToCart(id, opts);
          this.view.toast('Producto agregado al carrito');
          
          this.openCart();
        }catch(err){ 
          console.error('🛒 Error adding to cart:', err);
          this.view.toast(err.message,'error'); 
        }
      }

      const rem = e.target.closest('[data-remove]');
      if(rem){
        const payload = rem.getAttribute('data-remove');
        const [pid, vid] = String(payload||'').split('||');
        this.model.removeFromCart(pid, vid);
        this.openCart();
      }

      const viewInv = e.target.closest('[data-view-invoice]');
      if(viewInv){ const id=viewInv.getAttribute('data-view-invoice'); const o=this.model.state.orders.find(x=>String(x.id)===String(id) || String(x._id)===String(id)); if(o){ this._lastInvoiceOrder=o; this.view.renderInvoice(o); this.view.toggleModal('invoiceModal', true); } }

      // Admin mobile menu toggle
      if(e.target.closest('#adminMenuToggle')){
        e.preventDefault();
        const nav = document.getElementById('adminNav');
        const overlay = document.getElementById('adminMenuOverlay');
        const toggle = document.getElementById('adminMenuToggle');
        const isOpen = nav?.classList.contains('open');
        if(isOpen){ nav.classList.remove('open'); overlay.classList.remove('active'); toggle.classList.remove('active'); }
        else { nav.classList.add('open'); overlay.classList.add('active'); toggle.classList.add('active'); }
      }
      if(e.target.closest('#adminMenuOverlay')){
        const nav = document.getElementById('adminNav');
        const overlay = document.getElementById('adminMenuOverlay');
        const toggle = document.getElementById('adminMenuToggle');
        nav?.classList.remove('open'); overlay?.classList.remove('active'); toggle?.classList.remove('active');
        document.querySelectorAll('.nav-group').forEach(g=>g.classList.remove('open'));
      }

      // Admin nav group toggle (click to open/close dropdown)
      const groupToggle = e.target.closest('.nav-group-toggle');
      if(groupToggle){ e.preventDefault(); const grp = groupToggle.closest('.nav-group'); document.querySelectorAll('.nav-group').forEach(g=>{ if(g!==grp) g.classList.remove('open'); }); grp.classList.toggle('open'); }

      const adminLink = e.target.closest('[data-admin]');
      if(adminLink){
        e.preventDefault();
        document.querySelectorAll('.nav-group').forEach(g=>g.classList.remove('open'));
        const sect=adminLink.getAttribute('data-admin');
        this.currentAdminSection = sect;
        sessionStorage.setItem('pl_admin_section', sect);
        document.querySelectorAll('.pl-admin-nav a').forEach(a=>a.classList.remove('active'));
        adminLink.classList.add('active');
        this.loadAdminSection(sect);
        // Close mobile drawer and update label
        const nav = document.getElementById('adminNav');
        const overlay = document.getElementById('adminMenuOverlay');
        const toggle = document.getElementById('adminMenuToggle');
        nav?.classList.remove('open'); overlay?.classList.remove('active'); toggle?.classList.remove('active');
        const label = document.getElementById('adminCurrentSection');
        if(label) label.textContent = adminLink.textContent.trim();
      }

      const editProd = e.target.closest('[data-edit-product]');
      if(editProd){ const id=editProd.getAttribute('data-edit-product'); const p=this.model.state.products.find(x=>String(x._id||x.id)===String(id)); if(p) this.openProductModal(p); }

      const delProd = e.target.closest('[data-delete-product]');
      if(delProd){ (async()=>{ const id=delProd.getAttribute('data-delete-product'); if(confirm('¿Está seguro de eliminar este producto?')){ await this.model.deleteProduct(id); this.view.toast('Producto eliminado'); this.view.renderAdmin('products', this.model); } })(); }

      // Admin: visual variants editor
      const editVariants = e.target.closest('[data-edit-variants]');
      if(editVariants){
        const id = editVariants.getAttribute('data-edit-variants');
        const p = this.model.state.products.find(x=>String(x._id||x.id)===String(id));
        if(!p){ this.view.toast('Producto no encontrado','error'); return; }
        this.currentVariantsProductId = id;
        const rows = Array.isArray(p.variants)? p.variants: [];
        const tbody = document.getElementById('variantsRows');
        const toRow = (v, idx)=>`
          <tr data-row="${idx}">
            <td><input class="pl-input" data-var-size value="${v.size||''}"></td>
            <td><input class="pl-input" data-var-color value="${v.color||''}"></td>
            <td><input class="pl-input" data-var-stock type="number" value="${typeof v.stock==='number'? v.stock: 0}"></td>
            <td><input class="pl-input" data-var-sku value="${v.sku||''}"></td>
            <td><input class="pl-input" data-var-price type="number" step="0.01" value="${(v.priceOverride!==undefined && v.priceOverride!==null)? v.priceOverride: ''}"></td>
            <td><button class="pl-btn pl-ghost" data-variant-remove>Eliminar</button></td>
          </tr>`;
        tbody.innerHTML = rows.map((v,i)=>toRow(v,i)).join('');
        this.view.toggleModal('variantsModal', true);
      }

      const addVarBtn = e.target && e.target.id === 'variantsAddRowBtn';
      if(addVarBtn){
        const tbody = document.getElementById('variantsRows');
        const idx = tbody.querySelectorAll('tr').length;
        const tpl = document.createElement('tbody');
        tpl.innerHTML = `<tr data-row="${idx}">
            <td><input class="pl-input" data-var-size></td>
            <td><input class="pl-input" data-var-color></td>
            <td><input class="pl-input" data-var-stock type="number" value="0"></td>
            <td><input class="pl-input" data-var-sku></td>
            <td><input class="pl-input" data-var-price type="number" step="0.01"></td>
            <td><button class="pl-btn pl-ghost" data-variant-remove>Eliminar</button></td>
          </tr>`;
        tbody.appendChild(tpl.firstElementChild);
      }

      const removeVarBtn = e.target && e.target.hasAttribute('data-variant-remove');
      if(removeVarBtn){
        const tr = e.target.closest('tr'); if(tr) tr.remove();
      }

      const saveVarsBtn = e.target && e.target.id === 'variantsSaveBtn';
      if(saveVarsBtn){ (async()=>{
        try{
          const id = this.currentVariantsProductId;
          if(!id){ this.view.toast('Producto no definido','error'); return; }
          const tbody = document.getElementById('variantsRows');
          const rows = Array.from(tbody.querySelectorAll('tr'));
          const variants = rows.map(tr=>{
            const size = tr.querySelector('[data-var-size]').value.trim();
            const color = tr.querySelector('[data-var-color]').value.trim();
            const stock = parseInt(tr.querySelector('[data-var-stock]').value||'0');
            const sku = tr.querySelector('[data-var-sku]').value.trim();
            const priceStr = tr.querySelector('[data-var-price]').value;
            const priceOverride = priceStr!==''? Number(priceStr): undefined;
            return { size, color, stock: isNaN(stock)? 0: stock, sku: sku||undefined, ...(priceOverride!==undefined? { priceOverride }: {}) };
          }).filter(v=>v.size||v.color);
          await this.model.updateProduct(id, { variants });
          this.view.toast('Variantes guardadas');
          this.view.toggleModal('variantsModal', false);
          await this.model.refreshProducts();
          this.view.renderAdmin('products', this.model);
        }catch(err){ this.view.toast(err.message||'Error al guardar variantes','error'); }
      })(); }

      const viewClientOrders = e.target.closest('[data-view-client-orders]');
      if(viewClientOrders){ const id=viewClientOrders.getAttribute('data-view-client-orders'); const orders=this.model.clientOrders(id); alert(`Este cliente tiene ${orders.length} pedidos.\nTotal: $${orders.reduce((s,o)=>s+o.total,0).toFixed(2)}`); }

      const updOrder = e.target.closest('[data-update-order]');
      if(updOrder){ (async()=>{ const id=updOrder.getAttribute('data-update-order'); const status=prompt('Nuevo estado (confirmado/enviado/entregado):'); if(status){ await this.model.adminUpdateOrderStatus(id, status); this.view.toast('Estado actualizado'); this.view.renderAdmin('orders', this.model); } })(); }

      const detOrder = e.target.closest('[data-order-details]');
      if(detOrder){ const id=detOrder.getAttribute('data-order-details'); const o=this.model.state.orders.find(x=>String(x.id)===String(id) || String(x._id)===String(id)); if(o){ this.view.renderInvoice(o); this.view.toggleModal('invoiceModal', true); } }

      const togglePromo = e.target.closest('[data-toggle-promo]');
      if(togglePromo){ (async()=>{ const id=togglePromo.getAttribute('data-toggle-promo'); await this.model.togglePromotion(id); this.view.toast('Promoción actualizada'); this.view.renderAdmin('promotions', this.model); bus.emit('state:change'); })(); }

      const addProductBtn = e.target.id === 'addProductBtn';
      if(addProductBtn){ this.openProductModal(); }

      // Admin: load pending reviews on reviews section
      if(this.currentAdminSection==='reviews'){
        const mount = document.getElementById('adminReviewsContent');
        if(mount && !mount.dataset.loaded){
          (async()=>{
            try{
              const list = await reviewsApi.pending();
              mount.innerHTML = list.length===0? '<p>No hay reseñas pendientes</p>' : `
                <table style="width:100%"><thead><tr><th>Producto</th><th>Rating</th><th>Comentario</th><th>Fecha</th><th>Acción</th></tr></thead><tbody>
                ${list.map(r=>`<tr>
                  <td>${r.productId}</td>
                  <td>⭐ ${r.rating}</td>
                  <td>${r.comment||''}</td>
                  <td>${new Date(r.createdAt).toLocaleDateString()}</td>
                  <td><button class="pl-btn pl-primary" data-approve-review="${r._id}">Aprobar</button></td>
                </tr>`).join('')}
                </tbody></table>`;
              mount.dataset.loaded = '1';
            }catch(err){ mount.innerHTML = `<p class="pl-muted">${err.message||'Error'}</p>`; }
          })();
        }
      }

      const approveBtn = e.target.closest('[data-approve-review]');
      if(approveBtn){ (async()=>{
        try{ await reviewsApi.approve(approveBtn.getAttribute('data-approve-review')); this.view.toast('Reseña aprobada'); approveBtn.closest('tr')?.remove(); }
        catch(err){ this.view.toast(err.message||'Error al aprobar','error'); }
      })(); }

      // Admin: tracking editor
      const adminTrackBtn = e.target.closest('[data-admin-track]');
      if(adminTrackBtn){ (async()=>{
        const oid = adminTrackBtn.getAttribute('data-admin-track');
        try{
          const res = await fetch(`${window.__API_URL__||'https://d2nkt7j19iaq1l.cloudfront.net'}/orders/${oid}/tracking`, { headers: { Authorization: 'Bearer ' + (this.model.token||'') } });
          const data = await res.json();
          if(!res.ok){ throw new Error(data?.error||'Error'); }
          const cont = document.getElementById('trackingContent');
          cont.innerHTML = `
            <h3>Tracking Pedido ${oid}</h3>
            <div class="pl-row-gap" style="margin:0.5rem 0">
              <label>Guía <input id="trkNumber" class="pl-input" value="${data.trackingNumber||''}"></label>
              <label>Carrier <input id="trkCarrier" class="pl-input" value="${data.carrier||''}"></label>
              <button class="pl-btn pl-primary" id="saveTrackMetaBtn">Guardar</button>
            </div>
            <h4>Eventos</h4>
            <div id="trackEvents">${(!data.events||data.events.length===0)? '<p class=\"pl-muted\">Sin eventos</p>': data.events.map(ev=>`<div class=\"pl-card\" style=\"margin:0.25rem 0\"><div class=\"pl-card-body\"><div>${new Date(ev.date).toLocaleString()}</div><div>${ev.status}</div><div class=\"pl-muted\">${ev.note||''}</div></div></div>`).join('')}</div>
            <div class="pl-row-gap" style="margin-top:0.5rem">
              <label>Estado <input id="trkStatus" class="pl-input" placeholder="en tránsito / entregado"></label>
              <label>Nota <input id="trkNote" class="pl-input" placeholder="Observación"></label>
              <button class="pl-btn pl-ghost" id="addTrackEventBtn">Agregar evento</button>
            </div>
          `;
          this.view.toggleModal('trackingModal', true);
          const saveBtn = document.getElementById('saveTrackMetaBtn');
          if(saveBtn){ saveBtn.addEventListener('click', async ()=>{
            try{
              const body = { trackingNumber: document.getElementById('trkNumber').value, carrier: document.getElementById('trkCarrier').value };
              const r2 = await fetch(`${window.__API_URL__||'https://d2nkt7j19iaq1l.cloudfront.net'}/orders/${oid}/tracking/meta`, { method:'PATCH', headers: { 'Content-Type':'application/json', Authorization: 'Bearer ' + (this.model.token||'') }, body: JSON.stringify(body) });
              const d2 = await r2.json(); if(!r2.ok) throw new Error(d2?.error||'Error');
              this.view.toast('Tracking actualizado');
            }catch(err){ this.view.toast(err.message||'Error al guardar tracking','error'); }
          }); }
          const addEvBtn = document.getElementById('addTrackEventBtn');
          if(addEvBtn){ addEvBtn.addEventListener('click', async ()=>{
            try{
              const body = { status: document.getElementById('trkStatus').value, note: document.getElementById('trkNote').value };
              const r3 = await fetch(`${window.__API_URL__||'https://d2nkt7j19iaq1l.cloudfront.net'}/orders/${oid}/tracking`, { method:'POST', headers: { 'Content-Type':'application/json', Authorization: 'Bearer ' + (this.model.token||'') }, body: JSON.stringify(body) });
              const d3 = await r3.json(); if(!r3.ok) throw new Error(d3?.error||'Error');
              const wrap = document.getElementById('trackEvents');
              wrap.innerHTML = d3.events.map(ev=>`<div class=\"pl-card\" style=\"margin:0.25rem 0\"><div class=\"pl-card-body\"><div>${new Date(ev.date).toLocaleString()}</div><div>${ev.status}</div><div class=\"pl-muted\">${ev.note||''}</div></div></div>`).join('');
              this.view.toast('Evento agregado');
            }catch(err){ this.view.toast(err.message||'Error al agregar evento','error'); }
          }); }
        }catch(err){ this.view.toast(err.message||'Error al cargar tracking','error'); }
      })(); }

      const reviewsBtn = e.target.closest('[data-reviews]');
      if(reviewsBtn){ (async()=>{
        const pid = reviewsBtn.getAttribute('data-reviews');
        const product = this.model.state.products.find(p=>String(p._id||p.id)===String(pid));
        const pName = product?.name || 'Producto';
        try{
          const list = await reviewsApi.list(pid);
          const cont = document.getElementById('reviewsContent');
          const canPost = !!this.model.state.currentUser && this.model.state.currentUser.role !== 'admin';
          const stars = (n)=> '★'.repeat(n) + '☆'.repeat(5-n);
          const avg = list.length ? (list.reduce((s,r)=>s+r.rating,0)/list.length).toFixed(1) : '—';
          cont.innerHTML = `
            <h3 style="margin-top:0">Reseñas de ${pName}</h3>
            <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1rem">
              <span style="font-size:2rem;font-weight:700;color:#8b7355">${avg}</span>
              <div>
                <div style="color:#f39c12;font-size:1.2rem;letter-spacing:2px">${list.length ? stars(Math.round(list.reduce((s,r)=>s+r.rating,0)/list.length)) : '☆☆☆☆☆'}</div>
                <span class="pl-muted">${list.length} reseña(s)</span>
              </div>
            </div>
            ${list.length===0 ? '<p class="pl-muted">Este producto aún no tiene reseñas aprobadas. ¡Sé el primero!</p>' :
              list.map(r=>`<div style="border-bottom:1px solid #eee;padding:12px 0">
                <div style="display:flex;justify-content:space-between;align-items:center">
                  <span style="color:#f39c12;letter-spacing:1px">${stars(r.rating)}</span>
                  <span class="pl-muted" style="font-size:.8rem">${new Date(r.createdAt).toLocaleDateString('es-CO')}</span>
                </div>
                ${r.comment ? `<p style="margin:6px 0 0">${r.comment}</p>` : ''}
              </div>`).join('')}
            ${canPost ? `
              <div class="pl-card" style="margin-top:1.5rem;border-left:4px solid #8b7355"><div class="pl-card-body">
                <h4 style="margin-top:0">Escribe tu reseña</h4>
                <label class="pl-label">Calificación
                  <div id="starPicker" style="font-size:1.5rem;cursor:pointer;color:#ddd;letter-spacing:4px;margin:4px 0">
                    <span data-star="1">★</span><span data-star="2">★</span><span data-star="3">★</span><span data-star="4">★</span><span data-star="5">★</span>
                  </div>
                  <input type="hidden" id="reviewRating" value="5">
                </label>
                <label class="pl-label">Comentario
                  <textarea id="reviewComment" rows="3" class="pl-input" placeholder="Cuéntanos tu experiencia con este producto..."></textarea>
                </label>
                <button class="pl-btn pl-primary" id="sendReviewBtn" data-pid="${pid}">Enviar Reseña</button>
                <p class="pl-muted" style="font-size:.8rem;margin-top:6px">Tu reseña será revisada por un administrador antes de publicarse.</p>
              </div></div>` : (!this.model.state.currentUser ? '<p class="pl-muted" style="margin-top:1rem">Inicia sesión para escribir una reseña.</p>' : '')}
          `;
          this.view.toggleModal('reviewsModal', true);

          // Star picker interaction
          const picker = document.getElementById('starPicker');
          const ratingInput = document.getElementById('reviewRating');
          if(picker){
            let selected = 5;
            const paintStars = (n)=>{ picker.querySelectorAll('[data-star]').forEach(s=>{ s.style.color = parseInt(s.dataset.star) <= n ? '#f39c12' : '#ddd'; }); };
            paintStars(selected);
            picker.addEventListener('click', (ev)=>{
              const s = ev.target.closest('[data-star]');
              if(s){ selected = parseInt(s.dataset.star); ratingInput.value = selected; paintStars(selected); }
            });
            picker.addEventListener('mouseover', (ev)=>{
              const s = ev.target.closest('[data-star]');
              if(s) paintStars(parseInt(s.dataset.star));
            });
            picker.addEventListener('mouseout', ()=> paintStars(selected));
          }

          // Submit review
          const sendBtn = document.getElementById('sendReviewBtn');
          if(sendBtn){
            sendBtn.onclick = async ()=>{
              try{
                const rating = parseInt(ratingInput.value);
                const comment = document.getElementById('reviewComment').value.trim();
                if(!comment){ this.view.toast('Escribe un comentario para tu reseña','error'); return; }
                sendBtn.disabled = true; sendBtn.textContent = 'Enviando...';
                await reviewsApi.add(pid, { rating, comment });
                this.view.toast('¡Reseña enviada! Será visible una vez aprobada por un administrador.');
                this.view.toggleModal('reviewsModal', false);
              }catch(err){ 
                sendBtn.disabled = false; sendBtn.textContent = 'Enviar Reseña';
                this.view.toast(err.message||'Error al enviar reseña','error'); 
              }
            };
          }
        }catch(err){ this.view.toast(err.message||'Error al cargar reseñas','error'); }
      })(); }

      const wishlistBtn = e.target.closest('[data-wishlist]');
      if(wishlistBtn){ (async()=>{
        const pid = wishlistBtn.getAttribute('data-wishlist');
        try{
          if(typeof this.model.toggleWishlist === 'function'){
            await this.model.toggleWishlist(pid);
          } else {
            // fallback direct API toggle
            const idStr = String(pid);
            this.model.state.wishlist = this.model.state.wishlist || [];
            const has = this.model.state.wishlist.map(String).includes(idStr);
            if(has){ await wishlistApi.remove(pid); this.model.state.wishlist = this.model.state.wishlist.filter(x=>String(x)!==idStr); }
            else { await wishlistApi.add(pid); this.model.state.wishlist.push(idStr); }
          }
          const added = (this.model.state.wishlist||[]).map(String).includes(String(pid));
          this.view.toast(added? 'Agregado a favoritos' : 'Eliminado de favoritos');
          // Re-render wishlist section if currently viewing it
          if(this.view.refs.customerContent && this.view.refs.customerContent.querySelector('[data-wishlist-section]')){
            this._renderWishlistSection();
          }
        }catch(err){ this.view.toast(err.message||'Error en favoritos','error'); }
      })(); }

      // Filters
      const applyFilters = e.target.id === 'applyFiltersBtn';
      if(applyFilters){ (async()=>{
        const size = document.getElementById('filterSize')?.value || '';
        const color = document.getElementById('filterColor')?.value || '';
        const minPrice = document.getElementById('filterMinPrice')?.value || '';
        const maxPrice = document.getElementById('filterMaxPrice')?.value || '';
        const inStock = document.getElementById('filterInStock')?.checked || false;
        
        const query = {};
        if(size) query.size = size;
        if(color) query.color = color;
        if(minPrice) query.minPrice = minPrice;
        if(maxPrice) query.maxPrice = maxPrice;
        if(inStock) query.inStock = true;
        
        await this.model.refreshProducts(query);
        this.currentPage = 1;
        this.renderProducts();
      })(); }

      const clearFilters = e.target.id === 'clearFiltersBtn';
      if(clearFilters){ (async()=>{
        ['filterSize','filterColor','filterMinPrice','filterMaxPrice'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
        const ck = document.getElementById('filterInStock'); if(ck) ck.checked = false;
        await this.model.refreshProducts();
        this.currentPage = 1;
        this.renderProducts();
      })(); }

      // Wishlist section in customer area
      const wishlistSectionBtn = e.target.id === 'wishlistBtn';
      if(wishlistSectionBtn){ (async()=>{
        try{
          if(typeof this.model.refreshWishlist === 'function'){
            await this.model.refreshWishlist();
          } else {
            const wl = await wishlistApi.get();
            this.model.state.wishlist = Array.isArray(wl?.items)? wl.items.map(String): [];
          }
          this._renderWishlistSection();
        }catch(err){ this.view.toast(err.message||'Error al cargar favoritos','error'); }
      })(); }
      const newPromoBtn = e.target.id === 'newPromoBtn';
      if(newPromoBtn){ (async()=>{
        const code = prompt('Código de promoción:'); if(!code) return;
        const discount = parseInt(prompt('Porcentaje de descuento:')); if(isNaN(discount) || discount<1 || discount>99) return;
        await this.model.createPromotion({ code, discount });
        this.view.toast('Promoción creada con éxito');
        this.view.renderAdmin('promotions', this.model);
        bus.emit('state:change');
      })(); }

      // Customer: track order
      const trackOrderBtn = e.target.closest('[data-track-order]');
      if(trackOrderBtn){ (async()=>{
        const oid = trackOrderBtn.getAttribute('data-track-order');
        const order = this.model.state.orders.find(o=>String(o._id||o.id)===String(oid));
        if(!order){ this.view.toast('Pedido no encontrado','error'); return; }
        try{
          const res = await fetch(`${window.__API_URL__||'https://d2nkt7j19iaq1l.cloudfront.net'}/orders/${oid}/tracking`, { headers: { Authorization: 'Bearer ' + (this.model.token||'') } });
          const data = await res.json();
          if(!res.ok) throw new Error(data?.error||'Error');
          const events = data.events || [];
          const statusCol = { confirmado:'#f39c12', enviado:'#2980b9', entregado:'#27ae60' };
          this.view.refs.customerContent.innerHTML = `
            <button class="pl-btn pl-ghost" id="backToPurchaseHistory" style="margin-bottom:1rem">← Volver al Historial</button>
            <h3>Rastreo del Pedido ${order.invoiceNumber||order.id}</h3>
            <div style="display:inline-block;background:${statusCol[order.status]||'#999'};color:#fff;padding:6px 16px;border-radius:16px;font-weight:600;margin-bottom:1rem">${order.status}</div>

            <div class="pl-grid" style="grid-template-columns:1fr 1fr;gap:1.5rem;margin:1rem 0">
              <div class="pl-card"><div class="pl-card-body">
                <h4 style="margin-top:0">Datos de Envío</h4>
                <p><strong>Transportadora:</strong> ${data.carrier||'Pendiente de asignación'}</p>
                <p><strong>Número de guía:</strong> ${data.trackingNumber||'Pendiente'}</p>
                <p><strong>Ciudad destino:</strong> ${order.shippingCity||'—'}</p>
              </div></div>
              <div class="pl-card"><div class="pl-card-body">
                <h4 style="margin-top:0">Resumen del Pedido</h4>
                <p><strong>Total:</strong> ${cop(order.total)}</p>
                <p><strong>Fecha:</strong> ${new Date(order.date).toLocaleDateString('es-CO')}</p>
                <p><strong>Productos:</strong> ${(order.items||[]).length} artículo(s)</p>
              </div></div>
            </div>

            <div class="pl-card" style="margin:1rem 0"><div class="pl-card-body">
              <h4 style="margin-top:0">Historial de Seguimiento</h4>
              ${events.length===0?'<p class="pl-muted">Aún no hay eventos de seguimiento registrados. Te notificaremos cuando haya novedades.</p>':
                `<div style="position:relative;padding-left:24px">
                  ${events.map((ev,i)=>`<div style="position:relative;padding-bottom:${i<events.length-1?'20px':'0'};border-left:${i<events.length-1?'2px solid #ddd':'none'};padding-left:20px;margin-left:0">
                    <div style="position:absolute;left:-9px;top:4px;width:16px;height:16px;border-radius:50%;background:${i===0?'#27ae60':'#ccc'};border:2px solid #fff"></div>
                    <div style="font-size:.85rem;color:#888">${new Date(ev.date).toLocaleString('es-CO')}</div>
                    <div style="font-weight:600;margin:2px 0">${ev.status}</div>
                    ${ev.note?`<div class="pl-muted" style="font-size:.9rem">${ev.note}</div>`:''}
                  </div>`).join('')}
                </div>`}
            </div></div>`;
          document.getElementById('backToPurchaseHistory').onclick = async ()=>{
            try{ await this.model.refreshMyOrders(); }catch(e){}
            this.view.renderPurchaseHistory(this.model.state.orders);
          };
        }catch(err){ this.view.toast(err.message||'Error al cargar tracking','error'); }
      })(); }

      // Customer: return request from purchase history
      const returnOrderBtn = e.target.closest('[data-return-order]');
      if(returnOrderBtn){ (async()=>{
        const oid = returnOrderBtn.getAttribute('data-return-order');
        const order = this.model.state.orders.find(o=>String(o._id||o.id)===String(oid));
        if(!order){ this.view.toast('Pedido no encontrado','error'); return; }
        if(order.status!=='entregado'){ this.view.toast('Solo puedes solicitar devolución de pedidos entregados','error'); return; }
        const orderDate = order.date || order.createdAt;
        const daysSince = (Date.now() - new Date(orderDate).getTime()) / (1000*60*60*24);
        if(daysSince>30){ this.view.toast('El plazo de 30 días para devoluciones ha expirado','error'); return; }
        const daysLeft = Math.ceil(30 - daysSince);
        const items = order.items||[];
        this.view.refs.customerContent.innerHTML = `
          <div class="pl-card" style="max-width:700px"><div class="pl-card-body">
            <h3>Solicitar Devolución</h3>
            <p class="pl-muted">Pedido <strong>${order.invoiceNumber||order.id}</strong> — Te quedan <strong>${daysLeft} días</strong> para solicitar devolución.</p>
            <form id="returnRequestForm" novalidate>
              <input type="hidden" id="returnOrderId" value="${order._id||order.id}">
              <label class="pl-label">Producto a devolver *
                <select id="returnProduct" class="pl-input" required>
                  <option value="">Seleccionar producto...</option>
                  ${items.map(it=>{
                    const vid = it.variant?.id || '';
                    const vlabel = it.variant ? ` (${it.variant.size||''}/${it.variant.color||''})` : '';
                    return `<option value="${it.productId}||${vid}" data-name="${it.product?.name||it.productName||''}">${it.product?.name||it.productName||'Producto'}${vlabel} — x${it.quantity}</option>`;
                  }).join('')}
                </select>
              </label>
              <label class="pl-label">Tipo de devolución *
                <select id="returnType" class="pl-input" required>
                  <option value="">Seleccionar...</option>
                  <option value="garantia">Garantía (defecto de fábrica)</option>
                  <option value="defecto">Defecto recibido dañado</option>
                  <option value="cambio_talla">Cambio de talla</option>
                  <option value="cambio_color">Cambio de color</option>
                  <option value="otro">Otro motivo</option>
                </select>
              </label>
              <div id="returnShippingNote" style="display:none;margin:.5rem 0;padding:10px;border-radius:6px;font-size:.9rem"></div>
              <label class="pl-label">Motivo detallado *
                <textarea id="returnReason" class="pl-input" rows="3" placeholder="Describe el motivo de tu devolución..." required></textarea>
              </label>
              <div style="background:#faf9f7;padding:12px;border-radius:8px;margin:1rem 0;font-size:.85rem;color:#555">
                <strong>Políticas de devolución:</strong>
                <ul style="margin:8px 0 0;padding-left:20px">
                  <li>Plazo máximo: 30 días después de la compra.</li>
                  <li>No se realizan devoluciones de dinero. Se genera un <strong>cupón personal</strong> por el valor del producto.</li>
                  <li>El producto debe estar en perfectas condiciones (sin uso, limpio, con etiquetas).</li>
                  <li>Si no es garantía, los gastos de envío (ida y vuelta) corren por tu cuenta.</li>
                </ul>
              </div>
              <div style="display:flex;gap:.75rem">
                <button type="submit" class="pl-btn pl-primary">Enviar Solicitud</button>
                <button type="button" class="pl-btn pl-ghost" id="cancelReturnBtn">Cancelar</button>
              </div>
            </form>
          </div></div>`;
        // Toggle shipping note based on type
        document.getElementById('returnType').onchange = ()=>{
          const t = document.getElementById('returnType').value;
          const note = document.getElementById('returnShippingNote');
          if(t==='garantia'||t==='defecto'){ note.style.display='block'; note.style.background='#e8f5e9'; note.innerHTML='✅ <strong>Garantía:</strong> Los gastos de envío corren por nuestra cuenta.'; }
          else if(t){ note.style.display='block'; note.style.background='#fff3cd'; note.innerHTML='⚠️ Los gastos de envío (ida y vuelta) corren por tu cuenta.'; }
          else { note.style.display='none'; }
        };
        document.getElementById('cancelReturnBtn').onclick = ()=>{
          const orders = this.model.clientOrders(this.model.state.currentUser.id);
          this.view.renderPurchaseHistory(orders);
        };
        document.getElementById('returnRequestForm').onsubmit = async (ev)=>{
          ev.preventDefault();
          const prodVal = document.getElementById('returnProduct').value;
          if(!prodVal){ this.view.toast('Selecciona un producto','error'); return; }
          const [productId, variantId] = prodVal.split('||');
          const type = document.getElementById('returnType').value;
          if(!type){ this.view.toast('Selecciona el tipo de devolución','error'); return; }
          const reason = document.getElementById('returnReason').value.trim();
          if(!reason){ this.view.toast('Escribe el motivo de la devolución','error'); return; }
          try{
            await this.model.createReturn({
              orderId: document.getElementById('returnOrderId').value,
              productId,
              variantId: variantId || undefined,
              type,
              reason
            });
            this.view.toast('Solicitud de devolución enviada. Te notificaremos cuando sea revisada.');
            const orders = this.model.clientOrders(this.model.state.currentUser.id);
            this.view.renderPurchaseHistory(orders);
          }catch(err){ this.view.toast(err.message,'error'); }
        };
      })(); }

      // Customer: view my returns
      const myReturnsBtn = e.target.id === 'myReturnsBtn';
      if(myReturnsBtn){ (async()=>{
        try{
          const returns = await this.model.getMyReturns();
          const statusLabels = { solicitada:'Pendiente', aprobada:'Aprobada — Envía tu producto', rechazada:'Rechazada', enviada_cliente:'Enviada', recibida:'En revisión', revisada_apta:'Aprobada', revisada_no_apta:'No aprobada', completada:'Completada' };
          const statusColors = { solicitada:'#f39c12', aprobada:'#2980b9', rechazada:'#e74c3c', recibida:'#3498db', revisada_apta:'#27ae60', revisada_no_apta:'#e74c3c', completada:'#27ae60' };
          this.view.refs.customerContent.innerHTML = `
            <h3>Mis Devoluciones</h3>
            ${returns.length===0?'<p class="pl-muted">No tienes devoluciones.</p>':`
            <table style="width:100%;border-collapse:collapse">
              <thead><tr><th>#</th><th>Producto</th><th>Tipo</th><th>Estado</th><th>Cupón</th><th>Fecha</th></tr></thead>
              <tbody>${returns.map(r=>`<tr>
                <td>${r.returnNumber||'—'}</td>
                <td>${r.productName||'—'}${r.variantLabel?' ('+r.variantLabel+')':''}</td>
                <td style="font-size:.85rem">${{garantia:'Garantía',cambio_talla:'Cambio talla',cambio_color:'Cambio color',defecto:'Defecto',otro:'Otro'}[r.type]||r.type}</td>
                <td><span style="background:${statusColors[r.status]||'#999'};color:#fff;padding:3px 10px;border-radius:12px;font-size:.8rem;font-weight:600">${statusLabels[r.status]||r.status}</span></td>
                <td>${r.couponCode?`<strong style="color:#27ae60">${r.couponCode}</strong>`:r.status==='rechazada'||r.status==='revisada_no_apta'?'<span class="pl-muted">—</span>':'<span class="pl-muted">Pendiente</span>'}</td>
                <td style="font-size:.85rem">${new Date(r.createdAt).toLocaleDateString('es-CO')}</td>
              </tr>`).join('')}</tbody>
            </table>`}`;
        }catch(err){ this.view.toast(err.message||'Error al cargar devoluciones','error'); }
      })(); }

      const saveProfileBtn = e.target.id === 'saveProfileBtn';
      if(saveProfileBtn){ (async () => {
        const name = (document.getElementById('profileName')?.value||'').trim();
        const username = (document.getElementById('profileUsername')?.value||'').trim();
        const address = (document.getElementById('profileAddress')?.value||'').trim();
        const phone = (document.getElementById('profilePhone')?.value||'').trim();
        try{
          await this.model.updateCurrentUser({ name, username, address, phone });
          this.view.toast('Perfil actualizado');
          this.view.renderCustomerHome(this.model.state.currentUser);
        }catch(err){ this.view.toast((err && err.message) ? err.message : 'Error al actualizar perfil','error'); }
      })(); }

      const resendVerificationBtn = e.target.id === 'resendVerificationBtn';
      if(resendVerificationBtn){ (async () => {
        try{
          const email = this.model.state.currentUser?.email;
          if(!email){
            this.view.toast('No hay correo electrónico asociado a esta cuenta','error');
            return;
          }
          
          const res = await fetch(`${window.__API_URL__||'https://d2nkt7j19iaq1l.cloudfront.net'}/auth/resend-verification`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
          });
          const data = await res.json();
          if(!res.ok) throw new Error(data.error || 'Error');
          this.view.toast(data.message || 'Correo de verificación reenviado');
        }catch(err){
          this.view.toast(err.message || 'Error al reenviar correo de verificación','error');
        }
      })(); }

      // Toggle 2FA
      if(e.target.id === 'toggle2FABtn'){ (async () => {
        try{
          const res = await api.toggle2FA();
          this.model.state.currentUser.twoFactorEnabled = res.twoFactorEnabled;
          try{ localStorage.setItem('pl_user', JSON.stringify(this.model.state.currentUser)); }catch(_){}
          this.view.toast(res.message);
          this.view.renderCustomerHome(this.model.state.currentUser);
        }catch(err){ this.view.toast(err.message||'Error al cambiar 2FA','error'); }
      })(); }

      // Deactivate account
      if(e.target.id === 'deactivateAccountBtn'){ (async () => {
        if(!confirm('¿Estás seguro de que deseas desactivar tu cuenta? No podrás iniciar sesión hasta que contactes a soporte.')) return;
        const password = prompt('Ingresa tu contraseña para confirmar:');
        if(!password) return;
        try{
          await api.deactivateAccount(password);
          this.view.toast('Tu cuenta ha sido desactivada.');
          this.model.logout();
          this.view.setUserUI(null);
          this.view.showSections({home:true, products:true, customer:false, admin:false});
          this.route('home');
        }catch(err){ this.view.toast(err.message||'Error al desactivar cuenta','error'); }
      })(); }
    });

    // Forms
    const loginForm = document.getElementById('loginForm');
    if(loginForm){
      loginForm.addEventListener('submit', async (e)=>{
        e.preventDefault();
        const u = document.getElementById('username').value;
        const p = document.getElementById('password').value;
        const loginBtn = loginForm.querySelector('button[type="submit"]');
        if(loginBtn){ loginBtn.disabled = true; loginBtn.textContent = 'Ingresando...'; }
        try{
          const result = await this.model.login(u,p);
          if(result.requires2FA){
            this.view.toggleModal('loginModal', false);
            const uidEl = document.getElementById('twoFactorUserId');
            const codeEl = document.getElementById('twoFactorCode');
            if(uidEl) uidEl.value = result.userId;
            if(codeEl) codeEl.value = '';
            this.view.toggleModal('twoFactorModal', true);
            this.view.toast(result.message || 'Código enviado a tu correo', 'success');
            if(codeEl) setTimeout(()=> codeEl.focus(), 300);
            return;
          }
          const user = result;
          this.view.toggleModal('loginModal', false);
          this._completeLogin(user);
        } catch(err){
          this.view.toast(err.message||'Credenciales inválidas','error');
        } finally {
          if(loginBtn){ loginBtn.disabled = false; loginBtn.textContent = 'Ingresar'; }
        }
      });
    }
    // 2FA verification form (use delegation for robustness)
    document.addEventListener('submit', async (e)=>{
      if(e.target && e.target.id === 'twoFactorForm'){
        e.preventDefault();
        const userId = document.getElementById('twoFactorUserId')?.value;
        const code = (document.getElementById('twoFactorCode')?.value || '').trim();
        if(!code || code.length !== 6){ this.view.toast('Ingresa el código de 6 dígitos','error'); return; }
        const btn = e.target.querySelector('button[type="submit"]');
        if(btn){ btn.disabled = true; btn.textContent = 'Verificando...'; }
        try{
          const user = await this.model.verify2FA(userId, code);
          this.view.toggleModal('twoFactorModal', false);
          this._completeLogin(user);
        }catch(err){
          this.view.toast(err.message||'Código incorrecto','error');
        }finally{
          if(btn){ btn.disabled = false; btn.textContent = 'Verificar'; }
        }
      }
    });
    // T&C checkbox → enable/disable register button
    const regTerms = document.getElementById('regTerms');
    const regSubmitBtn = document.getElementById('regSubmitBtn');
    if(regTerms && regSubmitBtn){
      regTerms.addEventListener('change', ()=>{ regSubmitBtn.disabled = !regTerms.checked; });
    }
    // T&C checkbox → enable/disable order button
    const orderTerms = document.getElementById('orderTerms');
    const orderSubmitBtn = document.getElementById('orderSubmitBtn');
    if(orderTerms && orderSubmitBtn){
      orderTerms.addEventListener('change', ()=>{ orderSubmitBtn.disabled = !orderTerms.checked; });
    }

    const registerForm = document.getElementById('registerForm');
    registerForm.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const payload = {
        name: document.getElementById('regName').value.trim(),
        email: document.getElementById('regEmail').value.trim(),
        username: document.getElementById('regUsername').value.trim(),
        password: document.getElementById('regPassword').value,
      };
      // Client-side validations
      if(!payload.name){ this.view.toast('El nombre es obligatorio','error'); return; }
      if(!payload.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)){ this.view.toast('Ingresa un correo electrónico válido','error'); return; }
      if(!payload.username || payload.username.length<3){ this.view.toast('El usuario debe tener al menos 3 caracteres','error'); return; }
      if(payload.password.length<6){ this.view.toast('La contraseña debe tener al menos 6 caracteres','error'); return; }
      if(!/[A-Z]/.test(payload.password)){ this.view.toast('La contraseña debe tener al menos una mayúscula','error'); return; }
      if(!/[a-z]/.test(payload.password)){ this.view.toast('La contraseña debe tener al menos una minúscula','error'); return; }
      if(!/[0-9]/.test(payload.password)){ this.view.toast('La contraseña debe tener al menos un número','error'); return; }
      if(!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(payload.password)){ this.view.toast('La contraseña debe tener al menos un carácter especial (!@#$%^&*...)','error'); return; }
      try{ 
        const response = await this.model.register(payload); 
        this.view.toggleModal('registerModal', false); 
        this.showEmailVerificationAlert(payload.email);
      }
      catch(err){ this.view.toast(err.message,'error'); }
    });

    // Forgot password form
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    if(forgotPasswordForm){
      forgotPasswordForm.addEventListener('submit', async (e)=>{
        e.preventDefault();
        const email = document.getElementById('forgotEmail').value;
        try{
          const res = await fetch(`${window.__API_URL__||'https://d2nkt7j19iaq1l.cloudfront.net'}/auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
          });
          const data = await res.json();
          if(!res.ok) throw new Error(data.error || 'Error');
          this.view.toggleModal('forgotPasswordModal', false);
          this.view.toast(data.message || 'Se ha enviado un correo de recuperación');
        }catch(err){
          this.view.toast(err.message || 'Error al enviar correo de recuperación', 'error');
        }
      });
    }

    // Reset password form
    const resetPasswordForm = document.getElementById('resetPasswordForm');
    if(resetPasswordForm){
      resetPasswordForm.addEventListener('submit', async (e)=>{
        e.preventDefault();
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmNewPassword').value;
        const token = document.getElementById('resetToken').value;
        
        if(newPassword !== confirmPassword){
          this.view.toast('Las contraseñas no coinciden', 'error');
          return;
        }
        
        try{
          const res = await fetch(`${window.__API_URL__||'https://d2nkt7j19iaq1l.cloudfront.net'}/auth/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, newPassword })
          });
          const data = await res.json();
          if(!res.ok) throw new Error(data.error || 'Error');
          this.view.toggleModal('resetPasswordModal', false);
          this.view.toast(data.message || 'Contraseña actualizada exitosamente');
          // Open login modal
          this.view.toggleModal('loginModal', true);
        }catch(err){
          this.view.toast(err.message || 'Error al restablecer contraseña', 'error');
        }
      });
    }

    const orderForm = document.getElementById('orderForm');
    let orderSubmitting = false;
    orderForm.addEventListener('submit', async (e)=>{
      e.preventDefault();
      if(orderSubmitting) return; // double-click guard

      // ── Required field validations ──
      const nameVal = document.getElementById('orderName').value.trim();
      const emailVal = document.getElementById('orderEmail').value.trim();
      const addrVal = document.getElementById('orderAddress').value.trim();
      const addr2Val = document.getElementById('orderAddress2')?.value?.trim() || '';
      const deptVal = document.getElementById('orderDepartment')?.value || '';
      const cityVal = this.currentShipping?.city || document.getElementById('orderCity')?.value?.trim() || '';
      const phoneVal = document.getElementById('orderPhone').value.trim();
      const postalVal = document.getElementById('orderPostalCode')?.value?.trim() || '';
      const cedulaVal = document.getElementById('orderCedula')?.value?.trim() || '';
      const method = document.getElementById('paymentMethod').value;

      if(!nameVal){ this.view.toast('El nombre es obligatorio','error'); return; }
      if(!emailVal){ this.view.toast('El correo es obligatorio','error'); return; }
      if(!addrVal){ this.view.toast('La dirección de envío es obligatoria','error'); return; }
      if(!deptVal){ this.view.toast('Selecciona un departamento','error'); return; }
      if(!cityVal){ this.view.toast('Debes calcular el envío seleccionando una ciudad','error'); return; }
      if(!phoneVal){ this.view.toast('El teléfono es obligatorio','error'); return; }
      if(!method){ this.view.toast('Selecciona un método de pago','error'); return; }

      if(method==='credit' || method==='debit'){
        const ok = PaymentStrategies[method].validate({ number:document.getElementById('cardNumber').value, expiry:document.getElementById('cardExpiry').value, cvv:document.getElementById('cardCVV').value });
        if(!ok){ this.view.toast('Datos de tarjeta inválidos','error'); return; }
      }

      // Disable submit button
      orderSubmitting = true;
      const submitBtn = orderForm.querySelector('button[type="submit"], input[type="submit"]') || orderForm.querySelector('.pl-btn.pl-primary');
      if(submitBtn){ submitBtn.disabled = true; submitBtn.textContent = 'Procesando...'; }

      const orderPayload = {
        userName: nameVal,
        email: emailVal,
        address: addrVal,
        address2: addr2Val,
        department: deptVal,
        postalCode: postalVal,
        cedula: cedulaVal,
        phone: phoneVal,
        paymentMethod: method,
        shippingCity: cityVal,
        shippingCost: (typeof this.currentShipping?.cost==='number'? this.currentShipping.cost: undefined),
        giftCardCode: document.getElementById('giftCardCode')?.value || undefined
      };

      // ── Mercado Pago flow — redirect to MP checkout ──
      if(method === 'mercadopago'){
        try{
          if(submitBtn){ submitBtn.disabled = true; submitBtn.textContent = 'Redirigiendo a Mercado Pago...'; }
          const prefPayload = {
            items: this.model.state.cart.map(c => ({
              productId: c.product.id || c.product._id,
              variantId: c.variantId || undefined,
              quantity: c.quantity,
            })),
            userName: nameVal,
            email: this.model.state.currentUser?.email || '',
            address: addrVal,
            address2: document.getElementById('orderAddress2')?.value?.trim() || '',
            department: document.getElementById('orderDepartment')?.value || '',
            postalCode: document.getElementById('orderPostalCode')?.value?.trim() || '',
            cedula: document.getElementById('orderCedula')?.value?.trim() || '',
            phone: phoneVal,
            paymentMethod: 'mercadopago',
            shippingCity: document.getElementById('orderCity')?.value || '',
            shippingCost: (typeof this.currentShipping?.cost==='number'? this.currentShipping.cost: undefined),
            promoCode: this.model.state.currentPromo?.code || undefined,
            giftCardCode: document.getElementById('giftCardCode')?.value || undefined,
          };
          const pref = await paymentsApi.createPreference(prefPayload);
          // Persist address/phone
          try{ await this.model.updateCurrentUser({ name: nameVal, address: addrVal, phone: phoneVal }); }catch(e){}
          // Redirect to MercadoPago checkout
          const redirectUrl = pref.sandboxInitPoint || pref.initPoint;
          if(redirectUrl){
            window.location.href = redirectUrl;
          } else {
            this.view.toast('No se pudo obtener la URL de pago de Mercado Pago','error');
          }
        }catch(err){
          this.view.toast(err.message || 'Error al crear preferencia de pago','error');
        }finally{
          orderSubmitting = false;
          if(submitBtn){ submitBtn.disabled = false; submitBtn.textContent = 'Confirmar Pedido'; }
        }
        return;
      }

      // ── Regular payment flow ──
      try{
        const order = await this.model.createOrder(orderPayload);
        // Persist address/phone to user profile
        try{
          await this.model.updateCurrentUser({ name: nameVal, address: addrVal, phone: phoneVal });
        }catch(e){ /* non-blocking */ }
        this.view.toggleModal('orderModal', false);
        this.view.toast('¡Pedido realizado con éxito!');
        this.model.addInvoice(order);
        this._lastInvoiceOrder = order;
        this.view.renderInvoice(order);
        this.view.toggleModal('invoiceModal', true);
      } catch(err){ this.view.toast(err.message,'error'); }
      finally{
        orderSubmitting = false;
        if(submitBtn){ submitBtn.disabled = false; submitBtn.textContent = 'Confirmar Pedido'; }
      }
    });

    const returnForm = document.getElementById('returnForm');
    returnForm.addEventListener('submit', async (e)=>{
      e.preventDefault();
      try{
        const oid = (document.getElementById('returnOrder').value||'').trim();
        const idOk = /^[a-fA-F0-9]{24}$/.test(oid);
        if(!idOk){ this.view.toast('ID de pedido inválido. Usa el ID (24 caracteres hex).','error'); return; }
        const ret = await this.model.addReturn({
          orderId: oid,
          reason: document.getElementById('returnReason').value,
          details: document.getElementById('returnDetails').value,
        });
        this.view.toggleModal('returnModal', false);
        this.view.toast('Devolución registrada con éxito');
        if(this.currentAdminSection==='returns') this.view.renderAdmin('returns', this.model);
      }catch(err){ this.view.toast(err.message,'error'); }
    });

    // Payment method change
    document.getElementById('paymentMethod').addEventListener('change', async ()=>{
      const method = document.getElementById('paymentMethod').value;
      const details = document.getElementById('paymentDetails');
      const mpInfo = document.getElementById('mpInfo');
      const submitBtn = document.getElementById('orderSubmitBtn');
      if(method==='credit' || method==='debit'){
        details.style.display='block';
        ['cardNumber','cardExpiry','cardCVV'].forEach(id=>document.getElementById(id).required=true);
        if(mpInfo) mpInfo.style.display='none';
        if(submitBtn) submitBtn.style.display='';
      } else {
        details.style.display='none';
        ['cardNumber','cardExpiry','cardCVV'].forEach(id=>document.getElementById(id).required=false);
        if(method==='mercadopago'){
          if(mpInfo) mpInfo.style.display='block';
          if(submitBtn) submitBtn.style.display='';
        } else {
          if(mpInfo) mpInfo.style.display='none';
          if(submitBtn) submitBtn.style.display='';
          this._destroyMPBrick();
        }
      }
      if(method!=='mercadopago') this._destroyMPBrick();
    });

    // Download invoice as PDF (using jsPDF directly)
    document.getElementById('downloadInvoiceBtn').addEventListener('click', ()=>{
      if(!this._lastInvoiceOrder){ this.view.toast('No hay factura para descargar','error'); return; }
      const order = this._lastInvoiceOrder;
      try{
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ unit:'mm', format:'a4' });
        const pw = 210; // page width
        const lm = 15; // left margin
        const rm = pw - 15; // right margin x
        let y = 20;

        // Header
        doc.setFontSize(22); doc.setTextColor(139,115,85);
        doc.text('PURA LINO', lm, y);
        doc.setFontSize(10); doc.setTextColor(136,136,136);
        doc.text('Lino Puro, Comodidad Pura', lm, y+6);

        doc.setFontSize(12); doc.setTextColor(51,51,51);
        doc.text('FACTURA', rm, y, { align:'right' });
        doc.setFontSize(11); doc.setTextColor(139,115,85);
        doc.text(order.invoiceNumber||'—', rm, y+6, { align:'right' });
        doc.setFontSize(9); doc.setTextColor(136,136,136);
        doc.text(new Date(order.date).toLocaleDateString('es-CO',{year:'numeric',month:'long',day:'numeric'}), rm, y+11, { align:'right' });

        y += 18;
        doc.setDrawColor(139,115,85); doc.setLineWidth(0.8); doc.line(lm, y, rm, y);
        y += 10;

        // Client info
        doc.setFontSize(8); doc.setTextColor(100,100,100);
        doc.text('FACTURAR A', lm, y);
        doc.text('ENVIAR A', 110, y);
        y += 5;
        doc.setFontSize(10); doc.setTextColor(0,0,0);
        doc.text(order.userName||'—', lm, y);
        doc.text(order.address||'—', 110, y);
        y += 5;
        doc.setFontSize(9); doc.setTextColor(85,85,85);
        doc.text(order.email||'', lm, y);
        if(order.address2) doc.text(order.address2, 110, y);
        y += 5;
        doc.text(order.phone||'', lm, y);
        const cityDept = [order.shippingCity, order.department].filter(Boolean).join(', ');
        if(cityDept) doc.text(cityDept, 110, y);
        y += 5;
        if(order.cedula){ doc.text('CC: ' + order.cedula, lm, y); }
        if(order.postalCode){ doc.text('C.P. ' + order.postalCode, 110, y); }
        y += 8;

        // Products table header
        const colX = [lm, 120, 150, rm];
        doc.setFillColor(139,115,85); doc.rect(lm, y-4, rm-lm, 8, 'F');
        doc.setFontSize(9); doc.setTextColor(255,255,255);
        doc.text('Producto', lm+2, y);
        doc.text('Cant.', 122, y);
        doc.text('P. Unit.', 150, y);
        doc.text('Subtotal', rm-2, y, { align:'right' });
        y += 7;

        // Products rows
        doc.setTextColor(51,51,51);
        (order.items||[]).forEach((item, idx)=>{
          if(y > 260){ doc.addPage(); y = 20; }
          if(idx%2===0){ doc.setFillColor(250,249,247); doc.rect(lm, y-4, rm-lm, 7, 'F'); }
          const name = item.product?.name || item.productName || '—';
          const varTxt = item.variant ? ` (${item.variant.size||''}/${item.variant.color||''})` : '';
          const price = item.product?.price || item.productPrice || 0;
          doc.setFontSize(9); doc.setTextColor(51,51,51);
          doc.text((name+varTxt).substring(0,55), lm+2, y);
          doc.text(String(item.quantity), 125, y, { align:'center' });
          doc.text(cop(price), 150, y);
          doc.text(cop(price*item.quantity), rm-2, y, { align:'right' });
          y += 7;
        });

        y += 5;
        // Totals - right aligned
        const tx = 145; const tv = rm - 2;
        doc.setFontSize(9); doc.setTextColor(85,85,85);
        doc.text('Subtotal', tx, y); doc.text(cop(order.subtotal||0), tv, y, { align:'right' }); y+=5;
        if(order.discount>0){ doc.setTextColor(231,76,60); doc.text('Descuento', tx, y); doc.text('-'+cop(order.discount), tv, y, { align:'right' }); y+=5; }
        if(order.giftApplied>0){ doc.setTextColor(39,174,96); doc.text('Gift Card', tx, y); doc.text('-'+cop(order.giftApplied), tv, y, { align:'right' }); y+=5; }
        if(order.shippingCost>0){ doc.setTextColor(85,85,85); doc.text('Envío ('+( order.shippingCity||'')+')', tx, y); doc.text(cop(order.shippingCost), tv, y, { align:'right' }); y+=5; }

        doc.setDrawColor(139,115,85); doc.setLineWidth(0.5); doc.line(tx, y, rm, y); y+=6;
        doc.setFontSize(12); doc.setTextColor(0,0,0);
        doc.text('TOTAL', tx, y); doc.text(cop(order.total), tv, y, { align:'right' });
        y += 5;
        doc.setFontSize(8); doc.setTextColor(136,136,136);
        doc.text('Pago: ' + (order.paymentMethod||''), tv, y, { align:'right' });

        // Footer
        y = 280;
        doc.setDrawColor(220,220,220); doc.setLineWidth(0.3); doc.line(lm, y, rm, y);
        y += 5;
        doc.setFontSize(8); doc.setTextColor(170,170,170);
        doc.text('Pura Lino — Bogotá, Colombia — contacto@puralino.com', pw/2, y, { align:'center' });
        doc.text('Gracias por tu compra', pw/2, y+4, { align:'center' });

        doc.save(`factura-${order.invoiceNumber||Date.now()}.pdf`);
      }catch(err){
        console.error('PDF generation error:', err);
        this.view.toast('Error al generar PDF: '+err.message,'error');
      }
    });

    // Modals: link to open register
    document.getElementById('openRegisterLink').addEventListener('click', (e)=>{ e.preventDefault(); this.view.toggleModal('loginModal', false); this.view.toggleModal('registerModal', true); });

    // Apply promo and checkout buttons in cart
    document.getElementById('applyPromoBtn').addEventListener('click', ()=>{
      try{ const code = document.getElementById('promoCode').value; this.model.applyPromo(code); this.openCart(); this.view.toast(`Promoción ${code.toUpperCase()} aplicada`); }
      catch(err){ this.view.toast(err.message, 'error'); }
    });
    // Shipping quote
    const calcShippingBtn = document.getElementById('calcShippingBtn');
    if(calcShippingBtn){ calcShippingBtn.addEventListener('click', async ()=>{
      const city = document.getElementById('orderCity')?.value||'';
      if(!city){ this.view.toast('Selecciona una ciudad','error'); return; }
      try{
        const res = await fetch(`${window.__API_URL__||'https://d2nkt7j19iaq1l.cloudfront.net'}/shipping/quote?city=${encodeURIComponent(city)}`);
        const data = await res.json();
        const q = document.getElementById('shippingQuote');
        if(q) q.textContent = `Envío: ${cop(data.cost)} (ETA ${data.etaDays} días)`;
        this.currentShipping = { city: data.city||city, cost: data.cost };
      }catch(err){ this.view.toast('No se pudo calcular el envío','error'); }
    }); }
    // Populate departments dropdown
    const deptSelect = document.getElementById('orderDepartment');
    const citySelect = document.getElementById('orderCity');
    if(deptSelect){
      Object.keys(DEPARTMENTS).sort().forEach(dept=>{
        const opt = document.createElement('option');
        opt.value = dept; opt.textContent = dept;
        deptSelect.appendChild(opt);
      });
      deptSelect.addEventListener('change', ()=>{
        const dept = deptSelect.value;
        citySelect.innerHTML = '';
        if(!dept){
          citySelect.disabled = true;
          citySelect.innerHTML = '<option value="">Primero selecciona departamento</option>';
          return;
        }
        citySelect.disabled = false;
        citySelect.innerHTML = '<option value="">Selecciona ciudad</option>';
        (DEPARTMENTS[dept]||[]).forEach(city=>{
          const opt = document.createElement('option');
          opt.value = city; opt.textContent = city;
          citySelect.appendChild(opt);
        });
        // Reset shipping quote when department changes
        const q = document.getElementById('shippingQuote');
        if(q) q.textContent = '';
        this.currentShipping = null;
      });
    }
    // Reset shipping when city changes
    if(citySelect){
      citySelect.addEventListener('change', ()=>{
        const q = document.getElementById('shippingQuote');
        if(q) q.textContent = '';
        this.currentShipping = null;
      });
    }

    document.getElementById('checkoutBtn').addEventListener('click', ()=>{
      if(!this.model.state.currentUser){ this.view.toast('Por favor inicia sesión para comprar','error'); this.view.toggleModal('cartModal', false); this.view.toggleModal('loginModal', true); return; }
      if(this.model.state.cart.length===0){ this.view.toast('Tu carrito está vacío','error'); return; }
      if(!this.model.state.currentUser.emailVerified){ this.view.toast('Debes verificar tu cuenta de correo antes de realizar pedidos. Revisa tu bandeja de entrada.','error'); return; }
      // Prefill checkout with CURRENT user data only
      const u = this.model.state.currentUser;
      const setVal = (id, v)=>{ const el=document.getElementById(id); if(el) el.value = v||''; };
      setVal('orderName', u.name);
      setVal('orderEmail', u.email);
      setVal('orderAddress', u.address||'');
      setVal('orderPhone', u.phone);
      // Reset non-user fields
      setVal('orderAddress2', '');
      setVal('orderPostalCode', '');
      setVal('orderCedula', '');
      if(deptSelect) deptSelect.value = '';
      if(citySelect){ citySelect.innerHTML = '<option value="">Primero selecciona departamento</option>'; citySelect.disabled = true; }
      const q = document.getElementById('shippingQuote'); if(q) q.textContent = '';
      this.currentShipping = null;
      // Reset payment method and clear ALL sensitive payment data
      setVal('paymentMethod', '');
      setVal('cardNumber', '');
      setVal('cardExpiry', '');
      setVal('cardCVV', '');
      setVal('giftCardCode', '');
      ['cardNumber','cardExpiry','cardCVV'].forEach(id=>{ const el=document.getElementById(id); if(el) el.required=false; });
      const payDetails = document.getElementById('paymentDetails'); if(payDetails) payDetails.style.display='none';
      const mpInfo = document.getElementById('mpInfo'); if(mpInfo) mpInfo.style.display='none';
      this._destroyMPBrick();
      // Reset T&C checkbox and submit button
      const ot = document.getElementById('orderTerms'); if(ot){ ot.checked = false; }
      const osb = document.getElementById('orderSubmitBtn');
      if(osb){ osb.disabled = true; osb.style.display = ''; osb.textContent = 'Realizar Pedido'; }
      this.view.toggleModal('cartModal', false); this.view.toggleModal('orderModal', true);
    });

  }

  // ── Complete login (shared by normal login and 2FA) ──
  async _completeLogin(user){
    this.view.toast(`¡Bienvenido ${user.name}!`);
    this.view.setUserUI(user);
    this.view.updateCartCount(this.model.cartCount());
    this.model.startSessionTimeout();
    if(user.role==='admin'){
      await Promise.all([
        this.model.refreshProducts(),
        this.model.refreshPromotions(),
        this.model.refreshAllOrders(),
        this.model.refreshUsers(),
        this.model.refreshReturns(),
        this.model.refreshSuppliers(),
        this.model.refreshWarehouses(),
        this.model.refreshPurchaseOrders(),
      ]);
      this.view.showSections({home:false,products:false,customer:false,admin:true});
      this.currentAdminSection='dashboard';
      this.loadAdminSection('dashboard');
    } else {
      await Promise.all([
        this.model.refreshProducts(),
        this.model.refreshPromotions(),
        this.model.refreshMyOrders(),
      ]);
      this.route('home');
      this.renderProducts();
    }
  }

  // ── Chatbot ──
  setupChatbot(){
    const toggle = document.getElementById('chatbotToggle');
    const widget = document.getElementById('chatbotWidget');
    const closeBtn = document.getElementById('chatbotClose');
    const form = document.getElementById('chatbotForm');
    const input = document.getElementById('chatbotInput');
    const messages = document.getElementById('chatbotMessages');
    if(!toggle || !widget) return;

    toggle.onclick = ()=>{
      const open = widget.style.display !== 'none';
      widget.style.display = open ? 'none' : 'flex';
      if(!open) input?.focus();
    };
    if(closeBtn) closeBtn.onclick = ()=>{ widget.style.display = 'none'; };

    if(form) form.onsubmit = async (e)=>{
      e.preventDefault();
      const msg = input.value.trim();
      if(!msg) return;
      // Add user message
      const userDiv = document.createElement('div');
      userDiv.className = 'chatbot-msg user';
      userDiv.textContent = msg;
      messages.appendChild(userDiv);
      input.value = '';
      messages.scrollTop = messages.scrollHeight;
      // Show typing
      const typing = document.createElement('div');
      typing.className = 'chatbot-msg typing';
      typing.textContent = 'Escribiendo...';
      messages.appendChild(typing);
      messages.scrollTop = messages.scrollHeight;
      try{
        const res = await chatbotApi.send(msg);
        typing.remove();
        const botDiv = document.createElement('div');
        botDiv.className = 'chatbot-msg bot';
        botDiv.textContent = res.reply;
        messages.appendChild(botDiv);
      }catch(err){
        typing.remove();
        const errDiv = document.createElement('div');
        errDiv.className = 'chatbot-msg bot';
        errDiv.textContent = 'Lo siento, hubo un error. Intenta de nuevo.';
        messages.appendChild(errDiv);
      }
      messages.scrollTop = messages.scrollHeight;
    };
  }

  // ── Load admin section (with async data fetch for inventory sections) ──
  async loadAdminSection(sect){
    try{
      switch(sect){
        case 'suppliers': await this.model.refreshSuppliers(); break;
        case 'warehouses': await this.model.refreshWarehouses(); break;
        case 'purchaseOrders': await this.model.refreshPurchaseOrders(); break;
        case 'returns': await this.model.refreshReturns(); break;
        case 'orders': await this.model.refreshAllOrders(); break;
        case 'reviews': this.model._pendingReviews = await reviewsApi.pending(); break;
        case 'stockMovements': this.model._stockMovements = await this.model.getStockMovements(); break;
        case 'lowStock': this.model._lowStockAlerts = await this.model.getLowStockAlerts(5); break;
        case 'backlog': this.model._backlogItems = await backlogApi.list(); break;
      }
    }catch(err){ /* data may already be loaded */ }
    this.view.renderAdmin(sect, this.model);
    if(sect === 'dashboard') this._bindBannerAdmin();
    this.bindInventoryEvents();
  }

  bindInventoryEvents(){
    const el = document.getElementById('adminContent');
    if(!el) return;

    // ── SUPPLIERS ──
    const addSupBtn = document.getElementById('addSupplierBtn');
    if(addSupBtn) addSupBtn.onclick = ()=>{ this.model._editingSupplier = null; this.view.renderAdmin('supplierForm', this.model); this.bindInventoryEvents(); };

    el.querySelectorAll('[data-edit-supplier]').forEach(btn=> btn.onclick = async ()=>{
      const id = btn.getAttribute('data-edit-supplier');
      const s = this.model.state.suppliers.find(x=>x._id===id);
      this.model._editingSupplier = s||null;
      this.view.renderAdmin('supplierForm', this.model);
      this.bindInventoryEvents();
    });

    el.querySelectorAll('[data-delete-supplier]').forEach(btn=> btn.onclick = async ()=>{
      if(!confirm('¿Eliminar este proveedor?')) return;
      try{ await this.model.deleteSupplier(btn.getAttribute('data-delete-supplier')); this.view.toast('Proveedor eliminado'); this.loadAdminSection('suppliers'); }
      catch(err){ this.view.toast(err.message,'error'); }
    });

    const supplierForm = document.getElementById('supplierForm');
    if(supplierForm) supplierForm.onsubmit = async (e)=>{
      e.preventDefault();
      const data = {
        name: document.getElementById('supplierName').value.trim(),
        contactPerson: document.getElementById('supplierContact').value.trim(),
        email: document.getElementById('supplierEmail').value.trim(),
        phone: document.getElementById('supplierPhone').value.trim(),
        address: document.getElementById('supplierAddress').value.trim(),
        city: document.getElementById('supplierCity').value.trim(),
        notes: document.getElementById('supplierNotes').value.trim()
      };
      if(!data.name){ this.view.toast('El nombre es obligatorio','error'); return; }
      try{
        const id = document.getElementById('supplierId').value;
        if(id) await this.model.updateSupplier(id, data);
        else await this.model.createSupplier(data);
        this.view.toast(id?'Proveedor actualizado':'Proveedor creado');
        this.loadAdminSection('suppliers');
      }catch(err){ this.view.toast(err.message,'error'); }
    };
    const cancelSupBtn = document.getElementById('cancelSupplierBtn');
    if(cancelSupBtn) cancelSupBtn.onclick = ()=> this.loadAdminSection('suppliers');

    // ── WAREHOUSES ──
    const addWhBtn = document.getElementById('addWarehouseBtn');
    if(addWhBtn) addWhBtn.onclick = ()=>{ this.model._editingWarehouse = null; this.view.renderAdmin('warehouseForm', this.model); this.bindInventoryEvents(); };

    el.querySelectorAll('[data-edit-warehouse]').forEach(btn=> btn.onclick = async ()=>{
      const w = this.model.state.warehouses.find(x=>x._id===btn.getAttribute('data-edit-warehouse'));
      this.model._editingWarehouse = w||null;
      this.view.renderAdmin('warehouseForm', this.model);
      this.bindInventoryEvents();
    });

    el.querySelectorAll('[data-delete-warehouse]').forEach(btn=> btn.onclick = async ()=>{
      if(!confirm('¿Eliminar este almacén?')) return;
      try{ await this.model.deleteWarehouse(btn.getAttribute('data-delete-warehouse')); this.view.toast('Almacén eliminado'); this.loadAdminSection('warehouses'); }
      catch(err){ this.view.toast(err.message,'error'); }
    });

    el.querySelectorAll('[data-add-shelf]').forEach(btn=> btn.onclick = async ()=>{
      const whId = btn.getAttribute('data-add-shelf');
      const code = prompt('Código de estantería (ej: A1, B2):');
      if(!code) return;
      const label = prompt('Descripción (opcional):') || '';
      try{ await this.model.addShelf(whId, { code, label }); this.view.toast('Estantería agregada'); this.loadAdminSection('warehouses'); }
      catch(err){ this.view.toast(err.message,'error'); }
    });

    el.querySelectorAll('[data-remove-shelf]').forEach(btn=> btn.onclick = async ()=>{
      const [whId, shelfId] = btn.getAttribute('data-remove-shelf').split('||');
      if(!confirm('¿Eliminar esta estantería?')) return;
      try{ await this.model.removeShelf(whId, shelfId); this.view.toast('Estantería eliminada'); this.loadAdminSection('warehouses'); }
      catch(err){ this.view.toast(err.message,'error'); }
    });

    const warehouseForm = document.getElementById('warehouseForm');
    if(warehouseForm) warehouseForm.onsubmit = async (e)=>{
      e.preventDefault();
      const data = { name: document.getElementById('warehouseName').value.trim(), location: document.getElementById('warehouseLocation').value.trim() };
      if(!data.name){ this.view.toast('El nombre es obligatorio','error'); return; }
      try{
        const id = document.getElementById('warehouseId').value;
        if(id) await this.model.updateWarehouse(id, data);
        else await this.model.createWarehouse(data);
        this.view.toast(id?'Almacén actualizado':'Almacén creado');
        this.loadAdminSection('warehouses');
      }catch(err){ this.view.toast(err.message,'error'); }
    };
    const cancelWhBtn = document.getElementById('cancelWarehouseBtn');
    if(cancelWhBtn) cancelWhBtn.onclick = ()=> this.loadAdminSection('warehouses');

    // ── PURCHASE ORDERS (ALBARANES) ──
    const addPOBtn = document.getElementById('addPOBtn');
    if(addPOBtn) addPOBtn.onclick = ()=>{ this.model._editingPO = null; this.view.renderAdmin('poForm', this.model); this.bindInventoryEvents(); this.bindPOFormEvents(); };

    // ── REVIEWS ──
    el.querySelectorAll('[data-approve-review]').forEach(btn=> btn.onclick = async ()=>{
      const id = btn.getAttribute('data-approve-review');
      try{
        await reviewsApi.approve(id);
        this.view.toast('Reseña aprobada y publicada');
        this.loadAdminSection('reviews');
      }catch(err){ this.view.toast(err.message||'Error al aprobar','error'); }
    });
    el.querySelectorAll('[data-reject-review]').forEach(btn=> btn.onclick = async ()=>{
      const id = btn.getAttribute('data-reject-review');
      if(!confirm('¿Eliminar esta reseña? Esta acción no se puede deshacer.')) return;
      try{
        await reviewsApi.reject(id);
        this.view.toast('Reseña rechazada y eliminada');
        this.loadAdminSection('reviews');
      }catch(err){ this.view.toast(err.message||'Error al rechazar','error'); }
    });

    el.querySelectorAll('[data-view-po]').forEach(btn=> btn.onclick = async ()=>{
      try{
        const po = await this.model.getPurchaseOrder(btn.getAttribute('data-view-po'));
        this.model._viewingPO = po;
        this.view.renderAdmin('poDetail', this.model);
        this.bindInventoryEvents();
      }catch(err){ this.view.toast(err.message,'error'); }
    });

    el.querySelectorAll('[data-edit-po]').forEach(btn=> btn.onclick = async ()=>{
      try{
        const po = await this.model.getPurchaseOrder(btn.getAttribute('data-edit-po'));
        this.model._editingPO = po;
        this.view.renderAdmin('poForm', this.model);
        this.bindInventoryEvents();
        this.bindPOFormEvents();
      }catch(err){ this.view.toast(err.message,'error'); }
    });

    el.querySelectorAll('[data-send-po]').forEach(btn=> btn.onclick = async ()=>{
      if(!confirm('¿Marcar como enviado al proveedor?')) return;
      try{ await this.model.sendPurchaseOrder(btn.getAttribute('data-send-po')); this.view.toast('Albarán enviado'); this.loadAdminSection('purchaseOrders'); }
      catch(err){ this.view.toast(err.message,'error'); }
    });

    el.querySelectorAll('[data-delete-po]').forEach(btn=> btn.onclick = async ()=>{
      if(!confirm('¿Eliminar este albarán?')) return;
      try{ await this.model.deletePurchaseOrder(btn.getAttribute('data-delete-po')); this.view.toast('Albarán eliminado'); this.loadAdminSection('purchaseOrders'); }
      catch(err){ this.view.toast(err.message,'error'); }
    });

    el.querySelectorAll('[data-print-po]').forEach(btn=> btn.onclick = async ()=>{
      try{
        const po = await this.model.getPurchaseOrder(btn.getAttribute('data-print-po'));
        this.view.printPO(po);
      }catch(err){ this.view.toast(err.message,'error'); }
    });

    el.querySelectorAll('[data-receive-po]').forEach(btn=> btn.onclick = async ()=>{
      try{
        const po = await this.model.getPurchaseOrder(btn.getAttribute('data-receive-po'));
        this.model._receivingPO = po;
        this.view.renderAdmin('poReceive', this.model);
        this.bindInventoryEvents();
        this.bindReceiveFormEvents();
      }catch(err){ this.view.toast(err.message,'error'); }
    });

    const backToPOs = document.getElementById('backToPOs');
    if(backToPOs) backToPOs.onclick = ()=> this.loadAdminSection('purchaseOrders');

    // ── RECEIVE FORM ──
    const cancelRecvBtn = document.getElementById('cancelReceiveBtn');
    if(cancelRecvBtn) cancelRecvBtn.onclick = ()=> this.loadAdminSection('purchaseOrders');

    // ── ORDER DETAIL ──
    el.querySelectorAll('[data-admin-order-detail]').forEach(btn=> btn.onclick = async ()=>{
      const oid = btn.getAttribute('data-admin-order-detail');
      const o = this.model.state.orders.find(x=>String(x._id||x.id)===String(oid));
      if(!o){ this.view.toast('Pedido no encontrado','error'); return; }
      this.model._viewingOrder = o;
      try{
        const res = await fetch(`${window.__API_URL__||'https://d2nkt7j19iaq1l.cloudfront.net'}/orders/${oid}/tracking`, { headers: { Authorization: 'Bearer ' + (this.model.token||'') } });
        const data = await res.json();
        this.model._orderTracking = res.ok ? data : {};
      }catch(e){ this.model._orderTracking = {}; }
      this.view.renderAdmin('orderDetail', this.model);
      this.bindInventoryEvents();
    });

    const backToOrders = document.getElementById('backToOrders');
    if(backToOrders) backToOrders.onclick = ()=> this.loadAdminSection('orders');

    // Save order status
    const saveStatusBtn = document.getElementById('saveOrderStatusBtn');
    if(saveStatusBtn) saveStatusBtn.onclick = async ()=>{
      const oid = saveStatusBtn.dataset.id;
      const status = document.getElementById('orderStatusSelect').value;
      try{
        await this.model.adminUpdateOrderStatus(oid, status);
        this.model._viewingOrder = this.model.state.orders.find(x=>String(x._id||x.id)===String(oid));
        this.view.renderAdmin('orderDetail', this.model);
        this.bindInventoryEvents();
        this.view.toast('Estado actualizado a: ' + status);
      }catch(err){ this.view.toast(err.message,'error'); }
    };

    // Save tracking meta (guide number + carrier)
    const saveTrackBtn = document.getElementById('saveTrackMetaBtn');
    if(saveTrackBtn) saveTrackBtn.onclick = async ()=>{
      const oid = saveTrackBtn.dataset.id;
      const body = { trackingNumber: document.getElementById('trkNumber').value, carrier: document.getElementById('trkCarrier').value };
      try{
        const r = await fetch(`${window.__API_URL__||'https://d2nkt7j19iaq1l.cloudfront.net'}/orders/${oid}/tracking/meta`, { method:'PATCH', headers: { 'Content-Type':'application/json', Authorization: 'Bearer ' + (this.model.token||'') }, body: JSON.stringify(body) });
        const d = await r.json(); if(!r.ok) throw new Error(d?.error||'Error');
        this.model._orderTracking = { ...this.model._orderTracking, trackingNumber: body.trackingNumber, carrier: body.carrier };
        this.view.toast('Datos de tracking guardados');
      }catch(err){ this.view.toast(err.message||'Error al guardar tracking','error'); }
    };

    // Add tracking event
    const addEvBtn = document.getElementById('addTrackEventBtn');
    if(addEvBtn) addEvBtn.onclick = async ()=>{
      const oid = addEvBtn.dataset.id;
      const status = document.getElementById('trkEventStatus').value;
      if(!status){ this.view.toast('Selecciona un estado para el evento','error'); return; }
      const note = document.getElementById('trkEventNote').value;
      try{
        const r = await fetch(`${window.__API_URL__||'https://d2nkt7j19iaq1l.cloudfront.net'}/orders/${oid}/tracking`, { method:'POST', headers: { 'Content-Type':'application/json', Authorization: 'Bearer ' + (this.model.token||'') }, body: JSON.stringify({ status, note }) });
        const d = await r.json(); if(!r.ok) throw new Error(d?.error||'Error');
        this.model._orderTracking = { ...this.model._orderTracking, events: d.events || [] };
        // Re-render
        const wrap = document.getElementById('trackEventsWrap');
        if(wrap){
          wrap.innerHTML = (d.events||[]).map(ev=>`<div style="display:flex;gap:1rem;align-items:flex-start;padding:8px 0;border-bottom:1px solid #eee">
            <div style="min-width:140px;font-size:.85rem;color:#888">${new Date(ev.date).toLocaleString('es-CO')}</div>
            <div><strong>${ev.status}</strong>${ev.note?` — <span class="pl-muted">${ev.note}</span>`:''}</div>
          </div>`).join('');
        }
        document.getElementById('trkEventStatus').value = '';
        document.getElementById('trkEventNote').value = '';
        this.view.toast('Evento agregado');
      }catch(err){ this.view.toast(err.message||'Error al agregar evento','error'); }
    };

    // ── RETURNS ──
    el.querySelectorAll('[data-view-return]').forEach(btn=> btn.onclick = async ()=>{
      const id = btn.getAttribute('data-view-return');
      try{
        const r = await this.model.getReturn(id);
        this.model._viewingReturn = r;
        this.view.renderAdmin('returnDetail', this.model);
        this.bindInventoryEvents();
      }catch(err){ this.view.toast(err.message,'error'); }
    });

    const backToReturns = document.getElementById('backToReturns');
    if(backToReturns) backToReturns.onclick = ()=> this.loadAdminSection('returns');

    // Approve return
    const approveBtn = document.getElementById('approveReturnBtn');
    if(approveBtn) approveBtn.onclick = async ()=>{
      const id = approveBtn.dataset.id;
      await this.model.refreshWarehouses();
      const whs = this.model.state.warehouses;
      if(whs.length===0){ this.view.toast('No hay bodegas registradas. Crea una primero.','error'); return; }
      const whOptions = whs.map((w,i)=>`${i+1}. ${w.name} — ${w.location||'Sin dirección'}`).join('\n');
      const choice = prompt(`Selecciona la bodega de destino:\n${whOptions}\n\nIngresa el número:`);
      if(!choice) return;
      const idx = parseInt(choice)-1;
      if(idx<0||idx>=whs.length){ this.view.toast('Selección inválida','error'); return; }
      const adminNotes = prompt('Notas adicionales para el cliente (opcional):') || '';
      try{
        const r = await this.model.approveReturn(id, { warehouseId: whs[idx]._id, adminNotes });
        this.model._viewingReturn = r;
        this.view.renderAdmin('returnDetail', this.model);
        this.bindInventoryEvents();
        this.view.toast('Devolución aprobada. Se envió email con instrucciones al cliente.');
      }catch(err){ this.view.toast(err.message,'error'); }
    };

    // Reject return
    const rejectBtn = document.getElementById('rejectReturnBtn');
    if(rejectBtn) rejectBtn.onclick = async ()=>{
      const id = rejectBtn.dataset.id;
      const reason = prompt('Motivo del rechazo:');
      if(!reason) return;
      try{
        const r = await this.model.rejectReturn(id, { rejectionReason: reason });
        this.model._viewingReturn = r;
        this.view.renderAdmin('returnDetail', this.model);
        this.bindInventoryEvents();
        this.view.toast('Devolución rechazada. Se notificó al cliente.');
      }catch(err){ this.view.toast(err.message,'error'); }
    };

    // Mark received
    const receivedBtn = document.getElementById('receivedReturnBtn');
    if(receivedBtn) receivedBtn.onclick = async ()=>{
      if(!confirm('¿Confirmar que se recibió la devolución en bodega?')) return;
      const id = receivedBtn.dataset.id;
      try{
        const r = await this.model.markReturnReceived(id);
        this.model._viewingReturn = r;
        this.view.renderAdmin('returnDetail', this.model);
        this.bindInventoryEvents();
        this.view.toast('Devolución marcada como recibida. Se notificó al cliente.');
      }catch(err){ this.view.toast(err.message,'error'); }
    };

    // Review return
    const reviewBtn = document.getElementById('reviewReturnBtn');
    if(reviewBtn) reviewBtn.onclick = async ()=>{
      const id = reviewBtn.dataset.id;
      const result = prompt('Resultado de la revisión:\n1. Apta (producto en buenas condiciones)\n2. No Apta (producto no cumple condiciones)\n\nIngresa 1 o 2:');
      if(!result) return;
      const isApta = result.trim() === '1';
      const reviewNotes = prompt('Observaciones de la revisión (opcional):') || '';
      let reviewRejectionReason = '';
      if(!isApta){
        reviewRejectionReason = prompt('Motivo por el cual no es apta:') || 'Producto no cumple condiciones';
      }
      try{
        const r = await this.model.reviewReturn(id, {
          result: isApta ? 'apta' : 'no_apta',
          reviewNotes,
          reviewRejectionReason,
          reviewPhotos: []
        });
        this.model._viewingReturn = r;
        this.view.renderAdmin('returnDetail', this.model);
        this.bindInventoryEvents();
        if(isApta) this.view.toast(`Devolución aprobada. Cupón ${r.couponCode} generado y enviado al cliente.`);
        else this.view.toast('Devolución marcada como no apta. Se notificó al cliente.');
      }catch(err){ this.view.toast(err.message,'error'); }
    };

    // ── BACKLOG ──
    const addBacklogBtn = document.getElementById('addBacklogBtn');
    if(addBacklogBtn) addBacklogBtn.onclick = ()=>{
      this.model._editingBacklog = null;
      this.view.renderAdmin('backlogForm', this.model);
      this.bindInventoryEvents();
    };

    el.querySelectorAll('[data-edit-backlog]').forEach(btn=> btn.onclick = async ()=>{
      const id = btn.getAttribute('data-edit-backlog');
      try{
        const item = await backlogApi.get(id);
        this.model._editingBacklog = item;
        this.view.renderAdmin('backlogForm', this.model);
        this.bindInventoryEvents();
      }catch(err){ this.view.toast(err.message,'error'); }
    });

    el.querySelectorAll('[data-delete-backlog]').forEach(btn=> btn.onclick = async ()=>{
      if(!confirm('¿Eliminar esta tarea del backlog?')) return;
      try{
        await backlogApi.remove(btn.getAttribute('data-delete-backlog'));
        this.view.toast('Tarea eliminada');
        this.loadAdminSection('backlog');
      }catch(err){ this.view.toast(err.message,'error'); }
    });

    const backlogForm = document.getElementById('backlogForm');
    if(backlogForm) backlogForm.onsubmit = async (e)=>{
      e.preventDefault();
      const data = {
        title: document.getElementById('backlogTitle').value.trim(),
        description: document.getElementById('backlogDescription').value.trim(),
        category: document.getElementById('backlogCategory').value,
        priority: document.getElementById('backlogPriority').value,
        status: document.getElementById('backlogStatus').value,
        assignee: document.getElementById('backlogAssignee').value,
        dueDate: document.getElementById('backlogDueDate').value || null
      };
      if(!data.title){ this.view.toast('El título es obligatorio','error'); return; }
      try{
        const id = document.getElementById('backlogId').value;
        if(id) await backlogApi.update(id, data);
        else await backlogApi.create(data);
        this.view.toast(id?'Tarea actualizada':'Tarea creada');
        this.loadAdminSection('backlog');
      }catch(err){ this.view.toast(err.message,'error'); }
    };

    const cancelBacklogBtn = document.getElementById('cancelBacklogBtn');
    if(cancelBacklogBtn) cancelBacklogBtn.onclick = ()=> this.loadAdminSection('backlog');

    const backToBacklog = document.getElementById('backToBacklog');
    if(backToBacklog) backToBacklog.onclick = ()=> this.loadAdminSection('backlog');

    // Backlog filters
    const filterStatus = document.getElementById('backlogFilterStatus');
    const filterPriority = document.getElementById('backlogFilterPriority');
    const applyBacklogFilter = ()=>{
      const st = filterStatus?.value || '';
      const pr = filterPriority?.value || '';
      const all = this.model._backlogItems || [];
      const filtered = all.filter(i=>{
        if(st && i.status !== st) return false;
        if(pr && i.priority !== pr) return false;
        return true;
      });
      const orig = this.model._backlogItems;
      this.model._backlogItems = filtered;
      this.view.renderAdmin('backlog', this.model);
      this.model._backlogItems = orig;
      this.bindInventoryEvents();
      // Restore filter values
      const fs = document.getElementById('backlogFilterStatus');
      const fp = document.getElementById('backlogFilterPriority');
      if(fs) fs.value = st;
      if(fp) fp.value = pr;
    };
    if(filterStatus) filterStatus.onchange = applyBacklogFilter;
    if(filterPriority) filterPriority.onchange = applyBacklogFilter;
  }

  bindPOFormEvents(){
    const el = document.getElementById('adminContent');
    if(!el) return;

    // Track filtered products for this supplier
    this._poFilteredProducts = [...this.model.state.products];

    // Supplier change → filter products
    const supplierSel = document.getElementById('poSupplier');
    if(supplierSel) supplierSel.onchange = async ()=>{
      const sid = supplierSel.value;
      const infoDiv = document.getElementById('poSupplierInfo');
      const labelSpan = document.getElementById('poSupplierLabel');
      const countSpan = document.getElementById('poProductCount');
      if(sid){
        const sName = supplierSel.options[supplierSel.selectedIndex]?.dataset?.name || '';
        const filtered = this.model.state.products.filter(p=> String(p.supplierId)===sid);
        this._poFilteredProducts = filtered;
        infoDiv.style.display = 'block';
        labelSpan.textContent = sName;
        countSpan.textContent = `(${filtered.length} producto${filtered.length!==1?'s':''} asociado${filtered.length!==1?'s':''})`;
        // Refresh existing product line dropdowns
        document.querySelectorAll('.po-line[data-new="false"] .po-product').forEach(sel=>{
          const prev = sel.value;
          sel.innerHTML = '<option value="">Seleccionar...</option>' + this._poProductOptions();
          sel.value = prev;
        });
      } else {
        this._poFilteredProducts = [...this.model.state.products];
        infoDiv.style.display = 'none';
      }
    };

    // Add existing product line
    const addLineBtn = document.getElementById('addPOLine');
    if(addLineBtn) addLineBtn.onclick = ()=>{
      const container = document.getElementById('poLines');
      const idx = container.querySelectorAll('.po-line').length;
      const div = document.createElement('div');
      div.innerHTML = this._poLineHTML(idx);
      container.appendChild(div.firstElementChild);
    };

    // Add new product line
    const addNewBtn = document.getElementById('addPONewLine');
    if(addNewBtn) addNewBtn.onclick = ()=>{
      const container = document.getElementById('poLines');
      const idx = container.querySelectorAll('.po-line').length;
      const div = document.createElement('div');
      div.innerHTML = this._poNewLineHTML(idx);
      const newLine = div.firstElementChild;
      container.appendChild(newLine);
      this._bindNewLineVariantEvents(newLine);
    };

    // Remove line
    el.addEventListener('click', (e)=>{
      if(e.target.classList.contains('po-remove-line')){
        const line = e.target.closest('.po-line');
        if(line) line.remove();
      }
    });

    // Form submit
    const poForm = document.getElementById('poForm');
    if(poForm) poForm.onsubmit = async (e)=>{
      e.preventDefault();
      try{
      const supplierEl = document.getElementById('poSupplier');
      const supplierId = supplierEl.value;
      const supplierName = supplierEl.options[supplierEl.selectedIndex]?.dataset?.name || '';
      const notes = document.getElementById('poNotes').value.trim();
      const expectedDate = document.getElementById('poExpectedDate').value || null;

      if(!supplierId){ this.view.toast('Selecciona un proveedor','error'); return; }

      const lines = document.querySelectorAll('.po-line');
      const items = [];
      for(const line of lines){
        const isNew = line.dataset.new === 'true';
        if(isNew){
          const name = line.querySelector('.po-new-name')?.value?.trim();
          if(!name){ this.view.toast('El nombre del producto nuevo es obligatorio','error'); return; }
          const category = line.querySelector('.po-new-category')?.value || 'ropa';
          const hiddenQty = line.querySelector(':scope > input.po-qty[type="hidden"]');
          const totalQty = parseInt(hiddenQty?.value) || parseInt(line.querySelector('.po-new-simple-qty .po-qty')?.value) || 1;

          // Collect variants if category is ropa
          const variants = [];
          if(category === 'ropa'){
            const lid = line.dataset.lineid;
            const varRows = line.querySelectorAll(`[data-variant-rows="${lid}"] tr`);
            varRows.forEach(tr=>{
              const size = tr.querySelector('.po-var-size')?.value;
              const color = tr.querySelector('.po-var-color')?.value;
              const qty = parseInt(tr.querySelector('.po-var-qty')?.value) || 0;
              if(size && color && qty > 0) variants.push({ size, color, stock: qty });
            });
          }

          items.push({
            isNewProduct: true,
            productId: null,
            productName: name,
            variantId: null,
            variantLabel: variants.length > 0 ? variants.map(v=>`${v.size}/${v.color}:${v.stock}`).join(', ') : '',
            quantityOrdered: totalQty,
            unitCost: parseFloat(line.querySelector('.po-cost').value) || 0,
            newProductData: {
              price: parseFloat(line.querySelector('.po-new-price')?.value) || 0,
              category,
              description: line.querySelector('.po-new-desc')?.value?.trim() || '',
              variants
            }
          });
        } else {
          const sel = line.querySelector('.po-product');
          const val = sel?.value;
          if(!val) continue;
          const [productId, variantId] = val.split('||');
          const opt = sel.options[sel.selectedIndex];
          items.push({
            isNewProduct: false,
            productId,
            productName: opt.dataset.pname || '',
            variantId: variantId || null,
            variantLabel: opt.dataset.vlabel || '',
            quantityOrdered: parseInt(line.querySelector('.po-qty').value) || 1,
            unitCost: parseFloat(line.querySelector('.po-cost').value) || 0
          });
        }
      }
      if(items.length === 0){ this.view.toast('Agrega al menos un producto','error'); return; }

      const id = document.getElementById('poId').value;
      if(id) await this.model.updatePurchaseOrder(id, { supplierId, supplierName, items, notes, expectedDate });
      else await this.model.createPurchaseOrder({ supplierId, supplierName, items, notes, expectedDate });
      this.view.toast(id?'Albarán actualizado':'Albarán creado');
      this.loadAdminSection('purchaseOrders');
      }catch(err){ console.error('PO submit error:', err); this.view.toast(err.message||'Error al crear albarán','error'); }
    };

    const cancelPOBtn = document.getElementById('cancelPOBtn');
    if(cancelPOBtn) cancelPOBtn.onclick = ()=> this.loadAdminSection('purchaseOrders');

    // Trigger supplier change if editing an existing PO
    if(supplierSel && supplierSel.value) supplierSel.onchange();
  }

  _poProductOptions(){
    return (this._poFilteredProducts||[]).map(p=>{
      const hasV = p.variants && p.variants.length>0;
      if(hasV) return p.variants.map(v=>`<option value="${p._id||p.id}||${v._id}" data-pname="${p.name}" data-vlabel="${v.size}/${v.color}">${p.name} — ${v.size}/${v.color}</option>`).join('');
      return `<option value="${p._id||p.id}||" data-pname="${p.name}" data-vlabel="">${p.name}</option>`;
    }).join('');
  }

  _poLineHTML(index){
    return `
      <div class="po-line" data-line="${index}" data-new="false" style="display:grid;grid-template-columns:2fr 1fr 1fr auto;gap:.5rem;align-items:end;margin-top:.5rem;padding:.75rem;background:#faf9f7;border-radius:8px">
        <label class="pl-label" style="margin:0">Producto<select class="pl-input po-product"><option value="">Seleccionar...</option>${this._poProductOptions()}</select></label>
        <label class="pl-label" style="margin:0">Cantidad<input class="pl-input po-qty" type="number" min="1" value="1"></label>
        <label class="pl-label" style="margin:0">Costo Unit.<input class="pl-input po-cost" type="number" min="0" step="100" value="0"></label>
        <button type="button" class="pl-btn pl-primary po-remove-line" style="height:38px;padding:0 12px">✕</button>
      </div>`;
  }

  _poNewLineHTML(index){
    const id = `poNewLine_${index}_${Date.now()}`;
    return `
      <div class="po-line" data-line="${index}" data-new="true" data-lineid="${id}" style="margin-top:.5rem;padding:.75rem;background:#e8f5e9;border:1px solid #a5d6a7;border-radius:8px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.5rem">
          <span style="font-weight:600;color:#2e7d32">🆕 Producto Nuevo</span>
          <button type="button" class="pl-btn pl-primary po-remove-line" style="padding:2px 10px;font-size:.85rem">✕</button>
        </div>
        <div style="display:grid;grid-template-columns:2fr 1fr 1fr;gap:.5rem;align-items:end">
          <label class="pl-label" style="margin:0">Nombre *<input class="pl-input po-new-name" placeholder="Ej: Camisa Lino Premium"></label>
          <label class="pl-label" style="margin:0">Categoría<select class="pl-input po-new-category" data-toggle-variants="${id}"><option value="ropa">Ropa</option><option value="hogar">Hogar</option></select></label>
          <label class="pl-label" style="margin:0">Precio Venta<input class="pl-input po-new-price" type="number" min="0" step="100" value="0"></label>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:.5rem;margin-top:.5rem;align-items:end">
          <label class="pl-label" style="margin:0">Costo Unitario<input class="pl-input po-cost" type="number" min="0" step="100" value="0"></label>
          <label class="pl-label" style="margin:0">Descripción<input class="pl-input po-new-desc" placeholder="Opcional"></label>
        </div>

        <!-- Sección variantes (visible si categoría = ropa) -->
        <div class="po-new-variants-section" data-variants-for="${id}" style="margin-top:.75rem;padding:.75rem;background:#c8e6c9;border-radius:6px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.5rem">
            <strong style="font-size:.9rem">Variantes (Talla / Color / Cantidad)</strong>
            <button type="button" class="pl-btn pl-ghost po-add-variant-row" data-add-variant="${id}" style="font-size:.8rem;padding:4px 10px">+ Agregar Variante</button>
          </div>
          <table style="width:100%;font-size:.85rem" class="po-variants-table">
            <thead><tr><th>Talla</th><th>Color</th><th>Cantidad</th><th></th></tr></thead>
            <tbody data-variant-rows="${id}">
              <tr>
                <td><select class="pl-input po-var-size" style="padding:5px"><option value="S">S</option><option value="M" selected>M</option><option value="L">L</option><option value="XL">XL</option></select></td>
                <td><select class="pl-input po-var-color" style="padding:5px"><option value="Blanco">Blanco</option><option value="Negro">Negro</option><option value="Beige">Beige</option></select></td>
                <td><input class="pl-input po-var-qty" type="number" min="0" value="1" style="width:70px;padding:5px;text-align:center"></td>
                <td><button type="button" class="pl-btn pl-ghost po-remove-variant-row" style="padding:2px 8px;font-size:.75rem">✕</button></td>
              </tr>
            </tbody>
          </table>
          <div style="margin-top:.5rem;text-align:right;font-weight:600;font-size:.9rem">
            Total: <span class="po-variants-total" data-total-for="${id}">1</span> unidades
          </div>
        </div>

        <!-- Cantidad simple (visible si categoría = hogar) -->
        <div class="po-new-simple-qty" data-simpleqty-for="${id}" style="display:none;margin-top:.5rem">
          <label class="pl-label" style="margin:0">Cantidad *<input class="pl-input po-qty" type="number" min="1" value="1"></label>
        </div>

        <input type="hidden" class="po-qty" value="1">
      </div>`;
  }

  _bindNewLineVariantEvents(lineEl){
    const id = lineEl.dataset.lineid;
    if(!id) return;

    const catSel = lineEl.querySelector(`[data-toggle-variants="${id}"]`);
    const varSection = lineEl.querySelector(`[data-variants-for="${id}"]`);
    const simpleSection = lineEl.querySelector(`[data-simpleqty-for="${id}"]`);
    const hiddenQty = lineEl.querySelector(':scope > input.po-qty[type="hidden"]');

    const toggleSections = ()=>{
      const isRopa = catSel.value === 'ropa';
      varSection.style.display = isRopa ? 'block' : 'none';
      simpleSection.style.display = isRopa ? 'none' : 'block';
      if(!isRopa && hiddenQty){
        const simpleInput = simpleSection.querySelector('.po-qty');
        if(simpleInput) hiddenQty.value = simpleInput.value;
      }
      if(isRopa) this._recalcVariantTotal(lineEl);
    };
    catSel.onchange = toggleSections;
    toggleSections();

    // Simple qty change → sync hidden
    const simpleInput = simpleSection.querySelector('.po-qty');
    if(simpleInput) simpleInput.oninput = ()=>{ if(hiddenQty) hiddenQty.value = simpleInput.value; };

    // Add variant row
    lineEl.querySelector(`[data-add-variant="${id}"]`).onclick = ()=>{
      const tbody = lineEl.querySelector(`[data-variant-rows="${id}"]`);
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><select class="pl-input po-var-size" style="padding:5px"><option value="S">S</option><option value="M">M</option><option value="L">L</option><option value="XL">XL</option></select></td>
        <td><select class="pl-input po-var-color" style="padding:5px"><option value="Blanco">Blanco</option><option value="Negro">Negro</option><option value="Beige">Beige</option></select></td>
        <td><input class="pl-input po-var-qty" type="number" min="0" value="1" style="width:70px;padding:5px;text-align:center"></td>
        <td><button type="button" class="pl-btn pl-ghost po-remove-variant-row" style="padding:2px 8px;font-size:.75rem">✕</button></td>`;
      tbody.appendChild(tr);
      tr.querySelector('.po-remove-variant-row').onclick = ()=>{ tr.remove(); this._recalcVariantTotal(lineEl); };
      tr.querySelector('.po-var-qty').oninput = ()=> this._recalcVariantTotal(lineEl);
      this._recalcVariantTotal(lineEl);
    };

    // Wire existing variant rows
    lineEl.querySelectorAll('.po-remove-variant-row').forEach(btn=>{
      btn.onclick = ()=>{
        const tbody = btn.closest('tbody');
        if(tbody.querySelectorAll('tr').length > 1){ btn.closest('tr').remove(); this._recalcVariantTotal(lineEl); }
      };
    });
    lineEl.querySelectorAll('.po-var-qty').forEach(inp=>{
      inp.oninput = ()=> this._recalcVariantTotal(lineEl);
    });
  }

  _recalcVariantTotal(lineEl){
    const id = lineEl.dataset.lineid;
    const rows = lineEl.querySelectorAll(`[data-variant-rows="${id}"] tr`);
    let total = 0;
    rows.forEach(tr=>{ total += parseInt(tr.querySelector('.po-var-qty')?.value) || 0; });
    const span = lineEl.querySelector(`[data-total-for="${id}"]`);
    if(span) span.textContent = total;
    const hiddenQty = lineEl.querySelector(':scope > input.po-qty[type="hidden"]');
    if(hiddenQty) hiddenQty.value = total;
  }

  bindReceiveFormEvents(){
    // Warehouse change → populate shelves
    document.querySelectorAll('.recv-warehouse').forEach(sel=>{
      sel.onchange = ()=>{
        const opt = sel.options[sel.selectedIndex];
        const shelfSel = sel.closest('tr').querySelector('.recv-shelf');
        shelfSel.innerHTML = '<option value="">—</option>';
        if(opt.dataset.shelves){
          try{
            const shelves = JSON.parse(opt.dataset.shelves);
            shelves.forEach(sh=>{ const o=document.createElement('option'); o.value=sh._id; o.textContent=sh.code+(sh.label?' — '+sh.label:''); shelfSel.appendChild(o); });
          }catch(e){}
        }
      };
    });

    const receiveForm = document.getElementById('receiveForm');
    if(receiveForm) receiveForm.onsubmit = async (e)=>{
      e.preventDefault();
      const rows = receiveForm.querySelectorAll('tbody tr');
      const receivedItems = [];
      rows.forEach(tr=>{
        const qty = parseInt(tr.querySelector('.recv-qty')?.value) || 0;
        if(qty <= 0) return;
        receivedItems.push({
          itemId: tr.dataset.itemId,
          quantityReceived: qty,
          warehouseId: tr.querySelector('.recv-warehouse')?.value || null,
          shelfId: tr.querySelector('.recv-shelf')?.value || null
        });
      });
      if(receivedItems.length===0){ this.view.toast('No hay cantidades para recibir','error'); return; }

      try{
        const result = await this.model.receivePurchaseOrder(this.model._receivingPO._id, receivedItems);
        // Show discrepancies
        if(result.discrepancies && result.discrepancies.length > 0){
          const msgs = result.discrepancies.map(d=>{
            if(d.missing) return `⚠️ ${d.productName}${d.variantLabel?' ('+d.variantLabel+')':''}: faltan ${d.missing} unidades`;
            if(d.excess) return `📦 ${d.productName}${d.variantLabel?' ('+d.variantLabel+')':''}: ${d.excess} unidades de más`;
            return `✅ ${d.productName}: completo`;
          }).join('\n');
          alert('Resultado de la recepción:\n\n' + msgs);
        } else {
          this.view.toast('Mercancía recibida correctamente. Stock actualizado.');
        }
        this.loadAdminSection('purchaseOrders');
      }catch(err){ this.view.toast(err.message,'error'); }
    };
  }

  showEmailVerificationAlert(email){
    // Remove existing alert if any
    const prev = document.getElementById('emailVerifAlert');
    if(prev) prev.remove();
    const overlay = document.createElement('div');
    overlay.id = 'emailVerifAlert';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10000;display:flex;align-items:center;justify-content:center;padding:1rem;';
    overlay.innerHTML = `
      <div style="background:#fff;border-radius:14px;max-width:440px;width:100%;text-align:center;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,.2);">
        <div style="background:#8b7355;padding:20px;color:#fff;font-size:18px;letter-spacing:2px;font-weight:700;">PURA LINO</div>
        <div style="padding:32px 24px;">
          <div style="font-size:3.5rem;margin-bottom:12px;">📧</div>
          <h2 style="color:#333;margin:0 0 12px;">¡Registro Exitoso!</h2>
          <p style="color:#555;line-height:1.6;margin:8px 0;">Hemos enviado un correo de verificación a:</p>
          <p style="color:#8b7355;font-weight:700;font-size:1.1rem;margin:8px 0;">${email}</p>
          <p style="color:#555;line-height:1.6;margin:12px 0 0;">Revisa tu bandeja de entrada (y la carpeta de spam) y haz clic en el enlace para activar tu cuenta.</p>
          <button id="emailVerifAlertClose" style="margin-top:24px;padding:12px 36px;background:#8b7355;color:#fff;border:none;border-radius:8px;font-size:1rem;font-weight:600;cursor:pointer;">Entendido</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    document.getElementById('emailVerifAlertClose').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if(e.target === overlay) overlay.remove(); });
  }

  bindHeaderActions(){
    const cartBtn = document.getElementById('cartBtn');
    if(cartBtn){ 
      cartBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.openCart();
      }); 
    }

    const loginBtn = document.getElementById('loginBtn');
    if(loginBtn){ 
      loginBtn.addEventListener('click', ()=> this.view.toggleModal('loginModal', true)); 
    }

    const registerBtn = document.getElementById('registerBtn');
    if(registerBtn){ 
      registerBtn.addEventListener('click', ()=> this.view.toggleModal('registerModal', true)); 
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if(logoutBtn){ 
      logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        // Clear sensitive form data before logout
        ['orderName','orderEmail','orderAddress','orderAddress2','orderPhone',
         'orderPostalCode','orderCedula','cardNumber','cardExpiry','cardCVV',
         'giftCardCode'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
        const pm = document.getElementById('paymentMethod'); if(pm) pm.value='';
        const pd = document.getElementById('paymentDetails'); if(pd) pd.style.display='none';
        const mi = document.getElementById('mpInfo'); if(mi) mi.style.display='none';
        this._destroyMPBrick();
        this.view.toggleModal('orderModal', false);
        this.model.logout(); 
        this.view.setUserUI(null); 
        this.bindHeaderActions(); 
        this.view.updateCartCount(this.model.cartCount()); 
        this.route('home'); 
        this.renderProducts(); 
        this.view.toast('Sesión cerrada'); 
      }); 
    }

    const myAccountBtn = document.getElementById('myAccountBtn');
    if(myAccountBtn){ 
      myAccountBtn.onclick = (e) => {
        e.preventDefault();
        this.view.showSections({home:false,products:false,customer:true,admin:false}); 
        this.view.renderCustomerHome(this.model.state.currentUser); 
      };
    }

    const customerBtn = document.getElementById('customerBtn');
    if(customerBtn){ 
      customerBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.view.showSections({home:false,products:false,customer:true,admin:false}); 
        this.view.renderCustomerHome(this.model.state.currentUser); 
      }); 
    }
    
    const purchaseHistoryBtn = document.getElementById('purchaseHistoryBtn');
    if(purchaseHistoryBtn){ 
      purchaseHistoryBtn.onclick = async ()=>{ 
        try{ await this.model.refreshMyOrders(); }catch(e){}
        const orders = this.model.state.orders;
        this.view.renderPurchaseHistory(orders); 
      }; 
    }

    // Admin panel quick access button
    const adminPanelBtn = document.getElementById('adminPanelBtn');
    if(adminPanelBtn){ 
      adminPanelBtn.addEventListener('click', ()=>{ 
        this.route('admin'); 
      }); 
    }
  }

  normalizeCategory(val){
    const v = String(val||'').trim().toLowerCase();
    if(v==='ropa' || v==='1') return 'ropa';
    if(v==='hogar' || v==='2') return 'hogar';
    return null;
  }

  renderProducts(){
    const allProducts = this.model.listProducts();
    const recs = this.model.getRecommendations();
    const total = allProducts.length;
    const totalPages = Math.max(1, Math.ceil(total / this.PRODUCTS_PER_PAGE));
    if(this.currentPage > totalPages) this.currentPage = totalPages;
    const start = (this.currentPage - 1) * this.PRODUCTS_PER_PAGE;
    const pageProducts = allProducts.slice(start, start + this.PRODUCTS_PER_PAGE);
    this.view.renderProducts(pageProducts, recs, { current: this.currentPage, total: totalPages, totalProducts: total });
    this._bindGalleryEvents();
  }

  _bindGalleryEvents(){
    // Gallery arrows (prev/next within product card)
    document.querySelectorAll('.pl-gallery-arrow').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const gallery = btn.closest('.pl-gallery');
        if(!gallery) return;
        const slides = gallery.querySelectorAll('.pl-gallery-slide');
        const dots = gallery.querySelectorAll('.pl-gallery-dot');
        const dir = parseInt(btn.dataset.dir);
        const current = gallery.querySelector('.pl-gallery-slide.active');
        const idx = current ? parseInt(current.dataset.slide) : 0;
        const next = (idx + dir + slides.length) % slides.length;
        slides.forEach(s => s.classList.remove('active'));
        dots.forEach(d => d.classList.remove('active'));
        slides[next].classList.add('active');
        if(dots[next]) dots[next].classList.add('active');
      });
    });

    // Gallery dots
    document.querySelectorAll('.pl-gallery-dot').forEach(dot => {
      dot.addEventListener('click', (e) => {
        e.stopPropagation();
        const gallery = dot.closest('.pl-gallery');
        if(!gallery) return;
        const idx = parseInt(dot.dataset.dot);
        gallery.querySelectorAll('.pl-gallery-slide').forEach(s => s.classList.remove('active'));
        gallery.querySelectorAll('.pl-gallery-dot').forEach(d => d.classList.remove('active'));
        const target = gallery.querySelector(`[data-slide="${idx}"]`);
        if(target) target.classList.add('active');
        dot.classList.add('active');
      });
    });

    // Lightbox — click on gallery image to open
    document.querySelectorAll('.pl-gallery').forEach(gallery => {
      gallery.addEventListener('click', (e) => {
        if(e.target.closest('.pl-gallery-arrow') || e.target.closest('.pl-gallery-dot')) return;
        const raw = gallery.dataset.lightboxImages;
        if(!raw) return;
        const images = JSON.parse(raw);
        const activeSlide = gallery.querySelector('.pl-gallery-slide.active');
        const startIdx = activeSlide ? parseInt(activeSlide.dataset.slide) : 0;
        this._openLightbox(images, startIdx);
      });
    });
  }

  _openLightbox(images, startIdx = 0){
    this._lbImages = images;
    this._lbIndex = startIdx;
    const lb = document.getElementById('plLightbox');
    const img = document.getElementById('plLightboxImg');
    const counter = document.getElementById('plLightboxCounter');
    const prevBtn = document.getElementById('plLightboxPrev');
    const nextBtn = document.getElementById('plLightboxNext');

    img.src = images[startIdx];
    counter.textContent = images.length > 1 ? `${startIdx + 1} / ${images.length}` : '';
    prevBtn.style.display = images.length > 1 ? '' : 'none';
    nextBtn.style.display = images.length > 1 ? '' : 'none';
    lb.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Clean up old listeners
    if(this._lbCleanup) this._lbCleanup();
    const ac = new AbortController();
    const sig = { signal: ac.signal };

    const navigate = (dir) => {
      this._lbIndex = (this._lbIndex + dir + this._lbImages.length) % this._lbImages.length;
      img.src = this._lbImages[this._lbIndex];
      counter.textContent = `${this._lbIndex + 1} / ${this._lbImages.length}`;
    };

    prevBtn.addEventListener('click', () => navigate(-1), sig);
    nextBtn.addEventListener('click', () => navigate(1), sig);
    document.getElementById('plLightboxClose').addEventListener('click', () => this._closeLightbox(), sig);
    lb.addEventListener('click', (e) => { if(e.target === lb) this._closeLightbox(); }, sig);
    document.addEventListener('keydown', (e) => {
      if(!lb.classList.contains('active')) return;
      if(e.key === 'Escape') this._closeLightbox();
      if(e.key === 'ArrowLeft') navigate(-1);
      if(e.key === 'ArrowRight') navigate(1);
    }, sig);

    this._lbCleanup = () => ac.abort();
  }

  _closeLightbox(){
    const lb = document.getElementById('plLightbox');
    lb.classList.remove('active');
    document.body.style.overflow = '';
    if(this._lbCleanup){ this._lbCleanup(); this._lbCleanup = null; }
  }

  goToPage(page){
    this.currentPage = page;
    this.renderProducts();
    // Scroll to products section
    const el = document.getElementById('productsSection');
    if(el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  openCart(){
    this.view.renderCart(this.model.state.cart, this.model.state.currentPromo);
    this.view.toggleModal('cartModal', true);
  }
  
  // ── Product Modal ──────────────────────────────────────
  openProductModal(product = null){
    this._pendingImages = [];          // new File objects to upload
    this._existingImages = [];         // already-saved {url, public_id}
    const isEdit = !!product;

    document.getElementById('productModalTitle').textContent = isEdit ? 'Editar Producto' : 'Nuevo Producto';
    document.getElementById('productFormId').value = isEdit ? (product._id || product.id) : '';
    document.getElementById('productFormName').value = isEdit ? product.name : '';
    document.getElementById('productFormCategory').value = isEdit ? product.category : '';
    document.getElementById('productFormPrice').value = isEdit ? product.price : '';
    document.getElementById('productFormStock').value = isEdit ? product.stock : '';
    document.getElementById('productFormDesc').value = isEdit ? (product.description || '') : '';

    // Populate supplier dropdown
    const supplierSel = document.getElementById('productFormSupplier');
    supplierSel.innerHTML = '<option value="">Sin proveedor</option>' +
      (this.model.state.suppliers||[]).map(s=>`<option value="${s._id}" data-name="${s.name}" ${isEdit && product.supplierId===s._id?'selected':''}>${s.name}</option>`).join('');
    if(isEdit && product.supplierId) supplierSel.value = product.supplierId;

    // Existing images
    const preview = document.getElementById('productFormImagesPreview');
    preview.innerHTML = '';
    if(isEdit && Array.isArray(product.images)){
      this._existingImages = [...product.images];
      this._existingImages.forEach(img => this._renderExistingThumb(preview, img));
    }

    // Variants
    const tbody = document.getElementById('productFormVariants');
    tbody.innerHTML = '';
    if(isEdit && Array.isArray(product.variants)){
      product.variants.forEach(v => this._addVariantRow(tbody, v));
    }

    // Wire up events (use abort controller to avoid duplicates)
    if(this._productFormAC) this._productFormAC.abort();
    this._productFormAC = new AbortController();
    const sig = { signal: this._productFormAC.signal };

    // File input
    const fileInput = document.getElementById('productFormImages');
    fileInput.value = '';
    fileInput.addEventListener('change', ()=> this._handleFileSelect(fileInput.files), sig);

    // Upload area click
    const uploadArea = document.getElementById('productFormUploadArea');
    uploadArea.addEventListener('click', ()=> fileInput.click(), sig);

    // Drag & drop
    uploadArea.addEventListener('dragover', (ev)=>{ ev.preventDefault(); uploadArea.classList.add('drag-over'); }, sig);
    uploadArea.addEventListener('dragleave', ()=> uploadArea.classList.remove('drag-over'), sig);
    uploadArea.addEventListener('drop', (ev)=>{ ev.preventDefault(); uploadArea.classList.remove('drag-over'); this._handleFileSelect(ev.dataTransfer.files); }, sig);

    // Add variant button
    document.getElementById('productFormAddVariant').addEventListener('click', ()=> this._addVariantRow(document.getElementById('productFormVariants')), sig);

    // Cancel
    document.getElementById('productFormCancel').addEventListener('click', ()=> this.view.toggleModal('productModal', false), sig);

    // Submit
    document.getElementById('productForm').addEventListener('submit', (ev)=>{ ev.preventDefault(); this._submitProductForm(); }, sig);

    this._updateUploadAreaVisibility();
    this.view.toggleModal('productModal', true);
  }

  _handleFileSelect(fileList){
    const preview = document.getElementById('productFormImagesPreview');
    const MAX_IMAGES = 3;
    for(const file of fileList){
      if((this._existingImages.length + this._pendingImages.length) >= MAX_IMAGES){
        this.view.toast(`Máximo ${MAX_IMAGES} imágenes por producto`,'error'); break;
      }
      if(!file.type.startsWith('image/')) continue;
      if(file.size > 5 * 1024 * 1024){ this.view.toast('Imagen demasiado grande (máx 5MB)','error'); continue; }
      this._pendingImages.push(file);
      const url = URL.createObjectURL(file);
      const div = document.createElement('div');
      div.className = 'pl-img-thumb';
      div.innerHTML = `<img src="${url}"><button type="button" class="pl-img-remove">×</button>`;
      div.querySelector('.pl-img-remove').addEventListener('click', ()=>{
        this._pendingImages = this._pendingImages.filter(f => f !== file);
        div.remove();
        this._updateUploadAreaVisibility();
      });
      preview.appendChild(div);
    }
    this._updateUploadAreaVisibility();
  }

  _updateUploadAreaVisibility(){
    const total = (this._existingImages||[]).length + (this._pendingImages||[]).length;
    const area = document.getElementById('productFormUploadArea');
    if(area) area.style.display = total >= 3 ? 'none' : '';
  }

  _renderExistingThumb(container, img){
    const div = document.createElement('div');
    div.className = 'pl-img-thumb';
    div.innerHTML = `<img src="${img.url}"><button type="button" class="pl-img-remove">×</button>`;
    div.querySelector('.pl-img-remove').addEventListener('click', ()=>{
      this._existingImages = this._existingImages.filter(i => i.public_id !== img.public_id);
      div.remove();
      this._updateUploadAreaVisibility();
    });
    container.appendChild(div);
  }

  _addVariantRow(tbody, v = {}){
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><select class="pl-input" data-pf-size>
        <option value="">--</option>
        <option value="S" ${v.size==='S'?'selected':''}>S</option>
        <option value="M" ${v.size==='M'?'selected':''}>M</option>
        <option value="L" ${v.size==='L'?'selected':''}>L</option>
        <option value="XL" ${v.size==='XL'?'selected':''}>XL</option>
      </select></td>
      <td><select class="pl-input" data-pf-color>
        <option value="">--</option>
        <option value="Blanco" ${v.color==='Blanco'?'selected':''}>Blanco</option>
        <option value="Negro" ${v.color==='Negro'?'selected':''}>Negro</option>
        <option value="Beige" ${v.color==='Beige'?'selected':''}>Beige</option>
      </select></td>
      <td><input class="pl-input" type="number" data-pf-stock value="${v.stock??0}" min="0" style="width:70px"></td>
      <td><input class="pl-input" data-pf-sku value="${v.sku||''}" style="width:90px"></td>
      <td><input class="pl-input" type="number" step="0.01" data-pf-price value="${v.priceOverride??''}" style="width:90px"></td>
      <td><button type="button" class="pl-btn pl-ghost" style="padding:.3rem .6rem;font-size:.8rem" data-pf-remove-var>✕</button></td>`;
    tr.querySelector('[data-pf-remove-var]').addEventListener('click', ()=> tr.remove());
    tbody.appendChild(tr);
  }

  async _submitProductForm(){
    const submitBtn = document.getElementById('productFormSubmit');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Guardando...';

    try {
      const id = document.getElementById('productFormId').value;
      const name = document.getElementById('productFormName').value.trim();
      const category = document.getElementById('productFormCategory').value;
      const price = parseFloat(document.getElementById('productFormPrice').value);
      const stock = parseInt(document.getElementById('productFormStock').value);
      const description = document.getElementById('productFormDesc').value.trim();

      if(!name || !category || isNaN(price)){ this.view.toast('Completa los campos obligatorios','error'); return; }

      // Collect variants
      const rows = document.getElementById('productFormVariants').querySelectorAll('tr');
      const variants = Array.from(rows).map(tr => {
        const size = tr.querySelector('[data-pf-size]').value;
        const color = tr.querySelector('[data-pf-color]').value;
        const stk = parseInt(tr.querySelector('[data-pf-stock]').value || '0');
        const sku = tr.querySelector('[data-pf-sku]').value.trim();
        const priceStr = tr.querySelector('[data-pf-price]').value;
        const priceOverride = priceStr !== '' ? Number(priceStr) : undefined;
        return { size, color, stock: isNaN(stk)?0:stk, ...(sku?{sku}:{}), ...(priceOverride!==undefined?{priceOverride}:{}) };
      }).filter(v => v.size || v.color);

      const supplierEl = document.getElementById('productFormSupplier');
      const supplierId = supplierEl.value || null;
      const supplierName = supplierId ? (supplierEl.options[supplierEl.selectedIndex]?.dataset?.name || '') : '';

      const payload = { name, category, price, stock: isNaN(stock)?0:stock, description, variants, supplierId, supplierName };

      // Handle removed existing images
      const isEdit = !!id;
      if(isEdit){
        const product = this.model.state.products.find(x => String(x._id||x.id) === String(id));
        if(product && Array.isArray(product.images)){
          const removedImages = product.images.filter(img =>
            !this._existingImages.some(e => e.public_id === img.public_id)
          );
          for(const img of removedImages){
            try { await this.model.deleteProductImage(id, img.public_id); } catch(_){}
          }
        }
        // Update existing images array on the product
        payload.images = this._existingImages;
        await this.model.updateProduct(id, payload);
      } else {
        await this.model.addProduct(payload);
      }

      // Upload new images if any
      const savedProduct = this.model.state.products.find(x => x.name === name) ||
                           (isEdit ? this.model.state.products.find(x => String(x._id||x.id)===String(id)) : null);
      if(this._pendingImages.length > 0 && savedProduct){
        submitBtn.textContent = 'Subiendo imágenes...';
        try {
          await this.model.uploadProductImages(savedProduct._id || savedProduct.id, this._pendingImages);
        } catch(err){
          this.view.toast('Producto guardado pero error al subir imágenes: ' + err.message, 'error');
        }
      }

      this.view.toggleModal('productModal', false);
      this.view.toast(isEdit ? 'Producto actualizado' : 'Producto creado con éxito');
      await this.model.refreshProducts();
      this.view.renderAdmin('products', this.model);
    } catch(err){
      this.view.toast(err.message || 'Error al guardar producto', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Guardar Producto';
    }
  }

  _renderWishlistSection(){
    const ids = new Set((this.model.state.wishlist||[]).map(String));
    const prods = this.model.state.products.filter(p=>ids.has(String(p._id||p.id)));
    const html = `
      <div data-wishlist-section>
        <h3 style="margin-bottom:1rem;">Mis Favoritos (${prods.length})</h3>
        ${prods.length===0? '<p style="color:var(--muted);">No tienes productos en favoritos.</p>':
          `<div class="pl-grid">${prods.map(p=>{
            const img = (p.images && p.images.length > 0)
              ? `<div class="pl-img"><img src="${p.images[0].url}" alt="${p.name}" style="width:100%;height:100%;object-fit:cover"></div>`
              : `<div class="pl-img">👕</div>`;
            return `<div class="pl-card">
              ${img}
              <div class="pl-card-body">
                <h4 class="pl-name">${p.name}</h4>
                <p style="color:var(--muted);font-size:.85rem;">${(p.description||'').substring(0,60)}${(p.description||'').length>60?'...':''}</p>
                <div class="pl-price">${cop(p.price)}</div>
                <div style="display:flex;gap:.5rem;margin-top:.75rem;flex-wrap:wrap;">
                  <button class="pl-btn pl-primary" data-add="${p._id||p.id}" style="flex:1;min-width:120px;">Agregar al Carrito</button>
                  <button class="pl-btn pl-ghost" data-wishlist="${p._id||p.id}" style="min-width:90px;">✕ Quitar</button>
                </div>
              </div>
            </div>`;
          }).join('')}</div>`}
      </div>`;
    this.view.refs.customerContent.innerHTML = html;
  }

  route(r){
    // highlight nav links
    document.querySelectorAll('.pl-nav a').forEach(a=>a.classList.remove('active'));
    const navLink = document.querySelector(`.pl-nav a[data-route="${r}"]`);
    if(navLink) navLink.classList.add('active');
    // show sections by route
    if(r==='home'){
      this.view.showSections({ home:true, products:true, customer:false, admin:false, about:false, contact:false });
    } else if(r==='products'){
      this.view.showSections({ home:false, products:true, customer:false, admin:false, about:false, contact:false });
    } else if(r==='about'){
      this.view.showSections({ home:false, products:false, customer:false, admin:false, about:true, contact:false });
    } else if(r==='contact'){
      this.view.showSections({ home:false, products:false, customer:false, admin:false, about:false, contact:true });
    } else if(r==='customer'){
      if(!this.model.state.currentUser){ this.view.toast('Inicia sesión para ver tu cuenta','error'); this.view.toggleModal('loginModal', true); return; }
      this.view.showSections({ home:false, products:false, customer:true, admin:false, about:false, contact:false });
      this.view.renderCustomerHome(this.model.state.currentUser);
    } else if(r==='admin'){
      if(this.model.state.currentUser?.role!=='admin'){ this.view.toast('Acceso no autorizado','error'); return; }
      this.view.showSections({ home:false, products:false, customer:false, admin:true, about:false, contact:false });
      this.currentAdminSection='dashboard';
      this.loadAdminSection('dashboard');
    } else {
      this.view.showSections({ home:true, products:true, customer:false, admin:false, about:false, contact:false });
    }
  }
}

