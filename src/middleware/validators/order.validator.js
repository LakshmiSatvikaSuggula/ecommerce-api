const { body } = require("express-validator");

exports.createOrderValidator = [
  body("shippingAddress.street")
    .trim()
    .notEmpty()
    .withMessage("Street is required"),

  body("shippingAddress.city")
    .trim()
    .notEmpty()
    .withMessage("City is required"),

  body("shippingAddress.state")
    .trim()
    .notEmpty()
    .withMessage("State is required"),

  body("shippingAddress.zipCode")
    .trim()
    .notEmpty()
    .withMessage("Zip code is required"),

  body("shippingAddress.country")
    .trim()
    .notEmpty()
    .withMessage("Country is required"),

  body("paymentMethod")
    .notEmpty()
    .withMessage("Payment method is required")
    .isIn(["stripe", "cod"])
    .withMessage("Payment method must be stripe or cod"),
];