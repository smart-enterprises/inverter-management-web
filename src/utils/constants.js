export const INITIAL_ORDER_ITEM = {
    product_id: '',
    product_brand: '',
    product_name: '',
    product_model: '',
    product_type: '',
    product_price: 0,
    discount_price: 0,
    qty_ordered: 1,
    delivery_date: '',
    dealer_discount_id: '',
    is_product_scheme: false
};

export const INITIAL_FORM_STATE = {
    dealer_id: '',
    priority: 'MEDIUM',
    order_note: '',
    salesman_id: '',
    amount_paid: '',
    payment_method: 'CASH',
    order_details: [{...INITIAL_ORDER_ITEM }]
};