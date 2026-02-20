export class Observer {
  constructor(){ this.events = new Map(); }
  on(event, handler){
    if(!this.events.has(event)) this.events.set(event, new Set());
    this.events.get(event).add(handler);
    return () => this.off(event, handler);
  }
  off(event, handler){ this.events.get(event)?.delete(handler); }
  emit(event, payload){ this.events.get(event)?.forEach(h=>{ try{ h(payload);}catch(e){console.error(e);} }); }
}
export const bus = new Observer();
