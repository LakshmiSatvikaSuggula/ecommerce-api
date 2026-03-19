require("dotenv").config();
require("express-async-errors");

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");
const connectDB = require("./config/db");
const authRoutes = require("./routes/auth.routes");
const productRoutes = require("./routes/product.routes");
const cartRoutes = require("./routes/cart.routes");
const orderRoutes = require("./routes/order.routes");
const paymentRoutes = require("./routes/payment.routes");
const { errorHandler } = require("./middleware/errorHandler");
const notFound = require("./middleware/notFound");

const app = express();

connectDB();

// ✅ Helmet with CSP disabled for Swagger
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Root route
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Welcome to Ecommerce API 🚀",
    docs: "https://ecommerce-api-0dlz.onrender.com/api/docs",
    health: "https://ecommerce-api-0dlz.onrender.com/health",
  });
});

// ✅ Health check
app.get("/health", (req, res) => {
  res.json({ success: true, message: "Server is running" });
});

// ✅ Swagger docs
app.use(
  "/api/docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "Ecommerce API Docs",
    swaggerOptions: {
      persistAuthorization: true,
    },
  })
);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payment", paymentRoutes);

// Error handlers
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Swagger docs: http://localhost:${PORT}/api/docs`);
});

module.exports = app;