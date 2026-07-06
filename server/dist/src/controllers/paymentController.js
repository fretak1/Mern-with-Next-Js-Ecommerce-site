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
exports.verifyPayment = exports.initializePayment = void 0;
const axios_1 = __importDefault(require("axios"));
const chapaAxios = axios_1.default.create({
    baseURL: process.env.CHAPA_BASE_URL,
    headers: {
        Authorization: `Bearer ${process.env.CHAPA_SECRET_KEY}`,
        "Content-Type": "application/json",
    },
});
const initializePayment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const APP_BASE_URL = process.env.APP_BASE_URL;
        if (!APP_BASE_URL) {
            return res.status(500).json({
                success: false,
                message: "Server configuration missing APP_BASE_URL.",
            });
        }
        const { amount, currency, customerEmail, customerName, txRef } = req.body;
        const returnUrl = `https://mern-with-next-js-stack-ecommerce-s.vercel.app/checkout/success/${txRef}`;
        const resp = yield chapaAxios.post("/transaction/initialize", {
            amount,
            currency,
            tx_ref: txRef,
            customer_email: customerEmail,
            customer_name: customerName,
            return_url: returnUrl,
        });
        if (resp.data.status === "success") {
            return res.status(200).json({
                success: true,
                checkoutUrl: resp.data.data.checkout_url,
                reference: txRef,
            });
        }
        else {
            return res.status(400).json({
                success: false,
                message: "Chapa init failed",
                details: resp.data,
            });
        }
    }
    catch (err) {
        console.error("initializePayment error", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
});
exports.initializePayment = initializePayment;
const verifyPayment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { txRef } = req.params;
        if (!txRef) {
            return res.status(400).json({
                success: false,
                message: "Missing transaction reference",
            });
        }
        const chapaRes = yield axios_1.default.get(`https://api.chapa.co/v1/transaction/verify/${txRef}`, {
            headers: {
                Authorization: `Bearer ${process.env.CHAPA_SECRET_KEY}`,
            },
        });
        const verificationData = chapaRes.data;
        if (verificationData.status === "success" &&
            verificationData.data.status === "success") {
            return res.status(200).json({
                success: true,
                message: "Payment verified successfully",
                data: verificationData.data,
            });
        }
        else {
            return res.status(400).json({
                success: false,
                message: "Payment verification failed",
                data: verificationData.data,
            });
        }
    }
    catch (error) {
        console.error("Verify payment error:", ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error);
        return res.status(500).json({
            success: false,
            message: "Error verifying payment",
            error: error.message || "Internal Server Error",
        });
    }
});
exports.verifyPayment = verifyPayment;
