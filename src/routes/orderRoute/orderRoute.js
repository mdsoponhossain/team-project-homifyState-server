const express = require('express');
const orderModel = require('../../models/order/orderModel');
const { ObjectId } = require('mongodb');
const orderRouter = express.Router();

//payment for ssLcommerz
const SSLCommerzPayment = require('sslcommerz-lts');
const checkoutModel = require('../../models/checkout/checkoutModel');
const { verify } = require('jsonwebtoken');
const tokenVerify = require('../../middleware/TokenVerify/TokenVerify');
const store_id = process.env.STORE_ID
const store_passwd = process.env.STORE_PASS
const is_live = false //true for live, false for sandbox

const trans_id = new ObjectId().toString();

orderRouter.post('/',tokenVerify, async (req, res) => {

    // console.log(req.body.formData);

    // const result = await orderModel(req.body).save();
    try {

        const data = {
            total_amount: req?.body?.formData.amount,
            currency: 'BDT',
            tran_id: trans_id, // use unique tran_id for each api call
            // success_url: `http://localhost:5000/order/payment/success/${trans_id}?id=${req?.body?.formData?.property}`,
            success_url: `${process.env.CLIENT}/payment/success/${trans_id}?id=${req?.body?.formData?.property}`,
            // fail_url: `http://localhost:5000/order/payment/fail/${trans_id}`,
            fail_url: `${process.env.CLIENT}/payment/fail/${trans_id}`,
            cancel_url: `${process.env.CLIENT}/payment/fail/${trans_id}`,
            ipn_url: `${process.env.CLIENT}/payment/fail/${trans_id}`,
            shipping_method: 'Courier',
            product_name: 'Computer.',
            product_category: 'Electronic',
            product_profile: 'general',
            cus_name: req?.body?.formData?.name,
            cus_email: req?.body?.formData?.email,
            cus_add1: 'Dhaka',
            cus_add2: 'Dhaka',
            cus_city: 'Dhaka',
            cus_state: 'Dhaka',
            cus_postcode: '1000',
            cus_country: 'Bangladesh',
            cus_phone: '01711111111',
            cus_fax: '01711111111',
            ship_name: 'Customer Name',
            ship_add1: 'Dhaka',
            ship_add2: 'Dhaka',
            ship_city: 'Dhaka',
            ship_state: 'Dhaka',
            ship_postcode: 1000,
            ship_country: 'Bangladesh',
        };
        // console.log(req.body)
        const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live)
        sslcz.init(data).then(apiResponse => {
            // Redirect the user to payment gateway
            let GatewayPageURL = apiResponse.GatewayPageURL
            // res.redirect(GatewayPageURL)
            res.send({ url: GatewayPageURL });

            const paymentInfo = req.body.formData
            paymentInfo.paymentStatus = false;
            paymentInfo.transectionId = trans_id;
            // console.log(paymentInfo)
            const result = orderModel(paymentInfo).save();
            console.log('Redirecting to: ', GatewayPageURL)
        });



        // orderRouter.post('/payment/success/:transId', async (req, res) => {
        //     console.log("the transId :", req.params.transId)
        //     console.log(req.query.id);
        //     const id = req.query.id
        //     try {
        //         const result = await orderModel.updateOne({ transectionId: req.params.transId }, {
        //             $set: {
        //                 paymentStatus: true
        //             }
        //         })
        //         const updateStatus = await checkoutModel.findByIdAndUpdate(id, { $set: {'property_details.status': 'sold' }},{new:true})
        //         console.log('the update info:', result)
        //         console.log('the update info:', updateStatus)
        //         if (result.modifiedCount > 0 && updateStatus.modifiedCount > 0) {
        //             res.redirect(`${process.env.CLIENT}/payment/success/${req.params.transId}`)
        //         }

        //     } catch (error) {
        //         console.log(error);
        //     }
        // });

        // orderRouter.post('/payment/fail/:transId', async (req, res) => {
        //     const result = await orderModel.deleteOne({ transectionId: req.params.transId });
        //     console.log('delete info:', result)
        //     if (result.deletedCount) {
        //         res.redirect(`${process.env.CLIENT}/payment/fail/${req.params.transId}`)
        //     }
        // })


        // res.send(result).status(200);
        console.log('order is inserted to DB')
    } catch (error) {
        if (error.name === 'ValidationError') {
            // Handle validation errors, possibly by sending a 400 Bad Request response
            res.status(400).json({ error: 'Validation failed', details: error.errors });
        } else {
            // Handle other errors, possibly by sending a 500 Internal Server Error response
            console.error('Unexpected error:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
});
orderRouter.patch('/payment/success/:transId',tokenVerify, async (req, res) => {
    // console.log("the transId :", req.params.transId)
    // console.log(req.query.id);
    const id = req.query.id
    try {
        const result = await orderModel.updateOne({ transectionId: req.params.transId }, {
            $set: {
                paymentStatus: true
            }
        })
        const updateStatus = await checkoutModel.findByIdAndUpdate(id, {
            $set: {
                'property_details.status': 'sold'
            }
        }, { new: true });
        // console.log('the update info:', result)
        // console.log('the update info2:', updateStatus)
        if (result.modifiedCount > 0 && updateStatus.modifiedCount > 0) {
            // res.redirect(`${process.env.CLIENT}/payment/success/${req.params.transId}`)
            res.send({ 'result': 'modified' })
        }
    } catch (error) {
        console.log(error);
    }
});

orderRouter.delete('/payment/fail/:transId',tokenVerify, async (req, res) => {
    const result = await orderModel.deleteOne({ transectionId: req.params.transId });
    // console.log('delete info:', result)
    if (result.deletedCount) {
        // res.redirect(`${process.env.CLIENT}/payment/fail/${req.params.transId}`)
        res.send(result)
    }
})
// user get his own order
orderRouter.get('/user', verify, async (req, res) => {
    const userEmail = req.query.email
    const result = await orderModel.find({ email: userEmail }).populate('property')
    // console.log(result);
    res.send(result)
})


//  dletet user order api

orderRouter.delete('/:id',tokenVerify, async (req, res) => {
    const itemId = req.params.id;
    try {
        // Use deleteOne with a query based on _id
        const deletedItem = await orderModel.deleteOne({ _id: itemId });
        res.send(deletedItem);
    } catch (error) {
        console.log(error);
    }
});





module.exports = orderRouter