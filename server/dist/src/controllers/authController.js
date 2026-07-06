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
exports.checkAccess = exports.logout = exports.refereshAccessToken = exports.login = exports.register = exports.resetPassword = exports.verifyResetCode = exports.forgotPassword = void 0;
const server_1 = require("../server");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const uuid_1 = require("uuid");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const sendEmail_1 = require("../utils/sendEmail");
const RESET_CODE_TTL_MINUTES = 15;
function gen6DigitCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}
const forgotPassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email } = req.body;
        if (!email) {
            res.status(400).json({ success: false, message: "Email is required" });
            return;
        }
        const user = yield server_1.prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(200).json({
                success: true,
                message: "If the email exists, a code was sent.",
            });
        }
        const code = gen6DigitCode();
        const expires = new Date(Date.now() + RESET_CODE_TTL_MINUTES * 60 * 1000);
        yield server_1.prisma.user.update({
            where: { email },
            data: { resetCode: code, resetCodeExpires: expires },
        });
        const subject = "Your EthioMarket password reset code";
        const html = `
      <div style="font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial;line-height:1.4;color:#111">
        <h2>Reset your EthioMarket password</h2>
        <p>We received a request to reset the password for <strong>${email}</strong>.</p>
        <p style="font-size:22px;font-weight:700;margin:18px 0;padding:12px 18px;background:#f3f4f6;border-radius:8px;display:inline-block">
          ${code}
        </p>
        <p>This code will expire in ${RESET_CODE_TTL_MINUTES} minutes.</p>
        <p>If you didn't request this, you can ignore this email.</p>
        <p style="margin-top:16px"><a href="${process.env.CLIENT_URL || ""}" style="background:#3b82f6;color:white;padding:10px 14px;border-radius:6px;text-decoration:none">Visit EthioMarket</a></p>
      </div>
    `;
        yield (0, sendEmail_1.sendEmail)(email, subject, html);
        res.status(200).json({
            success: true,
            message: "If the email exists, a code was sent.",
        });
    }
    catch (err) {
        console.error("forgotPassword error", err);
        res
            .status(500)
            .json({ success: false, message: "Failed to send reset code" });
    }
});
exports.forgotPassword = forgotPassword;
const verifyResetCode = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, code } = req.body;
        if (!email || !code) {
            res
                .status(400)
                .json({ success: false, message: "Email and code are required" });
            return;
        }
        const user = yield server_1.prisma.user.findUnique({ where: { email } });
        if (!user || !user.resetCode || !user.resetCodeExpires) {
            res
                .status(400)
                .json({ success: false, message: "Invalid code or email" });
            return;
        }
        if (user.resetCode !== code) {
            res.status(400).json({ success: false, message: "Invalid code" });
            return;
        }
        if (new Date() > user.resetCodeExpires) {
            res.status(400).json({ success: false, message: "Code expired" });
            return;
        }
        res.status(200).json({ success: true, message: "Code verified" });
    }
    catch (err) {
        console.error("verifyResetCode error", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
});
exports.verifyResetCode = verifyResetCode;
const resetPassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, newPassword } = req.body;
        if (!email || !newPassword) {
            res.status(400).json({ success: false, message: "Missing fields" });
            return;
        }
        const user = yield server_1.prisma.user.findUnique({ where: { email } });
        if (!user) {
            res.status(404).json({ success: false, message: "User not found" });
            return;
        }
        const hashed = yield bcryptjs_1.default.hash(newPassword, 12);
        yield server_1.prisma.user.update({
            where: { email },
            data: {
                password: hashed,
                resetCode: null,
                resetCodeExpires: null,
                refreshToken: null,
            },
        });
        res
            .status(200)
            .json({ success: true, message: "Password reset successful" });
    }
    catch (err) {
        console.error("resetPassword error", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
});
exports.resetPassword = resetPassword;
function generateToken(userId, email, role) {
    const accessToken = jsonwebtoken_1.default.sign({
        userId,
        email,
        role,
    }, process.env.JWT_SECRET, { expiresIn: "60m" });
    const refreshToken = (0, uuid_1.v4)();
    return { accessToken, refreshToken };
}
function setTokens(res, accessToken, refreshToken, userId) {
    return __awaiter(this, void 0, void 0, function* () {
        res.cookie("accessToken", accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "none",
            path: "/",
            maxAge: 60 * 60 * 1000,
        });
        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "none",
            path: "/",
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        if (userId) {
            yield server_1.prisma.user.update({
                where: { id: userId },
                data: { refreshToken },
            });
        }
    });
}
const register = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, email, password } = req.body;
        const existingUser = yield server_1.prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            res.status(400).json({
                success: false,
                error: "user with this email allready exists",
            });
        }
        const hashedPassword = yield bcryptjs_1.default.hash(password, 12);
        const user = yield server_1.prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: "USER",
            },
        });
        res.status(201).json({
            success: true,
            message: "user registered successfully",
            userId: user.id,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Registration Failed",
        });
    }
});
exports.register = register;
const login = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password } = req.body;
        const extractCurrentUser = yield server_1.prisma.user.findUnique({
            where: { email },
        });
        if (!extractCurrentUser ||
            !(yield bcryptjs_1.default.compare(password, extractCurrentUser.password))) {
            res.status(401).json({
                success: false,
                error: "Invalid Credintials",
            });
            return;
        }
        const { accessToken, refreshToken } = generateToken(extractCurrentUser.id, extractCurrentUser.email, extractCurrentUser.role);
        yield setTokens(res, accessToken, refreshToken, extractCurrentUser.id);
        res.status(200).json({
            success: true,
            message: "Logged In Successfully",
            user: {
                id: extractCurrentUser.id,
                name: extractCurrentUser.name,
                email: extractCurrentUser.email,
                role: extractCurrentUser.role,
            },
            accessToken,
            refreshToken,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Login Failed",
        });
    }
});
exports.login = login;
const refereshAccessToken = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
        res.status(401).json({ success: false, error: "No refresh token" });
        return;
    }
    try {
        const user = yield server_1.prisma.user.findFirst({ where: { refreshToken } });
        if (!user) {
            res.status(401).json({ success: false, error: "Invalid refresh token" });
            return;
        }
        const { accessToken, refreshToken: newRefreshToken } = generateToken(user.id, user.email, user.role);
        yield setTokens(res, accessToken, newRefreshToken, user.id);
        res.status(200).json({
            success: true,
            accessToken,
            refreshToken: newRefreshToken,
            message: "Token refreshed successfully",
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: "Refresh token error" });
    }
});
exports.refereshAccessToken = refereshAccessToken;
const logout = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");
    res.status(200).json({
        success: true,
        message: "user logged out successfully",
    });
});
exports.logout = logout;
const checkAccess = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const accessToken = (_a = req.cookies) === null || _a === void 0 ? void 0 : _a.accessToken;
        console.log(accessToken);
        if (!accessToken) {
            res.status(401).json({ success: false, error: "No access token" });
            return;
        }
        let payload;
        try {
            payload = jsonwebtoken_1.default.verify(accessToken, process.env.JWT_SECRET);
        }
        catch (err) {
            res.status(401).json({ success: false, error: "Invalid token" });
            return;
        }
        const user = yield server_1.prisma.user.findUnique({
            where: { id: payload.userId },
            select: { id: true, name: true, email: true, role: true },
        });
        if (!user) {
            res.status(401).json({ success: false, error: "User not found" });
            return;
        }
        res.status(200).json({ success: true, user });
    }
    catch (error) {
        console.error("me error", error);
        res.status(500).json({ success: false, error: "Server error" });
    }
});
exports.checkAccess = checkAccess;
