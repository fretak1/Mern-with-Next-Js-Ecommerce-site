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
exports.addProductReview = exports.getFilteredProducts = exports.deleteProduct = exports.getAllProducts = exports.updateProduct = exports.getProductById = exports.fetxhAllProductsForAdmin = exports.createProduct = void 0;
const cloudinary_1 = __importDefault(require("../config/cloudinary"));
const server_1 = require("../server");
const fs_1 = __importDefault(require("fs"));
const sendEmail_1 = require("../utils/sendEmail");
const createProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, brand, description, category, gender, sizes, colors, price, stock, brandCategory, productType, } = req.body;
        const files = req.files;
        // Upload images to Cloudinary
        const uploadResults = yield Promise.all(files.map((file) => cloudinary_1.default.uploader.upload(file.path, { folder: "ecommerce" })));
        const imageUrls = uploadResults.map((r) => r.secure_url);
        // Create product in DB
        const newlyCreatedProduct = yield server_1.prisma.product.create({
            data: {
                name,
                brand,
                brandCategory,
                description,
                category,
                gender,
                productType,
                sizes: sizes.split(","),
                colors: colors.split(","),
                price: parseFloat(price),
                stock: parseInt(stock),
                images: imageUrls,
                soldCount: 0,
                rating: 0,
            },
        });
        // Delete local files
        files.forEach((file) => fs_1.default.unlinkSync(file.path));
        // Fetch all subscribers
        const subscribers = yield server_1.prisma.newsletter.findMany();
        // Email content
        const subject = `New Product Added: ${name}`;
        const html = `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px; background-color: #f9f9f9;">
    <h2 style="color: #2c3e50; text-align: center;">✨ New Product Alert! ✨</h2>
    
    <div style="text-align: center; margin: 20px 0;">
      <img src="${imageUrls[0]}" alt="${name}" style="width: 100%; max-width: 300px; border-radius: 10px;"/>
    </div>

    <h3 style="color: #34495e; margin-bottom: 10px;">${name}</h3>
    <p style="color: #555; line-height: 1.5;">${description}</p>
    <p style="font-weight: bold; color: #27ae60; font-size: 18px;">Price: ${price} ETB</p>

    <div style="text-align: center; margin-top: 20px;">
      <a href="https://mern-with-next-js-stack-ecommerce-s.vercel.app/products/${newlyCreatedProduct.id}"
         style="display: inline-block; padding: 12px 25px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; transition: background-color 0.3s;">
        View Product
      </a>
    </div>

    <p style="text-align: center; color: #999; margin-top: 20px; font-size: 12px;">
      You are receiving this email because you subscribed to Ethio Market newsletter.
    </p>
  </div>
`;
        // Send emails individually in parallel
        yield Promise.all(subscribers.map((sub) => (0, sendEmail_1.sendEmail)(sub.email, subject, html)));
        res.status(201).json({
            success: true,
            message: "Product created and notification emails sent!",
            newlyCreatedProduct,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Something went wrong while creating the product.",
        });
    }
});
exports.createProduct = createProduct;
const fetxhAllProductsForAdmin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const allProducts = yield server_1.prisma.product.findMany();
        res.status(201).json({
            allProducts,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "some error occured!",
        });
    }
});
exports.fetxhAllProductsForAdmin = fetxhAllProductsForAdmin;
const getProductById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const product = yield server_1.prisma.product.findUnique({
            where: { id },
            include: {
                reviews: true,
            },
        });
        if (!product) {
            res.status(404).json({
                success: false,
                message: "Product Not Found",
            });
        }
        res.status(200).json({ product });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "some error occured!",
        });
    }
});
exports.getProductById = getProductById;
const updateProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { name, brand, description, category, gender, sizes, colors, price, stock, rating, brandCategory, productType, } = req.body;
        const updatedProduct = yield server_1.prisma.product.update({
            where: { id },
            data: {
                name,
                brand,
                description,
                category,
                brandCategory,
                productType,
                gender,
                sizes: sizes.split(","),
                colors: colors.split(","),
                price: parseFloat(price),
                stock: parseInt(stock),
                rating: parseInt(rating),
            },
        });
        res.status(200).json({ updatedProduct });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "some error occured!",
        });
    }
});
exports.updateProduct = updateProduct;
const getAllProducts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const products = yield server_1.prisma.product.findMany({
            orderBy: {
                createdAt: "desc", // newest first
            },
        });
        res.status(200).json({
            success: true,
            count: products.length,
            products,
        });
    }
    catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch products",
        });
    }
});
exports.getAllProducts = getAllProducts;
const deleteProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield server_1.prisma.product.delete({
            where: { id },
        });
        res.status(200).json({
            success: true,
            message: "Product Deleted Successfully",
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "some error occured!",
        });
    }
});
exports.deleteProduct = deleteProduct;
const getFilteredProducts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const categories = (req.query.categories || "")
            .split(",")
            .filter(Boolean);
        const brands = (req.query.brands || "")
            .split(",")
            .filter(Boolean);
        const sizes = (req.query.sizes || "")
            .split(",")
            .filter(Boolean);
        const colors = (req.query.colors || "")
            .split(",")
            .filter(Boolean);
        const search = req.query.search || "";
        const type = req.query.type || "";
        const minPrice = parseFloat(req.query.minPrice) || 0;
        const maxPrice = parseFloat(req.query.maxPrice) || Number.MAX_SAFE_INTEGER;
        const sortBy = req.query.sortBy || "createdAt";
        const sortOrder = req.query.sortOrder || "desc";
        const skip = (page - 1) * limit;
        // Build filters
        const andFilters = [];
        if (categories.length > 0) {
            andFilters.push({ category: { in: categories, mode: "insensitive" } });
        }
        if (brands.length > 0) {
            andFilters.push({ brand: { in: brands, mode: "insensitive" } });
        }
        if (sizes.length > 0) {
            andFilters.push({ sizes: { hasSome: sizes } });
        }
        if (colors.length > 0) {
            andFilters.push({ colors: { hasSome: colors } });
        }
        if (search) {
            andFilters.push({ name: { contains: search, mode: "insensitive" } });
        }
        if (type) {
            andFilters.push({ productType: { equals: type, mode: "insensitive" } });
        }
        andFilters.push({ price: { gte: minPrice, lte: maxPrice } });
        const where = { AND: andFilters };
        const [products, total] = yield Promise.all([
            server_1.prisma.product.findMany({
                where,
                skip,
                take: limit,
                orderBy: { [sortBy]: sortOrder },
            }),
            server_1.prisma.product.count({ where }),
        ]);
        res.status(200).json({
            success: true,
            products,
            currentPage: page,
            totalPage: Math.ceil(total / limit),
            totalProduct: total,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Some error occurred!" });
    }
});
exports.getFilteredProducts = getFilteredProducts;
const addProductReview = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { productId } = req.params;
        const { rating, comment } = req.body;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthenticated user" });
            return;
        }
        if (!rating) {
            res.status(400).json({ success: false, message: "Rating is required" });
            return;
        }
        // ✅ Check if this user already reviewed this product
        const existingReview = yield server_1.prisma.review.findUnique({
            where: { user_product_unique: { userId, productId } },
        });
        if (existingReview) {
            // ✅ Update existing review
            yield server_1.prisma.review.update({
                where: { user_product_unique: { userId, productId } },
                data: { rating: parseInt(rating), comment },
            });
        }
        else {
            // ✅ Create new review
            yield server_1.prisma.review.create({
                data: {
                    userId,
                    productId,
                    rating: parseInt(rating),
                    comment,
                },
            });
        }
        // ✅ Recalculate product average rating
        const reviews = yield server_1.prisma.review.findMany({
            where: { productId },
            select: { rating: true },
        });
        const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
        yield server_1.prisma.product.update({
            where: { id: productId },
            data: { rating: avgRating },
        });
        res.status(201).json({
            success: true,
            message: existingReview
                ? "Review updated successfully"
                : "Review added successfully",
            averageRating: avgRating,
        });
    }
    catch (error) {
        console.error("Error adding review:", error);
        if (error.code === "P2002") {
            // Prisma duplicate unique key error fallback
            res.status(400).json({
                success: false,
                message: "You already reviewed this product.",
            });
        }
        else {
            res
                .status(500)
                .json({ success: false, message: "Failed to add or update review" });
        }
    }
});
exports.addProductReview = addProductReview;
