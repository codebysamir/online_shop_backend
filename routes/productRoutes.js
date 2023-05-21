const { verifyToken, verifyTokenAndAuthorization, verifyTokenAndAdmin } = require('../middleware/verifyToken')
const Product = require('../mongodb/models/Product')

const router = require('express').Router()


// CREATE

router.post('/', verifyTokenAndAdmin, async (req, res) => {
    const newProduct = new Product(req.body)
    try {
        const savedProduct = await newProduct.save()

        res.status(200).json(savedProduct)
    } catch (err) {
        res.status(500).json(err)
    }
})


// UPDATE

router.put('/:id', verifyTokenAndAdmin, async (req, res) => {
    try {
        const updatedProduct = await Product.findByIdAndUpdate(
            req.params.id, 
            { $set: req.body },
            { new: true}
        )
        res.status(200).json(updatedProduct)
    } catch (err) {
        res.status(500).json(err)
    }
})


// DELETE

router.delete('/:id', verifyTokenAndAdmin, async (req, res) => {
    try {
        // const deletedProduct = await Product.deleteOne(req.params.id)
        const deletedProduct = await Product.findByIdAndDelete(req.params.id)
        console.log(deletedProduct)
        res.status(200).json('Product has been deleted...')
    } catch (err) {
        res.status(500).json(err)
    }
})


// GET PRODUCT

router.get('/find/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id)

        res.status(200).json(product)
    } catch (err) {
        res.status(500).json(err)
    }
})


// GET ALL PRODUCTS

router.get('/', async (req, res) => {
    const qNewest = req.query.newest
    const qCategory = req.query.category
    try {
        let products
        if (qNewest) {
            products = await Product.find().sort({createdAt: -1}).limit(1)
        } else if (qCategory) {
            products = await Product.find({category: { $in: [qCategory] }}).limit(5)
        } else {
            products = await Product.find()
        }
        
        res.status(200).json(products)
    } catch (err) {
        res.status(500).json(err)
    }
})


// GET PRODUCT STATS

router.get('/stats', verifyTokenAndAdmin, async (req, res) => {
    const date = new Date()
    const lastYear = new Date(date.setFullYear(date.getFullYear() -1))
    try {
        const data = await Product.aggregate([
            {
                $match: { createdAt: { $gte: lastYear }},
            },
            {
                $project: { month: { $month: "$createdAt" }},
            },
            {
                $group: {
                    _id: "$month",
                    total: { $sum: 1 }
                }
            }
        ])

        res.status(200).json(data)
    } catch (err) {
        res.status(500).json(err)
    }
})

module.exports = router