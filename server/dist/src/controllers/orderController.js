"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrdersByUserId = exports.getAllOrdersForAdmin = exports.updateOrderStatus = exports.getOrder = exports.createOrder = exports.finalizeChapaOrder = exports.createChapaOrder = void 0;
const axios_1 = __importDefault(require("axios"));
const server_1 = require("../server");
const CHAPA_SECRET_KEY = process.env.CHAPA_SECRET_KEY;
const CHAPA_API_URL = "https://api.chapa.co/v1/transaction/verify";
const createChapaOrder = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId, addressId, items, couponId, total, txRef, paymentMethod } = req.body;
        if (!txRef || paymentMethod !== "CHAPA") {
            return res.status(400).json({
                success: false,
                message: "Invalid request data for Chapa order initialization.",
            });
        }
        const existing = yield server_1.prisma.order.findFirst({ where: { txRef } });
        if (existing) {
            return res.status(409).json({
                success: false,
                message: "Transaction reference already in use.",
            });
        }
        const order = yield server_1.prisma.order.create({
            data: {
                userId,
                addressId,
                total,
                couponId,
                paymentMethod,
                paymentStatus: "PENDING",
                txRef: txRef,
                items: {
                    createMany: {
                        data: items.map((item) => ({
                            productId: item.productId,
                            productName: item.productName,
                            productCategory: item.productCategory,
                            quantity: item.quantity,
                            price: item.price,
                            size: item.size,
                            color: item.color,
                        })),
                    },
                },
                status: "PENDING",
            },
            include: { items: true },
        });
        return res.status(201).json(order);
    }
    catch (err) {
        console.error("createChapaOrder error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to create PENDING order on server.",
            error: err.message,
        });
    }
});
exports.createChapaOrder = createChapaOrder;
const finalizeChapaOrder = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { txRef } = req.params;
    if (!txRef) {
        return res.status(400).json({
            success: false,
            message: "Missing transaction reference.",
        });
    }
    if (!CHAPA_SECRET_KEY) {
        return res.status(500).json({
            success: false,
            message: "Server misconfiguration: CHAPA_SECRET_KEY missing.",
        });
    }
    try {
        const existingOrder = yield server_1.prisma.order.findFirst({
            where: { txRef: txRef, paymentStatus: "PENDING" },
        });
        if (!existingOrder) {
            const completedOrder = yield server_1.prisma.order.findFirst({
                where: { txRef, paymentStatus: "COMPLETED" },
            });
            if (completedOrder) {
                return res.status(200).json({
                    success: true,
                    order: completedOrder,
                    message: "Order already finalized.",
                });
            }
            return res.status(404).json({
                success: false,
                message: "Pending order not found.",
            });
        }
        const verificationResponse = yield axios_1.default.get(`${CHAPA_API_URL}/${txRef}`, {
            headers: {
                Authorization: `Bearer ${CHAPA_SECRET_KEY}`,
            },
        });
        const chapaData = verificationResponse.data.data;
        if (verificationResponse.data.status !== "success" ||
            chapaData.status !== "success") {
            yield server_1.prisma.order.update({
                where: { id: existingOrder.id },
                data: { paymentStatus: "FAILED", status: "PENDING" },
            });
            return res.status(400).json({
                success: false,
                message: "Chapa verification failed or payment was unsuccessful.",
            });
        }
        if (existingOrder.total !== chapaData.amount) {
            console.warn(`[FRAUD] Amount mismatch for txRef: ${txRef}. Order total: ${existingOrder.total}, Paid: ${chapaData.amount}`);
            yield server_1.prisma.order.update({
                where: { id: existingOrder.id },
                data: { paymentStatus: "FAILED", status: "PENDING" },
            });
            return res.status(403).json({
                success: false,
                message: "Amount paid does not match order total. Payment rejected.",
            });
        }
        const finalizedOrder = yield server_1.prisma.order.update({
            where: { id: existingOrder.id },
            data: {
                paymentStatus: "COMPLETED",
                status: "PENDING",
                paymentId: chapaData.id,
            },
            include: { items: true },
        });
        return res.status(200).json({
            success: true,
            order: finalizedOrder,
            message: "Order finalized successfully.",
        });
    }
    catch (err) {
        console.error("finalizeChapaOrder error:", err);
        try {
            yield server_1.prisma.order.updateMany({
                where: { txRef, paymentStatus: "PENDING" },
                data: { paymentStatus: "FAILED", status: "PENDING" },
            });
        }
        catch (e) { }
        return res.status(500).json({
            success: false,
            message: "Error finalizing order during Chapa API call.",
            error: err.message,
        });
    }
});
exports.finalizeChapaOrder = finalizeChapaOrder;
const createOrder = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { items, addressId, couponId, total, paymentId } = req.body;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: "Unauthenticated user",
            });
            console.log("Unauthenticated user", userId);
            return;
        }
        const order = yield server_1.prisma.$transaction((prisma) => __awaiter(void 0, void 0, void 0, function* () {
            const newOrder = yield prisma.order.create({
                data: {
                    userId,
                    addressId,
                    couponId,
                    total,
                    paymentMethod: "CHAPA",
                    paymentStatus: "COMPLETED",
                    paymentId,
                    items: {
                        create: items.map((item) => ({
                            productId: item.productId,
                            productName: item.productName,
                            productCategory: item.productCategory,
                            quantity: item.quantity,
                            size: item.size,
                            color: item.color,
                            price: item.price,
                        })),
                    },
                },
                include: {
                    items: true,
                },
            });
            for (const item of items) {
                yield prisma.product.update({
                    where: { id: item.productId },
                    data: {
                        stock: { decrement: item.quantity },
                        soldCount: { increment: item.quantity },
                    },
                });
            }
            yield prisma.cartItem.deleteMany({
                where: {
                    cart: { userId },
                },
            });
            yield prisma.cart.delete({
                where: { userId },
            });
            if (couponId) {
                yield prisma.coupon.update({
                    where: { id: couponId },
                    data: {
                        usageCount: { increment: 1 },
                    },
                });
            }
            return newOrder;
        }));
        res.status(201).json(order);
    }
    catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: "Unexpected Error Occured!",
        });
    }
});
exports.createOrder = createOrder;
const getOrder = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        const { orderId } = req.params;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: "Unauthenticated user",
            });
            return;
        }
        const order = yield server_1.prisma.order.findFirst({
            where: {
                id: orderId,
                userId,
            },
            include: {
                items: true,
                address: true,
                coupon: true,
            },
        });
        res.status(201).json(order);
    }
    catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: "Unexpected Error Occured!",
        });
    }
});
exports.getOrder = getOrder;
const updateOrderStatus = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        const { orderId } = req.params;
        const { status } = req.body;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: "Unauthenticated user",
            });
            return;
        }
        const updateOrder = yield server_1.prisma.order.updateMany({
            where: {
                id: orderId,
            },
            data: {
                status,
            },
        });
        res.status(200).json({
            success: true,
            message: "Order Status update successfully",
        });
    }
    catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: "Unexpected Error Occured!",
        });
    }
});
exports.updateOrderStatus = updateOrderStatus;
const getAllOrdersForAdmin = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: "Unauthenticated user",
            });
            return;
        }
        const orders = yield server_1.prisma.order.findMany({
            include: {
                items: true,
                address: true,
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });
        console.log(orders);
        res.status(200).json(orders);
    }
    catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: "Unexpected Error Occured!",
        });
    }
});
exports.getAllOrdersForAdmin = getAllOrdersForAdmin;
const getOrdersByUserId = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: "Unauthenticated user",
            });
            return;
        }
        const orders = yield server_1.prisma.order.findMany({
            where: {
                userId: userId,
            },
            include: {
                items: true,
                address: true,
            },
            orderBy: {
                createdAt: "desc",
            },
        });
        res.status(200).json(orders);
    }
    catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: "Unexpected Error Occured!",
        });
    }
});
exports.getOrdersByUserId = getOrdersByUserId;
