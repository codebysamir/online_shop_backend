const router = require('express').Router()
const User = require('../mongodb/models/User')

const verifyExistingUser = async (req, res, next) => {
    try {
        const user = await User.findOne({username: req.body.username})
        const email = await User.findOne({email: req.body.email})
        if (user) return res.status(409).json({status: 'failed', msg: 'This Username already exists!'})
        if (email) return res.status(409).json({status: 'failed', msg: 'This E-Mail already exists!'})
        next()
    } catch (error) {
        res.status(500).json(err)
    }
} 

module.exports = verifyExistingUser