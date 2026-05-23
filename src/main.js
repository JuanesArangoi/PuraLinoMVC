import { AppController } from './controllers/appController.js';

window.addEventListener('DOMContentLoaded', async ()=>{
  const app = new AppController();

  // Wait for session restore before routing
  await app.bootstrapReady;

  // Simple hash -> route sync (optional)
  const routeFromHash = ()=>{
    // Don't override restored admin view
    if(app.model.state.currentUser?.role === 'admin' && sessionStorage.getItem('pl_admin_section')) return;
    const h = (location.hash||'').replace('#','');
    if(h==='products') app.route('products');
    else app.route('home');
  };
  window.addEventListener('hashchange', routeFromHash);
  routeFromHash();
});
// CI/CD test
