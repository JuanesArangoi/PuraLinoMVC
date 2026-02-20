export const DiscountStrategies = {
  percentage({total, percent}){
    const discount = total * (percent/100);
    return { total: total - discount, discount };
  }
};
