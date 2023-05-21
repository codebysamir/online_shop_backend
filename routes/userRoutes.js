const errorHandler = require('../middleware/errorHandler')
const { verifyToken, verifyTokenAndAuthorization, verifyTokenAndAdmin } = require('../middleware/verifyToken')
const User = require('../mongodb/models/User')
const CryptoJS = require('crypto-js')
const router = require('express').Router()



// UPDATE

router.put('/:id', verifyTokenAndAuthorization, async (req, res) => {
    if (req.body.password) {
        req.body.password = CryptoJS.AES.encrypt(req.body.password, process.env.PASS_SEC).toString()
    }

    try {
        // Check for duplicate name with case sensivity.
        const duplicateName = await User.findOne({ username: req.body?.username}).collation({locale: 'de', strength: 2})
        if (duplicateName) return res.status(409).json({isDuplicate: true, message: 'Username exists already.'})

        const duplicateEmail = await User.findOne({ email: req.body?.email}).collation({locale: 'de', strength: 2})
        if (duplicateEmail) return res.status(409).json({isDuplicate: true, message: 'E-Mail exists already.'})

        const updatedUser = await User.findByIdAndUpdate(
            req.params.id, 
            { $set: req.body },
            { new: true}
        )
        res.status(200).json(updatedUser)
    } catch (err) {
        // res.status(500).json(err)
        errorHandler(err, req, res)
    }
})


// DELETE

router.delete('/:id', verifyTokenAndAuthorization, async (req, res) => {
    try {
        // const deletedUser = await User.deleteOne({_id: req.params.id})
        const deletedUser = await User.findByIdAndDelete(req.params.id)
        console.log('DELETED SUCCESSFULLY USER: ', deletedUser)
        res.status(200).json('User has been deleted...')
    } catch (err) {
        res.status(500).json(err)
    }
})


// GET USER

router.get('/find/:id', verifyTokenAndAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
        const { password, ...others} = user._doc

        res.status(200).json(others)
    } catch (err) {
        res.status(500).json(err)
    }
})


// GET ALL USERS

router.get('/', verifyTokenAndAdmin, async (req, res) => {
    const query = req.query.newest
    try {
        const users = query ? await User.find().limit(1) : await User.find()
        const userDatas = users.map(user => {
        const { password, ...others} = user._doc
        return others
        })

        res.status(200).json(userDatas)
    } catch (err) {
        res.status(500).json(err)
    }
})


// GET USER STATS

router.get('/stats', verifyTokenAndAdmin, async (req, res) => {
    const date = new Date()
    const lastYear = new Date(date.setFullYear(date.getFullYear() -1))
    try {
        const data = await User.aggregate([
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