const stripe = require('stripe')(process.env.STRIPE_KEY);
const router = require('express').Router()
const express = require('express');
const { verifyToken } = require('../middleware/verifyToken');

router.post('/pay', async (req, res) => {
    stripe.charges.create({
        source: req.body.tokenId,
        amount: req.body.amount,
        currency: "chf",
    }, (stripeErr, stripeRes) => {
        if (stripeRes) return res.status(200).json(stripeRes)
        if (stripeErr) return res.status(500).json(stripeErr)
    }
    )
})


let checkoutSession

router.post('/create-checkout', verifyToken, async (req, res) => {
    try {
        const session = await stripe.checkout.sessions.create({
            line_items: req.body.items.map(item => {
                return {
                    price_data: {
                        unit_amount: item.price,
                        currency: "chf",
                        product_data: {
                            name: item.name,
                            images: [item.img],
                            description: `Size: ${item.size}, Color: ${Object.keys(item.color)[0]}`
                        }
                    },
                    quantity: item.quantity
                }
            }),
            mode: "payment",
            billing_address_collection: 'required',
            success_url: `${process.env.CLIENT_DOMAIN}/success?sessionId={CHECKOUT_SESSION_ID}`,
            cancel_url: process.env.CLIENT_DOMAIN + '/cancel'
        })
        
        checkoutSession = session
        return res.status(200).json(session)
    } catch (err) {
        return res.status(500).json(err)
    }
})


const endpointSecret = 'whsec_721c46e888afe1a6b31c1275f8502117b116ea4da36a28068626e52fdb3ac741'

const fulfillOrder = (lineItems) => {
    // TODO: fill me in
    console.log("Fulfilling order", lineItems);
}

router.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
    // const payload = JSON.stringify(req.body, null, 2)
    const payload = req.body
    const sig = req.headers['stripe-signature']
    
    // console.log('Got payload: ' + payload)
    let event
    try {

        event = stripe.webhooks.constructEvent(payload, sig, endpointSecret);

    } catch (err) {
        console.log(`⚠️  Webhook signature verification failed.`, err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`)
    }

    console.log(event.type)
    // Handle the checkout.session.completed event
    // if (event.type === 'checkout.session.completed') {
        
    //     // Fulfill the purchase...
    //     fulfillOrder(lineItems);
    // }
    
    res.status(200).end()
})

router.post('/checkout-complete', async (req, res) => {
    const checkoutSessionId = req.body.id
    console.log(checkoutSessionId)

    try {
        // Retrieve the session. If you require line items in the response, you may include them by expanding line_items.
        const sessionWithLineItems = await stripe.checkout.sessions.retrieve(
            checkoutSessionId,
            {
                expand: ['line_items'],
            }
        );

        console.log(sessionWithLineItems)

        if (sessionWithLineItems?.status === 'complete') {
            return res.status(200).json({status: 'success' , data: sessionWithLineItems})
        } else {
            return res.status(500).json({status: 'failed', message: 'The Checkout Session is not completed, try again.'})
        }
    } catch (err) {
        return res.status(500).json({status: 'failed', message: 'An Error occured: ' + err})
    }

})

module.exports = router