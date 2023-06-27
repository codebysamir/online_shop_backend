const { verifyToken, verifyTokenAndAuthorization, verifyTokenAndAdmin } = require('../middleware/verifyToken')
const Order = require('../mongodb/models/Order')
const Product = require('../mongodb/models/Product')

const router = require('express').Router()


// CREATE

router.post('/', verifyToken, async (req, res) => {
    const newOrder = new Order(req.body)
    try {
        const savedOrder = await newOrder.save()

        res.status(200).json(savedOrder)
    } catch (err) {
        res.status(500).json(err)
    }
})


// UPDATE

router.put('/:id', verifyTokenAndAdmin, async (req, res) => {
    try {
        const updatedOrder = await Order.findByIdAndUpdate(
            req.params.id, 
            { $set: req.body },
            { new: true}
        )
        res.status(200).json(updatedOrder)
    } catch (err) {
        res.status(500).json(err)
    }
})


// DELETE

router.delete('/:id', verifyTokenAndAdmin, async (req, res) => {
    try {
        const deletedOrder = await Order.findByIdAndDelete(req.params.id)
        console.log(deletedOrder)
        res.status(200).json('Order has been deleted...')
    } catch (err) {
        res.status(500).json(err)
    }
})


// GET USER ORDERS

router.get('/find/:userId', verifyTokenAndAuthorization, async (req, res) => {
    try {
        const orders = await Order.find({userId: req.params.userId})

        res.status(200).json(orders)
    } catch (err) {
        res.status(500).json(err)
    }
})


// GET ALL ORDERS

router.get('/', verifyTokenAndAdmin, async (req, res) => {
    const query = req.query.newest
    try {
        const orders = query ? await Order.find().sort({createdAt: -1}).limit(5) : await Order.find()
        // const orders = await Order.find()
        
        res.status(200).json(orders)
    } catch (err) {
        res.status(500).json(err)
    }
})

// GET MONTHLY USER INCOME STATS

router.get('/income/user/:userId', verifyTokenAndAdmin, async (req, res) => {
    const date = new Date()
    if (date.getMonth() === 2, date.getDate() > 28 ){
        date.setDate(28)
    }
    const lastMonth = new Date(date.setMonth(date.getMonth() -1))
    const previousMonth = new Date(new Date().setMonth(lastMonth.getMonth() -1))
    
    const lastYear = new Date(date.setFullYear(date.getFullYear() -1))
    console.log(lastMonth)
    console.log(previousMonth)
    console.log(req.params.userId)
    try {
        const income = await Order.aggregate([
            {
                $match: { 
                    createdAt: { $gte: lastYear },
                    userId: req.params.userId
                },
            },
            {
                $project: { 
                    month: { $month: "$createdAt" },
                    sales: "$amount"
                },
            },
            {
                $group: {
                    _id: "$month",
                    total: { $sum: "$sales" }
                }
            }
        ])

        res.status(200).json(income)
    } catch (err) {
        res.status(500).json(err)
    }
})

// GET MONTHLY PRODUCT INCOME STATS

router.get('/income/product/:productId', verifyTokenAndAdmin, async (req, res) => {
    const date = new Date()
    if (date.getMonth() === 2, date.getDate() > 28 ){
        date.setDate(28)
    }
    const lastMonth = new Date(date.setMonth(date.getMonth() -1))
    const previousMonth = new Date(new Date().setMonth(lastMonth.getMonth() -1))
    
    const lastYear = new Date(date.setFullYear(date.getFullYear() -1))
    console.log(lastMonth)
    console.log(previousMonth)
    console.log(req.params.productId)
    const productId = req.params.productId

    
    try {
        const product = await Product.findOne({ _id: productId }); 
    
        if (!product) {
            // Handle the case where the product is not found
            return res.status(404).json({ message: 'Product not found' });
        }
    
        const productPrice = product.price;

        const income = await Order.aggregate([
            {
                $match: { 
                    createdAt: { $gte: lastYear },
                    "products.productId": productId
                },
            },
            {
                $project: { 
                    month: { $month: "$createdAt" },
                    sales: {
                        $sum: {
                            $map: {
                                input: {
                                    $filter: {
                                        input: "$products",
                                        cond: { $eq: ["$$this.productId", productId] }
                                    }
                                },
                                in: { $multiply: ["$$this.quantity", productPrice] }
                            }
                        }
                    }
                },
            },
            {
                $group: {
                    _id: "$month",
                    total: { $sum: "$sales" }
                }
            }
        ])

        res.status(200).json(income)
    } catch (err) {
        res.status(500).json(err)
    }
})


// GET MONTHLY INCOME STATS

router.get('/income', verifyTokenAndAdmin, async (req, res) => {
    const date = new Date()
    if (date.getMonth() === 2, date.getDate() > 28 ){
        date.setDate(28)
    }
    const lastMonth = new Date(date.setMonth(date.getMonth() -1))
    const previousMonth = new Date(new Date().setMonth(lastMonth.getMonth() -1))
    
    const lastYear = new Date(date.setFullYear(date.getFullYear() -1))
    console.log(lastMonth)
    console.log(previousMonth)
    try {
        const income = await Order.aggregate([
            {
                $match: { 
                    createdAt: { $gte: lastYear },
                },
            },
            {
                $project: { 
                    month: { $month: "$createdAt" },
                    sales: "$amount"
                },
            },
            {
                $group: {
                    _id: "$month",
                    total: { $sum: "$sales" }
                }
            }
        ])

        res.status(200).json(income)
    } catch (err) {
        res.status(500).json(err)
    }
})



module.exports = router