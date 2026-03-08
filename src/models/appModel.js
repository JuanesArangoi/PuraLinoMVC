import { bus } from '../core/observer.js';
import { DiscountStrategies } from '../strategies/discount.js';
import { api, me as apiMe, wishlistApi, suppliersApi, warehousesApi, purchaseOrdersApi, inventoryApi } from '../api/client.js';

export class AppModel {
  constructor(){
    this.state = {
      users: [],
      products: [],
      orders: [],
      cart: [],
      currentUser: null,
      promotions: [],
      returns: [],
      invoices: [],
      currentPromo: null,
      wishlist: [],
      suppliers: [],
      warehouses: [],
      purchaseOrders: []
    };
    const savedToken = api.getToken();
    this.token = savedToken || null;
    this.sessionTimeout = null;
    this.warningTimeout = null;
    this.CART_EXPIRY_HOURS = 2; // Cart expires after 2 hours
    this.SESSION_TIMEOUT_MINUTES = 30; // Session expires after 30 minutes of inactivity (ISO 25010)
    this.view = null; // Will be set by controller
  }

  setView(view) {
    this.view = view;
  }

  async init(){
    // if token exists, validate it server-side and restore session
    const rawToken = localStorage.getItem('pl_token');
    console.log('🔑 Init — token in localStorage:', !!rawToken, rawToken ? `(${rawToken.substring(0,20)}...)` : '');
    console.log('🔑 Init — this.token:', !!this.token);
    if(this.token){
      try{ 
        console.log('🔑 Calling /auth/me...');
        const u = await apiMe(); 
        this.state.currentUser = { ...u, id: u._id };
        console.log('✅ Session restored for:', u.username || u.name);
        // Cache user data for offline/cold-start recovery
        try{ localStorage.setItem('pl_user', JSON.stringify(this.state.currentUser)); }catch(_){}
        this.startSessionTimeout();
      }catch(e){ 
        console.warn('❌ Session restore failed:', e.message, 'status:', e.status);
        // Only clear token on auth errors (401/403 = invalid/expired token)
        // Keep session alive on network errors (0 = offline, cold start, timeout)
        if(e.status === 401 || e.status === 403){
          console.warn('🔑 Clearing token due to 401/403');
          api.setToken(null);
          this.token = null;
          this.state.currentUser = null;
          this.clearSessionTimeout();
          try{ localStorage.removeItem('pl_user'); }catch(_){}
        } else {
          // Network error — restore cached user info to keep UI logged in
          console.warn('🔄 Network error during session restore — using cached user');
          try{
            const cached = localStorage.getItem('pl_user');
            if(cached) this.state.currentUser = JSON.parse(cached);
          }catch(_){}
          if(this.state.currentUser) this.startSessionTimeout();
        }
      }
    } else {
      console.log('🔑 No token found — checking localStorage directly:', !!rawToken);
    }
    await Promise.all([
      this.refreshProducts(),
      this.refreshPromotions(),
      (this.token? this.refreshWishlist(): Promise.resolve())
    ]);
    // load cart from localStorage with expiration check
    try{
      const raw = localStorage.getItem('pl_cart');
      if(raw){
        const saved = JSON.parse(raw);
        // Check if cart has expired
        if(saved.timestamp && this.isCartExpired(saved.timestamp)) {
            localStorage.removeItem('pl_cart');
        } else if(Array.isArray(saved.items)){
          this.state.cart = saved.items.map(it=>{
            const p = this.state.products.find(x=>String(x._id||x.id)===String(it.productId));
            return p? { productId: String(it.productId), variantId: it.variantId? String(it.variantId): undefined, quantity: it.quantity||1, product: p, variant: it.variant||undefined }: null;
          }).filter(Boolean);
        }
      }
    }catch(e){ /* ignore */ }
    this.notify();
  }

  notify(){ bus.emit('state:change', this.state); }

