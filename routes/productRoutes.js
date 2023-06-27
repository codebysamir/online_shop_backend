const cloudinaryConfig = require('../config/cloudinaryConfig')
const { verifyToken, verifyTokenAndAuthorization, verifyTokenAndAdmin } = require('../middleware/verifyToken')
const Order = require('../mongodb/models/Order')
const Product = require('../mongodb/models/Product')
const cloudinary = require('cloudinary').v2
const router = require('express').Router()

cloudinaryConfig

// CREATE

router.post('/', verifyTokenAndAdmin, async (req, res) => {
    const { img, categories, sizes, ...rest } = req.body
    let newProduct
    try {
        const uploadCloudinary = await cloudinary.uploader.upload(img, {public_id: 'newUpload', folder: 'online_shop/products'});
        console.log(uploadCloudinary)

        newProduct = new Product({...rest, category: categories, size: sizes, img: uploadCloudinary.secure_url})
        console.log(newProduct)
        const savedProduct = await newProduct.save()

        const updateCloudinary = await cloudinary.uploader.rename('online_shop/products/newUpload', 'online_shop/products/' + savedProduct._id)
        console.log(updateCloudinary)

        const updatedProduct = await Product.findByIdAndUpdate(
            savedProduct._id, 
            { $set: { img: updateCloudinary.secure_url } },
            { new: true}
        )
        console.log(updatedProduct)

        res.status(200).json(updatedProduct)
    } catch (err) {
        console.log(err)
        res.status(500).json(err)
    }
})


// UPDATE

router.put('/:id', verifyTokenAndAdmin, async (req, res) => {

    let updateCloudinary

    try {
        if (Object.keys(req.body).includes('img')) {
            const findCloudinaryProduct = await cloudinary.search.expression(req.params.id).execute()
            console.log('Found image: ', findCloudinaryProduct)
            if (findCloudinaryProduct?.total_count === 1) {
                updateCloudinary = await cloudinary.uploader.upload(req.body.img, {public_id: findCloudinaryProduct.resources[0].public_id });
                console.log('Excisting image: ' , updateCloudinary)
            } else {
                updateCloudinary = await cloudinary.uploader.upload(req.body.img, {public_id: req.params.id, folder: 'online_shop/products'});
                console.log('None excisting image: ' , updateCloudinary)
            }
        }
        
        const updatedProduct = await Product.findByIdAndUpdate(
            req.params.id, 
            { $set: updateCloudinary ? { ...req.body, img: updateCloudinary.secure_url } : req.body },
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

        const findCloudinaryProduct = await cloudinary.search.expression(req.params.id).execute()
        if (findCloudinaryProduct?.total_count === 1) {
            const deletePublicId = await cloudinary.uploader.destroy('online_shop/products/' + req.params.id)
            if (!deletePublicId?.result.ok) console.log('Could not delete on cloudinary')
        }
        
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
            products = await Product.find().sort({createdAt: -1}).limit(25)
        } else if (qCategory) {
            products = await Product.find({category: { $in: [qCategory] }})
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

// GET PRODUCT STATS

router.get('/stats/sales', verifyTokenAndAdmin, async (req, res) => {
    const date = new Date()
    const lastYear = new Date(date.setFullYear(date.getFullYear() -1))
    try {
        const products = await Product.find({});

        const productSales = await Promise.all(products.map(async product => {

            const productId = product._id.toString()
        
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

            // console.log(income)
            
            const salesStats = {
                id: productId,
                productName: product.title,
                soldPerMonth: income
            }
            // console.log(salesStats)
            return salesStats
            
        }))

        const filteredProductSales = productSales.filter(product => product.soldPerMonth.length)
        
        res.status(200).json(filteredProductSales)
    } catch (err) {
        res.status(500).json(err)
    }
})

module.exports = router