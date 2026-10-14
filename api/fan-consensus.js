const C=require('../internal/fan-consensus.cjs');
const store=C.createStore(require('@vercel/blob'));
module.exports=C.createHandler(store);
