const express = require("express");
const router = express.Router();
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  addReview,
} = require("../controllers/product.controller");
const { protect, authorize } = require("../middleware/auth");
const validate = require("../middleware/validate");
const {
  createProductValidator,
  reviewValidator,
} = require("../middleware/validators/product.validator");

router.get("/", getProducts);
router.get("/:id", getProduct);
router.post("/", protect, authorize("admin"), createProductValidator, validate, createProduct);
router.put("/:id", protect, authorize("admin"), updateProduct);
router.delete("/:id", protect, authorize("admin"), deleteProduct);
router.post("/:id/reviews", protect, reviewValidator, validate, addReview);

module.exports = router;