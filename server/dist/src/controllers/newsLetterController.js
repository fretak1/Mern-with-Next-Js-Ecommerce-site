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
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteSubscriber = exports.getAllSubscribers = exports.subscribeToNewsletter = void 0;
const server_1 = require("../server");
// ✅ Add new subscription
const subscribeToNewsletter = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email } = req.body;
        if (!email || !email.includes("@")) {
            res
                .status(400)
                .json({
                success: false,
                message: "Please enter a valid email address.",
            });
            return;
        }
        // Check if already subscribed
        const existing = yield server_1.prisma.newsletter.findUnique({ where: { email } });
        if (existing) {
            res
                .status(200)
                .json({ success: false, message: "You are already subscribed!" });
            return;
        }
        // Create subscription
        yield server_1.prisma.newsletter.create({ data: { email } });
        res
            .status(201)
            .json({ success: true, message: "Subscribed successfully!" });
    }
    catch (error) {
        console.error("Error subscribing to newsletter:", error);
        res.status(500).json({ success: false, message: "Failed to subscribe." });
    }
});
exports.subscribeToNewsletter = subscribeToNewsletter;
// ✅ Get all subscribers (admin use)
const getAllSubscribers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const subscribers = yield server_1.prisma.newsletter.findMany({
            orderBy: { createdAt: "desc" },
        });
        res.status(200).json({ success: true, data: subscribers });
    }
    catch (error) {
        console.error("Error fetching subscribers:", error);
        res
            .status(500)
            .json({ success: false, message: "Failed to fetch subscribers." });
    }
});
exports.getAllSubscribers = getAllSubscribers;
// ✅ Delete subscriber (optional, for admin)
const deleteSubscriber = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email } = req.params;
        yield server_1.prisma.newsletter.delete({
            where: { email },
        });
        res.status(200).json({ success: true, message: "Subscriber removed." });
    }
    catch (error) {
        console.error("Error deleting subscriber:", error);
        res
            .status(500)
            .json({ success: false, message: "Failed to delete subscriber." });
    }
});
exports.deleteSubscriber = deleteSubscriber;
