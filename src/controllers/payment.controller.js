const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const Order = require("../models/Order");

// @desc    Create stripe payment intent
// @route   POST /api/payment/create-intent
// @access  Private
exports.createPaymentIntent = async (req, res) => {
  const { orderId } = req.body;

  const order = await Order.findById(orderId);

  if (!order) {
    return res.status(404).json({
      success: false,
      message: "Order not found",
    });
  }

  if (order.user.toString() !== req.user.id.toString()) {
    return res.status(403).json({
      success: false,
      message: "Not authorized",
    });
  }

  if (order.isPaid) {
    return res.status(400).json({
      success: false,
      message: "Order is already paid",
    });
  }

  // ✅ Fixed - added automatic_payment_methods
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(order.totalPrice * 100),
    currency: "inr",
    automatic_payment_methods: {
      enabled: true,
      allow_redirects: "never",
    },
    metadata: {
      orderId: order._id.toString(),
      userId: req.user.id.toString(),
    },
  });

  res.status(200).json({
    success: true,
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
    amount: order.totalPrice,
  });
};

// @desc    Verify payment
// @route   POST /api/payment/verify
// @access  Private
exports.verifyPayment = async (req, res) => {
  const { orderId, paymentIntentId } = req.body;

  // ✅ Dev mode - skip real verification
  if (process.env.NODE_ENV === "development") {
    const order = await Order.findByIdAndUpdate(
      orderId,
      {
        isPaid: true,
        paidAt: Date.now(),
        status: "processing",
        "paymentResult.id": paymentIntentId || "test_payment",
        "paymentResult.status": "succeeded",
      },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Payment verified (test mode)",
      data: order,
    });
  }

  // ✅ Production - verify with Stripe
  const paymentIntent = await stripe.paymentIntents.retrieve(
    paymentIntentId
  );

  if (paymentIntent.status !== "succeeded") {
    return res.status(400).json({
      success: false,
      message: "Payment not successful",
    });
  }

  const order = await Order.findByIdAndUpdate(
    orderId,
    {
      isPaid: true,
      paidAt: Date.now(),
      status: "processing",
      "paymentResult.id": paymentIntentId,
      "paymentResult.status": paymentIntent.status,
    },
    { new: true }
  );

  res.status(200).json({
    success: true,
    message: "Payment verified successfully",
    data: order,
  });
};