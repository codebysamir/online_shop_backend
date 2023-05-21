const express = require('express')
dotenv = require('dotenv').config()
const connection = require('./mongodb/connect')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const authRoutes = require('./routes/authRoutes')
const userRoutes = require('./routes/userRoutes')
const productRoutes = require('./routes/productRoutes')
const cartRoutes = require('./routes/cartRoutes')
const orderRoutes = require('./routes/orderRoutes')
const stripeRoutes = require('./routes/stripeRoutes')
const { logger } = require('./middleware/logger')
const corsOptions = require('./config/corsOptions')
const credentials = require('./middleware/credentials')
const errorHandler = require('./middleware/errorHandler')
const app = express()


app.use(logger)
app.use(credentials)
app.use(cors(corsOptions))
app.use((req, res, next) => {
    if (req.originalUrl === '/api/stripe/webhook') {
        next();
    } else {
        express.json()(req, res, next);
    }
})
app.use(cookieParser())


app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/products', productRoutes)
app.use('/api/carts', cartRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/stripe', stripeRoutes)

app.get('/', async (req, res) => {
    res.send('Hello Server World2')
})

app.use(errorHandler)

app.listen(3001, () => {
    connection(process.env.MONGODB_URL)
    console.log('Server is listening on port 3001')
})