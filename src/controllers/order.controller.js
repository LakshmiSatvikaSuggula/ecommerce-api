const Order = require("../models/Order");
const Cart = require("../models/Cart");
const Product = require("../models/Product");

// @desc    Create order from cart
// @route   POST /api/orders
// @access  Private
exports.createOrder = async (req, res) => {
  const { shippingAddress, paymentMethod, selectedItems } = req.body;
  //                                       👆 new field

  // Get user cart
  const cart = await Cart.findOne({ user: req.user.id });

  if (!cart || cart.items.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Cart is empty",
    });
  }

  // If selectedItems provided, filter only those items
  // Otherwise order everything in cart
  let itemsToOrder = cart.items;

  if (selectedItems && selectedItems.length > 0) {
    itemsToOrder = cart.items.filter((item) =>
      selectedItems.includes(item.product.toString())
    );

    if (itemsToOrder.length === 0) {
      return res.status(400).json({
        success: false,
        message: "None of the selected items found in cart",
      });
    }
  }

  // Verify stock for selected items only
  for (const item of itemsToOrder) {
    const product = await Product.findById(item.product);

    if (!product || !product.isActive) {
      return res.status(400).json({
        success: false,
        message: `Product ${item.name} is no longer available`,
      });
    }

    if (product.stock < item.quantity) {
      return res.status(400).json({
        success: false,
        message: `Only ${product.stock} units of ${item.name} available`,
      });
    }
  }

  // Calculate prices for selected items only
  const itemsPrice = itemsToOrder.reduce(
    (acc, item) => acc + item.price * item.quantity, 0
  );
  const shippingPrice = itemsPrice > 500 ? 0 : 50;
  const taxPrice = Number((itemsPrice * 0.18).toFixed(2));
  const totalPrice = itemsPrice + shippingPrice + taxPrice;

  // Create order
  const order = await Order.create({
    user: req.user.id,
    items: itemsToOrder,
    shippingAddress,
    paymentMethod,
    itemsPrice,
    shippingPrice,
    taxPrice,
    totalPrice,
  });

  // Update stock for ordered items only
  for (const item of itemsToOrder) {
    await Product.findByIdAndUpdate(item.product, {
      $inc: { stock: -item.quantity, sold: item.quantity },
    });
  }

  // Remove only ordered items from cart
  if (selectedItems && selectedItems.length > 0) {
    cart.items = cart.items.filter(
      (item) => !selectedItems.includes(item.product.toString())
    );
  } else {
    cart.items = [];
  }

  await cart.save();

  res.status(201).json({
    success: true,
    message: "Order placed successfully",
    data: order,
  });
};
// @desc    Get my orders
// @route   GET /api/orders/my
// @access  Private
exports.getMyOrders = async (req, res) => {
  const orders = await Order.find({ user: req.user.id })
    .sort({ createdAt: -1 })
    .populate("items.product", "name price");

  res.status(200).json({
    success: true,
    total: orders.length,
    data: orders,
  });
};

// @desc    Get single order
// @route   GET /api/orders/:id
// @access  Private
exports.getOrder = async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate("user", "name email")
    .populate("items.product", "name price");

  if (!order) {
    return res.status(404).json({
      success: false,
      message: "Order not found",
    });
  }

  // Make sure user owns this order
  if (order.user._id.toString() !== req.user.id.toString() &&
      req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Not authorized to view this order",
    });
  }

  res.status(200).json({
    success: true,
    data: order,
  });
};

// @desc    Get all orders (admin)
// @route   GET /api/orders
// @access  Private/Admin
exports.getAllOrders = async (req, res) => {
  const orders = await Order.find()
    .sort({ createdAt: -1 })
    .populate("user", "name email")
    .populate("items.product", "name price");

  // Calculate total revenue
  const totalRevenue = orders.reduce(
    (acc, order) => acc + order.totalPrice, 0
  );

  res.status(200).json({
    success: true,
    total: orders.length,
    totalRevenue,
    data: orders,
  });
};

// @desc    Update order status (admin)
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
exports.updateOrderStatus = async (req, res) => {
  const { status } = req.body;

  const order = await Order.findById(req.params.id);

  if (!order) {
    return res.status(404).json({
      success: false,
      message: "Order not found",
    });
  }

  // Prevent going backwards in status
  const statusFlow = [
    "pending",
    "processing",
    "shipped",
    "delivered",
    "cancelled",
  ];

  const currentIndex = statusFlow.indexOf(order.status);
  const newIndex = statusFlow.indexOf(status);

  if (newIndex < currentIndex && status !== "cancelled") {
    return res.status(400).json({
      success: false,
      message: "Cannot go backwards in order status",
    });
  }

  order.status = status;

  // Set delivered fields
  if (status === "delivered") {
    order.isDelivered = true;
    order.deliveredAt = Date.now();
  }

  await order.save();

  res.status(200).json({
    success: true,
    message: "Order status updated",
    data: order,
  });
};

// @desc    Cancel order
// @route   PUT /api/orders/:id/cancel
// @access  Private
exports.cancelOrder = async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    return res.status(404).json({
      success: false,
      message: "Order not found",
    });
  }

  // Only owner can cancel
  if (order.user.toString() !== req.user.id.toString()) {
    return res.status(403).json({
      success: false,
      message: "Not authorized to cancel this order",
    });
  }

  // Can only cancel pending orders
  if (order.status !== "pending") {
    return res.status(400).json({
      success: false,
      message: `Cannot cancel order with status '${order.status}'`,
    });
  }

  order.status = "cancelled";
  await order.save();

  // Restore stock
  for (const item of order.items) {
    await Product.findByIdAndUpdate(item.product, {
      $inc: { stock: item.quantity, sold: -item.quantity },
    });
  }

  res.status(200).json({
    success: true,
    message: "Order cancelled successfully",
    data: order,
  });
};