  // Session timeout methods
  startSessionTimeout() {
    this.clearSessionTimeout();
    
    // Show warning 10 seconds before expiry
    this.warningTimeout = setTimeout(() => {
      if (this.state.currentUser && this.view) {
        this.view.showSessionWarning();
      }
    }, (this.SESSION_TIMEOUT_MINUTES * 60 * 1000) - 10000);

    this.sessionTimeout = setTimeout(() => {
      if (this.view) {
        this.view.showSessionExpired();
      }
      this.logout();
      // Force redirect to home page
      setTimeout(() => {
        window.location.href = window.location.origin + window.location.pathname;
      }, 2000); // Wait 2 seconds to show the message
    }, this.SESSION_TIMEOUT_MINUTES * 60 * 1000);
  }

  clearSessionTimeout() {
    if (this.sessionTimeout) {
      clearTimeout(this.sessionTimeout);
      this.sessionTimeout = null;
    }
    if (this.warningTimeout) {
      clearTimeout(this.warningTimeout);
      this.warningTimeout = null;
    }
  }

  resetSessionTimeout() {
    if (this.state.currentUser) {
        this.startSessionTimeout();
    }
  }

  // Cart expiration methods
  isCartExpired(timestamp) {
    const now = new Date().getTime();
    const cartTime = new Date(timestamp).getTime();
    const expiryTime = this.CART_EXPIRY_HOURS * 60 * 60 * 1000;
    return (now - cartTime) > expiryTime;
  }

