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
exports.sendComment = void 0;
const axios_1 = __importDefault(require("axios"));
const sendComment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, email, message } = req.body;
    if (!name || !email || !message) {
        res.status(400).json({ success: false, message: "All fields required." });
        return;
    }
    try {
        const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbwgC_CcWTb1pUOtJ-ZdaBGMiKTA6jXD1SmjjOZr1RzSaU62UPZCOWhZJ_wIFhyPJWGb/exec";
        const response = yield axios_1.default.post(GOOGLE_SHEET_URL, { name, email, message });
        if (response.data.result === "success") {
            res.status(200).json({ success: true, message: "Comment saved to Google Sheet!" });
        }
        else {
            res.status(500).json({ success: false, message: "Failed to save comment." });
        }
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Error sending comment." });
    }
});
exports.sendComment = sendComment;
