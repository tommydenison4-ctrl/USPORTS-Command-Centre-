const C=require('../internal/fan-consensus.cjs');
module.exports=async(req,res)=>{if(!process.env.CRON_SECRET||req.headers.authorization!=='Bearer '+process.env.CRON_SECRET)return res.status(401).json({error:'Unauthorized'});try{await C.createStore(require('@vercel/blob')).cleanRates();return res.status(200).json({ok:true})}catch{return res.status(503).json({ok:false})}};