  updateCartTimestamp() {
    const cartData = {
      items: this.state.cart,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem('pl_cart', JSON.stringify(cartData));
  }

  // Auth
  async login(username, password){
    const res = await api.login({ username, password });
    api.setToken(res.token);
    this.token = res.token;
    const user = { ...res.user, id: res.user._id };
    this.state.currentUser = user;
    try{ localStorage.setItem('pl_user', JSON.stringify(user)); }catch(_){}
    this.notify();
    return user;
  }
  logout(){
    api.setToken(null);
    this.token=null;
    this.state.currentUser = null;
    this.clearSessionTimeout();
    // Clear all session data (ISO 25010 security)
    localStorage.removeItem('pl_cart');
    localStorage.removeItem('pl_user');
    sessionStorage.removeItem('pl_admin_section');
    this.state.cart = [];
    this.state.currentPromo=null;
    this.notify();
  }
  async register({name,email,username,password}){
    const created = await api.register({ name,email,username,password });
    return created;
  }

  // Products
  listProducts(){ return [...this.state.products]; }
  async refreshProducts(query){
    const items = await api.getProducts(query||{});
    // mirror _id into id for UI compatibility
    this.state.products = items.map(p=>({ ...p, id: p._id }));
  }
  async addProduct(p){
    const created = await api.createProduct(p);
    this.state.products.unshift({ ...created, id: created._id });
    this.notify();
  }
  async updateProduct(id, data){
    const updated = await api.updateProduct(id, data);
    const idx = this.state.products.findIndex(x=>x._id===id || x.id===id);
    if(idx>=0){ this.state.products[idx] = { ...updated, id: updated._id }; this.notify(); }
  }
  async deleteProduct(id){
    await api.deleteProduct(id);
    this.state.products = this.state.products.filter(p=>p._id!==id && p.id!==id);
    this.notify();
  }
  async uploadProductImages(productId, files){
    const result = await api.uploadProductImages(productId, files);
    const idx = this.state.products.findIndex(x=>x._id===productId || x.id===productId);
    if(idx>=0 && result.images){ this.state.products[idx].images = result.images; this.notify(); }
    return result;
  }
  async deleteProductImage(productId, publicId){
    const result = await api.deleteProductImage(productId, publicId);
    const idx = this.state.products.findIndex(x=>x._id===productId || x.id===productId);
    if(idx>=0 && result.images){ this.state.products[idx].images = result.images; this.notify(); }
    return result;
  }

  // Recommendations (based on previous orders categories)
  getRecommendations(){
    const user = this.state.currentUser; if(!user || user.role!=='client') return [];
    const userOrders = this.state.orders.filter(o=>String(o.userId)===String(user.id||user._id));
    if(userOrders.length===0) return [];
    const purchasedCategories = new Set();
    const purchasedIds = new Set();
    userOrders.forEach(o=>o.items.forEach(it=>{ const cat = it.product?.category || it.category; purchasedCategories.add(cat); purchasedIds.add(String(it.productId)); }));
    return this.state.products.filter(p=>!purchasedIds.has(String(p._id)) && purchasedCategories.has(p.category)).slice(0,3);
  }

  // Cart
  saveCart(){
    this.updateCartTimestamp();
  }
  addToCart(productId, opts={}){
    const product = this.state.products.find(p=>String(p._id)===String(productId) || String(p.id)===String(productId));
    if(!product) throw new Error('Producto no encontrado');
    let variantId, variant;
    const hasVariants = Array.isArray(product.variants) && product.variants.length>0;
    if(hasVariants){
      const size = (opts.size||'').trim();
      const color = (opts.color||'').trim();
      variant = product.variants.find(v=>v.size===size && v.color===color);
      if(!variant) throw new Error('Seleccione talla y color válidos');
      if((variant.stock||0) <= 0) throw new Error('Variante sin stock');
      variantId = String(variant._id);
    } else {
      if((product.stock||0) <= 0) throw new Error('Producto sin stock');
    }
    const key = String(product._id || product.id);
    const existing = this.state.cart.find(i=>String(i.productId)===key && String(i.variantId||'')===String(variantId||''));
    const currentQty = existing ? existing.quantity : 0;
    const maxStock = hasVariants ? (variant.stock||0) : (product.stock||0);
    if(currentQty + 1 > maxStock) throw new Error(`Solo hay ${maxStock} unidades disponibles de "${product.name}"`);
    if(existing) existing.quantity++;
    else this.state.cart.push({ productId: key, variantId, quantity:1, product, variant });
    this.saveCart();
    this.resetSessionTimeout(); // Reset timeout on user activity
    this.notify();
  }
  removeFromCart(productId, variantId){ 
    const key=String(productId); 
    this.state.cart = this.state.cart.filter(i=>!(String(i.productId)===key && String(i.variantId||'')===String(variantId||''))); 
    this.saveCart();
    this.resetSessionTimeout(); // Reset timeout on user activity
    this.notify(); 
  }
  clearCart(){
    this.state.cart = [];
    this.state.currentPromo = null;
    this.saveCart();
    this.notify();
  }
  cartCount(){ return this.state.cart.reduce((s,i)=>s+i.quantity,0); }

  // Promotions
  async refreshPromotions(){
    const promos = await api.getPromotions();
    this.state.promotions = promos.map(p=>({ ...p, id: p._id }));
  }
  applyPromo(code){
    const promo = this.state.promotions.find(p=>p.code===code.toUpperCase() && p.active);
    if(!promo) throw new Error('Código de promoción inválido');
    this.state.currentPromo = promo; this.notify(); return promo;
  }
  async createPromotion({ code, discount }){
    const created = await api.createPromotion({ code, discount });
    this.state.promotions.unshift({ ...created, id: created._id });
    this.notify();
  }
  async togglePromotion(id){
    const updated = await api.togglePromotion(id);
    const idx = this.state.promotions.findIndex(p=>p._id===id || p.id===id);
    if(idx>=0){ this.state.promotions[idx] = { ...updated, id: updated._id }; this.notify(); }
  }

  // Orders
  async refreshMyOrders(){
    const list = await api.getMyOrders();
    this.state.orders = list.map(o=>this._adaptOrder(o));
  }
  async refreshAllOrders(){
    const list = await api.getAllOrders();
    this.state.orders = list.map(o=>this._adaptOrder(o));
  }
  _adaptOrder(o){
    const items = (o.items||[]).map(it=>({
      productId: String(it.productId),
      quantity: it.quantity,
      product: { name: it.productName, price: it.productPrice, category: it.category },
      variant: it.variant || null
    }));
    return { ...o, id: o._id, items };
  }
  async createOrder({userName,email,address,address2,department,postalCode,cedula,phone,paymentMethod,shippingCity,shippingCost,giftCardCode}){
    const payload = {
      userName,email,address,address2,department,postalCode,cedula,phone,paymentMethod,
      items: this.state.cart.map(i=>({ productId: i.product._id || i.product.id, variantId: i.variantId, quantity: i.quantity })),
      promoCode: this.state.currentPromo?.code || undefined,
      shippingCity,
      shippingCost,
      giftCardCode
    };
    const created = await api.createOrder(payload);
    const order = this._adaptOrder(created);
    // update stock locally
    this.state.cart.forEach(it=>{
      const p=this.state.products.find(x=>String(x._id||x.id)===String(it.productId));
      if(p){ if(it.variantId){ const v=(p.variants||[]).find(v=>String(v._id)===String(it.variantId)); if(v) v.stock -= it.quantity; } else { p.stock -= it.quantity; } }
    });
    this.state.orders.push(order);
    this.state.cart = []; this.state.currentPromo = null;
    this.saveCart();
    this.notify();
    return order;
  }

  // Returns
  async addReturn({orderId, reason, details}){
    const created = await api.createReturn({ orderId, reason, details });
    const ret = { ...created, id: created._id };
    // restore stock locally
    const order = this.state.orders.find(o=>String(o._id||o.id)===String(orderId));
    if(order){ order.items.forEach(it=>{ const p=this.state.products.find(x=>String(x._id||x.id)===String(it.productId)); if(p) p.stock += it.quantity; }); }
    this.state.returns.push(ret);
    this.notify();
    return ret;
  }

  async refreshReturns(){
    const list = await api.getReturns();
    this.state.returns = list.map(r=>({ ...r, id: r._id }));
  }

  async refreshUsers(){
    const list = await api.getUsers();
    this.state.users = list.map(u=>({ ...u, id: u._id }));
  }

  async updateCurrentUser({ name, username, address, phone }){
    const payload = { };
    if(typeof name === 'string') payload.name = name;
    if(typeof username === 'string') payload.username = username;
    if(typeof address === 'string') payload.address = address;
    if(typeof phone === 'string') payload.phone = phone;
    const updated = await api.updateMe(payload);
    const user = { ...updated, id: updated._id };
    this.state.currentUser = user;
    // reflect in admin users list if loaded
    const idx = this.state.users.findIndex(u=>String(u._id||u.id)===String(user._id||user.id));
    if(idx>=0) this.state.users[idx] = user;
    this.notify();
    return user;
  }

  // Invoices
  addInvoice(order){ this.state.invoices.push(order); this.notify(); }

  // Admin helpers
  clientOrders(clientId){ return this.state.orders.filter(o=>String(o.userId)===String(clientId)); }
  totals(){
    const totalSales = this.state.orders.reduce((s,o)=>s+o.total,0);
    const bestMap = {};
    this.state.orders.forEach(o=>o.items.forEach(it=>{ const k=String(it.productId); bestMap[k]=(bestMap[k]||0)+it.quantity; }));
    const best = Object.entries(bestMap).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([id,qty])=>({ product:this.state.products.find(p=>String(p._id||p.id)===id)?.name||'', quantity:qty }));
    return { totalSales, ordersCount:this.state.orders.length, avgOrder: this.state.orders.length? totalSales/this.state.orders.length:0, best };
  }

