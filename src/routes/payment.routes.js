const express = require("express");
const router = express.Router();
const {
  createPaymentIntent,
  verifyPayment,
} = require("../controllers/payment.controller");
const { protect } = require("../middleware/auth");

router.post("/create-intent", express.json(), protect, createPaymentIntent);
router.post("/verify", express.json(), protect, verifyPayment);

module.exports = router;
