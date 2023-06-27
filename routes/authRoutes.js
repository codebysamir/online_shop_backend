const router = require('express').Router()
const User = require('../mongodb/models/User')
const CryptoJS = require('crypto-js')
const jwt = require('jsonwebtoken')
const verifyExistingUser = require('../middleware/verifyUser')
const { verifyTokenAndAuthorization } = require('../middleware/verifyToken')
const cloudinary = require('cloudinary').v2



// REGISTER

router.post('/register', verifyExistingUser, async (req, res) => {
    
    try {
        const uploadCloudinary = await cloudinary.uploader.upload(req.body.img, {public_id: 'newUpload', folder: 'online_shop/users'});
        console.log(uploadCloudinary)
    
        const newUser = new User({
            username: req.body.username,
            email: req.body.email,
            img: uploadCloudinary.secure_url,
            password: CryptoJS.AES.encrypt(req.body.password, process.env.PASS_SEC).toString(),
        })
        console.log(newUser)
        const savedUser = await newUser.save()

        const updateCloudinary = await cloudinary.uploader.rename(uploadCloudinary.public_id, 'online_shop/users/' + savedUser._id)
        console.log(updateCloudinary)

        const updatedUser = await User.findByIdAndUpdate(
            savedUser._id, 
            { $set: { img: updateCloudinary.secure_url } },
            { new: true}
        )
        console.log(updatedUser)

        // console.log(savedUser)
        res.status(201).json({status: 'success', user: updatedUser})
    } catch (err) {
        res.status(500).json({status: 'error', err})
    }
})


// LOGIN

router.post('/login', async (req, res) => {
    try {
        const user = await User.findOne({username: req.body.username})
        if (!user) return res.status(401).json({status: 'failed', msg: 'Wrong credentials!'})
        const hashedPassword = CryptoJS.AES.decrypt(
            user.password, process.env.PASS_SEC
            ).toString(CryptoJS.enc.Utf8)
        if (hashedPassword !== req.body.password) return res.status(401).json({status: 'failed', msg: 'Wrong credentials!'})

        const accessToken = jwt.sign(
            {
                id: user._id,
                isAdmin: user.isAdmin,
            }, 
            process.env.JWT_SEC,
            {expiresIn:'15min'}
        )
        
        const refreshToken = jwt.sign(
            {
                id: user._id,
                isAdmin: user.isAdmin,
            }, 
            process.env.JWT_REFRESH_SEC,
            {expiresIn:'7d'}
        )
        // SAVE REFRESH TOKEN TO DB
        await User.findByIdAndUpdate(user._id, { $set: { refreshToken: refreshToken } })

        // refreshTokenArr.push(refreshToken)

        // NOT WORKING FROM THE CLIENT SIDE
        // res.cookie('jwt', refreshToken, {
        //     httpOnly: true, //accessible only by a web server
        //     secure: false, //httpS
        //     sameSite: 'None', //cross-site cookie
        //     maxAge: 7 * 24 * 60 * 60 * 1000 //cookie expiry: set to match refreshToken
        // })

        const { password, refreshToken: token, ...others} = user._doc

        res.status(200).json({...others, accessToken})
    } catch (err) {
        res.status(500).json(err)
    }
})


// REFRESH TOKEN
let refreshTokenArr = []

router.post('/refresh-token', async (req, res) => {
    // const cookies = req.cookies
    // console.log(cookies)
    // console.log(req.originalUrl)
    // console.log('backend /refresh-token: ' + cookies?.jwt)
    // if (!cookies?.jwt) return res.status(401).json({message: 'No Refresh Token Cookie, Unauthorized'})
    // const refreshToken = cookies.jwt
    const userId = req.body.userId
    const user = await User.findOne({ _id: userId })
    if (!user) return res.status(401).json({message: 'UserId doesnt exist in DB'})
    const refreshToken = user?.refreshToken
    console.log(refreshToken)
    if (refreshToken === null) return res.sendStatus(401)
    // if (!refreshTokenArr.includes(refreshToken)) return res.sendStatus(403)
    jwt.verify(refreshToken, process.env.JWT_REFRESH_SEC, (err, user) => {
        if (err) return res.status(403).json({status: 'expired', message: 'Your token expired, please Log In again.'})

        const accessToken = jwt.sign(
            {
                id: user._id,
                isAdmin: user.isAdmin,
            }, 
            process.env.JWT_SEC,
            {expiresIn:'15m'}
        )
        res.status(200).json({accessToken})
    })
    // try {
    // } catch (err) {
    //     res.status(500).json('refresh-token get request failed: ' + err)
    // }
})


// LOGOUT

router.get('/logout/:id', verifyTokenAndAuthorization, async (req, res) => {
    const user = await User.findByIdAndUpdate(req.params.id, { $unset: { refreshToken: "" } })
    // const cookies = req.cookies
    // if (!cookies?.jwt) return res.sendStatus(204) // No Content
    // res.clearCookie('jwt', { httpOnly: true, sameSite: 'None', secure: true })
    res.status(200).json("You've been successfully logged out!")
})

module.exports = router