  async adminUpdateOrderStatus(id, status){
    const updated = await api.updateOrderStatus(id, status);
    const idx = this.state.orders.findIndex(o=>String(o._id||o.id)===String(id));
    if(idx>=0){ this.state.orders[idx] = this._adaptOrder(updated); this.notify(); }
    return updated;
  }

  // ── Suppliers ──
  async refreshSuppliers(){ this.state.suppliers = await suppliersApi.list(); }
  async createSupplier(data){ const s = await suppliersApi.create(data); this.state.suppliers.unshift(s); this.notify(); return s; }
  async updateSupplier(id, data){ const s = await suppliersApi.update(id, data); const i=this.state.suppliers.findIndex(x=>x._id===id); if(i>=0) this.state.suppliers[i]=s; this.notify(); return s; }
  async deleteSupplier(id){ await suppliersApi.remove(id); this.state.suppliers=this.state.suppliers.filter(x=>x._id!==id); this.notify(); }

  // ── Warehouses ──
  async refreshWarehouses(){ this.state.warehouses = await warehousesApi.list(); }
  async createWarehouse(data){ const w = await warehousesApi.create(data); this.state.warehouses.unshift(w); this.notify(); return w; }
  async updateWarehouse(id, data){ const w = await warehousesApi.update(id, data); const i=this.state.warehouses.findIndex(x=>x._id===id); if(i>=0) this.state.warehouses[i]=w; this.notify(); return w; }
  async addShelf(whId, data){ const w = await warehousesApi.addShelf(whId, data); const i=this.state.warehouses.findIndex(x=>x._id===whId); if(i>=0) this.state.warehouses[i]=w; this.notify(); return w; }
  async removeShelf(whId, shelfId){ const w = await warehousesApi.removeShelf(whId, shelfId); const i=this.state.warehouses.findIndex(x=>x._id===whId); if(i>=0) this.state.warehouses[i]=w; this.notify(); return w; }
  async deleteWarehouse(id){ await warehousesApi.remove(id); this.state.warehouses=this.state.warehouses.filter(x=>x._id!==id); this.notify(); }

