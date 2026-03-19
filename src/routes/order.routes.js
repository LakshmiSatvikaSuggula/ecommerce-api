const express = require("express");
const router = express.Router();
const {
  createOrder,
  getMyOrders,
  getOrder,
  getAllOrders,
  updateOrderStatus,
  cancelOrder,
} = require("../controllers/order.controller");
const { protect, authorize } = require("../middleware/auth");
const validate = require("../middleware/validate");
const {
  createOrderValidator,
} = require("../middleware/validators/order.validator");

router.use(protect);

router.post("/", createOrderValidator, validate, createOrder);
router.get("/my", getMyOrders);
router.get("/", authorize("admin"), getAllOrders);
router.get("/:id", getOrder);
router.put("/:id/status", authorize("admin"), updateOrderStatus);
router.put("/:id/cancel", cancelOrder);

module.exports = router;