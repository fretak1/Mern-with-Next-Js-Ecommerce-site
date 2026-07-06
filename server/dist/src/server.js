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
exports.prisma = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const client_1 = require("@prisma/client");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const productRoutes_1 = __importDefault(require("./routes/productRoutes"));
const couponRoutes_1 = __importDefault(require("./routes/couponRoutes"));
const settingRoutes_1 = __importDefault(require("./routes/settingRoutes"));
const cartRoutes_1 = __importDefault(require("./routes/cartRoutes"));
const AddressRoutes_1 = __importDefault(require("./routes/AddressRoutes"));
const orderRoutes_1 = __importDefault(require("./routes/orderRoutes"));
const messageRoutes_1 = __importDefault(require("./routes/messageRoutes"));
const newsLetterRoutes_1 = __importDefault(require("./routes/newsLetterRoutes"));
const paymentRoutes_1 = __importDefault(require("./routes/paymentRoutes"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
console.log("CLOUDINARY_NAME:", process.env.CLOUDINARY_NAME);
console.log("CLOUDINARY_API_KEY:", process.env.CLOUDINARY_API_KEY);
console.log("CLOUDINARY_API_SECRET:", process.env.CLOUDINARY_API_SECRET ? "LOADED" : "NOT LOADED");
const corsOptions = {
    origin: [
        "https://mern-with-next-js-stack-ecommerce-s.vercel.app",
        "http://localhost:3000"
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
};
app.use((0, cors_1.default)(corsOptions));
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
exports.prisma = new client_1.PrismaClient();
app.use("/api/auth", authRoutes_1.default);
app.use("/api/products", productRoutes_1.default);
app.use("/api/coupon", couponRoutes_1.default);
app.use("/api/settings", settingRoutes_1.default);
app.use("/api/cart", cartRoutes_1.default);
app.use("/api/address", AddressRoutes_1.default);
app.use("/api/order", orderRoutes_1.default);
app.use("/api/messages", messageRoutes_1.default);
app.use("/api/newsletter", newsLetterRoutes_1.default);
app.use("/api/payment", paymentRoutes_1.default);
app.get("/", (req, res) => {
    res.send("Hello from E-Commerce backend");
});
app.listen(PORT, () => {
    console.log(`Server is now running on port ${PORT}`);
});
process.on("SIGINT", () => __awaiter(void 0, void 0, void 0, function* () {
    yield exports.prisma.$disconnect();
    process.exit();
}));
