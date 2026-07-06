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
exports.fetchFeatureBanners = exports.addFeatureBanners = void 0;
const cloudinary_1 = __importDefault(require("../config/cloudinary"));
const server_1 = require("../server");
const fs_1 = __importDefault(require("fs"));
const addFeatureBanners = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const files = req.files;
        if (!files || files.length === 0) {
            res.status(404).json({
                success: false,
                message: "No Files Found",
            });
        }
        const uploadpromises = files.map((file) => cloudinary_1.default.uploader.upload(file.path, {
            folder: "ecommerce-feature-banners",
        }));
        const uploadResults = yield Promise.all(uploadpromises);
        const banners = yield Promise.all(uploadResults.map((res) => server_1.prisma.featureBanner.create({
            data: {
                imageUrl: res.secure_url,
            },
        })));
        files.forEach((file) => fs_1.default.unlinkSync(file.path));
        res.status(201).json({
            success: true,
            banners,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Failed to Add FeatureBanners",
        });
    }
});
exports.addFeatureBanners = addFeatureBanners;
const fetchFeatureBanners = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const banners = yield server_1.prisma.featureBanner.findMany({
            orderBy: { createdAt: "desc" },
        });
        res.status(201).json({
            success: true,
            banners,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch FeatureBanners",
        });
    }
});
exports.fetchFeatureBanners = fetchFeatureBanners;
