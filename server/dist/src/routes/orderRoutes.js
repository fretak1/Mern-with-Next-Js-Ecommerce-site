"use strict";
// 📄 routes/orderRoutes.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const orderController_1 = require("../controllers/orderController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
router.post("/create-order", authMiddleware_1.authenticateJwt, orderController_1.createOrder);
router.post("/create-chapa-order", authMiddleware_1.authenticateJwt, orderController_1.createChapaOrder);
router.put("/finalize-chapa-order/:txRef", authMiddleware_1.authenticateJwt, orderController_1.finalizeChapaOrder);
router.get("/get-single-order/:orderId", authMiddleware_1.authenticateJwt, orderController_1.getOrder);
router.get("/get-order-by-user-id", authMiddleware_1.authenticateJwt, orderController_1.getOrdersByUserId);
router.get("/get-all-order-for-admin", authMiddleware_1.authenticateJwt, authMiddleware_1.isSuperAdmin, orderController_1.getAllOrdersForAdmin);
router.put("/:orderId/status", authMiddleware_1.authenticateJwt, authMiddleware_1.isSuperAdmin, orderController_1.updateOrderStatus);
exports.default = router;
