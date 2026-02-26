export const PaymentStrategies = {
  credit: {
    name: 'Tarjeta de Crédito',
    validate({number, expiry, cvv}){
      if(!number || number.replace(/\s/g,'').length < 13) return false;
      if(!/^\d{2}\/\d{2}$/.test(expiry)) return false;
      if(!/^\d{3,4}$/.test(cvv)) return false;
      return true;
    }
  },
  debit: {
    name: 'Tarjeta de Débito',
    validate({number, expiry, cvv}){
      if(!number || number.replace(/\s/g,'').length < 13) return false;
      if(!/^\d{2}\/\d{2}$/.test(expiry)) return false;
      if(!/^\d{3,4}$/.test(cvv)) return false;
      return true;
    }
  },
  paypal: {
    name: 'PayPal',
    validate(){ return true; }
  },
  pse: {
    name: 'PSE',
    validate(){ return true; }
  },
  mercadopago: {
    name: 'Mercado Pago',
    validate(){ return true; }
  },
  cod: {
    name: 'Pago contraentrega',
    validate(){ return true; }
  }
};
export const getPaymentName = (method)=>PaymentStrategies[method]?.name || method;
