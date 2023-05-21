const allowedOrigins = require('../config/allowedOrigins')

const allowedOrigin = process.env.CLIENT_DOMAIN

const credentials = (req, res, next) => {
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
        console.log('credentials allowed! Origin: ' + origin)
        res.header('Access-Control-Allow-Origin', origin);
        res.header('Access-Control-Allow-Headers', 'Origin, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, X-Response-Time, X-PINGOTHER, X-CSRF-Token,Authorization');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT ,DELETE');
        res.header('Access-Control-Allow-Credentials', true);
    }
    next();
}

module.exports = credentials