  // ── Purchase Orders ──
  async refreshPurchaseOrders(){ this.state.purchaseOrders = await purchaseOrdersApi.list(); }
  async createPurchaseOrder(data){ const po = await purchaseOrdersApi.create(data); this.state.purchaseOrders.unshift(po); this.notify(); return po; }
  async updatePurchaseOrder(id, data){ const po = await purchaseOrdersApi.update(id, data); const i=this.state.purchaseOrders.findIndex(x=>x._id===id); if(i>=0) this.state.purchaseOrders[i]=po; this.notify(); return po; }
  async sendPurchaseOrder(id){ const po = await purchaseOrdersApi.updateStatus(id, 'enviado'); const i=this.state.purchaseOrders.findIndex(x=>x._id===id); if(i>=0) this.state.purchaseOrders[i]=po; this.notify(); return po; }
  async receivePurchaseOrder(id, receivedItems){ const result = await purchaseOrdersApi.receive(id, receivedItems); const i=this.state.purchaseOrders.findIndex(x=>x._id===id); if(i>=0) this.state.purchaseOrders[i]=result.purchaseOrder; await this.refreshProducts(); this.notify(); return result; }
  async deletePurchaseOrder(id){ await purchaseOrdersApi.remove(id); this.state.purchaseOrders=this.state.purchaseOrders.filter(x=>x._id!==id); this.notify(); }
  async getPurchaseOrder(id){ return purchaseOrdersApi.get(id); }

  // ── Returns ──
  async refreshReturns(){ this.state.returns = await api.getReturns(); }
  async getMyReturns(){ return api.getMyReturns(); }
  async getReturn(id){ return api.getReturn(id); }
  async createReturn(data){ const r = await api.createReturn(data); this.state.returns.unshift(r); this.notify(); return r; }
  async approveReturn(id, data){ const r = await api.approveReturn(id, data); const i=this.state.returns.findIndex(x=>x._id===id); if(i>=0) this.state.returns[i]=r; this.notify(); return r; }
  async rejectReturn(id, data){ const r = await api.rejectReturn(id, data); const i=this.state.returns.findIndex(x=>x._id===id); if(i>=0) this.state.returns[i]=r; this.notify(); return r; }
  async markReturnReceived(id){ const r = await api.markReturnReceived(id); const i=this.state.returns.findIndex(x=>x._id===id); if(i>=0) this.state.returns[i]=r; this.notify(); return r; }
  async reviewReturn(id, data){ const r = await api.reviewReturn(id, data); const i=this.state.returns.findIndex(x=>x._id===id); if(i>=0) this.state.returns[i]=r; this.notify(); return r; }
  async validateCoupon(code){ return api.validateCoupon(code); }

  // ── Wishlist ──
  async refreshWishlist(){
    try{
      const list = await wishlistApi.get();
      this.state.wishlist = Array.isArray(list) ? list : [];
    }catch(e){ this.state.wishlist = []; }
  }
  async addToWishlist(productId){
    const result = await wishlistApi.add(productId);
    await this.refreshWishlist();
    this.notify();
    return result;
  }
  async removeFromWishlist(productId){
    const result = await wishlistApi.remove(productId);
    await this.refreshWishlist();
    this.notify();
    return result;
  }
  isInWishlist(productId){
    return this.state.wishlist.some(w => String(w.productId || w._id || w) === String(productId));
  }

  // ── Inventory ──
  async getStockMovements(query){ return inventoryApi.movements(query); }
  async getLowStockAlerts(threshold){ return inventoryApi.lowStock(threshold); }
  async adjustStock(data){ return inventoryApi.adjust(data); }
}
