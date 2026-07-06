"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.sendEmail = void 0;
const Brevo = __importStar(require("@getbrevo/brevo"));
// Initialize the API instance
const apiInstance = new Brevo.TransactionalEmailsApi();
// Authenticate
apiInstance.apiKey = process.env.BREVO_API_KEY;
apiInstance.defaultHeaders = Object.assign(Object.assign({}, apiInstance.defaultHeaders), { "api-key": process.env.BREVO_API_KEY });
// TypeScript-friendly sendEmail function
const sendEmail = (to, subject, html) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        // Create the email object
        const sendSmtpEmail = {
            sender: {
                name: "Ethio Market",
                email: process.env.SMTP_USER,
            },
            to: [{ email: to }],
            subject,
            htmlContent: html,
        };
        // Send the email
        const response = yield apiInstance.sendTransacEmail(sendSmtpEmail);
        console.log("Email sent successfully! ID:", response.body.messageId);
    }
    catch (error) {
        // Handle errors safely
        console.error("Email sending failed:", ((_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.body) || error);
    }
});
exports.sendEmail = sendEmail;
