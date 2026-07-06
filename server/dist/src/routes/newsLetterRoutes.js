"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const newsLetterController_1 = require("../controllers/newsLetterController");
const router = express_1.default.Router();
// Public
router.post("/subscribe", newsLetterController_1.subscribeToNewsletter);
// Admin only (optional)
router.get("/getAllSubscribers", newsLetterController_1.getAllSubscribers);
router.delete("/:email", newsLetterController_1.deleteSubscriber);
exports.default = router;
