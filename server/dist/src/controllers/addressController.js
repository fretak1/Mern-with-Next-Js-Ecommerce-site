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
exports.deleteAddress = exports.updateAddress = exports.getAddress = exports.createAddress = void 0;
const server_1 = require("../server");
const createAddress = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        const { name, city, country, address, postalCode, phone, isDefault } = req.body;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: "Unauthenticated user",
            });
            return;
        }
        if (isDefault) {
            yield server_1.prisma.address.updateMany({
                where: { userId },
                data: {
                    isDefault: false,
                },
            });
        }
        const newlyCreatedAddress = yield server_1.prisma.address.create({
            data: {
                userId,
                name,
                address,
                city,
                country,
                phone,
                postalCode,
                isDefault: isDefault || false,
            },
        });
        res.status(201).json({
            success: true,
            address: newlyCreatedAddress,
        });
    }
    catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: "Some Error Occured",
        });
    }
});
exports.createAddress = createAddress;
const getAddress = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        const allAddress = yield server_1.prisma.address.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
        });
        res.status(201).json({
            success: true,
            address: allAddress,
        });
    }
    catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: "Some Error Occured",
        });
    }
});
exports.getAddress = getAddress;
const updateAddress = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        const { id } = req.params;
        const { name, city, country, address, postalCode, phone, isDefault } = req.body;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: "Unauthenticated user",
            });
            return;
        }
        const existingAddress = yield server_1.prisma.address.findFirst({
            where: { id, userId },
        });
        if (!existingAddress) {
            res.status(404).json({
                success: false,
                message: "Address Not Found",
            });
            return;
        }
        if (isDefault) {
            yield server_1.prisma.address.updateMany({
                where: { userId },
                data: {
                    isDefault: false,
                },
            });
        }
        const updatedAddress = yield server_1.prisma.address.update({
            where: { id, userId },
            data: {
                userId,
                name,
                address,
                city,
                country,
                phone,
                postalCode,
                isDefault: isDefault || false,
            },
        });
        res.status(200).json({
            success: true,
            address: updatedAddress,
        });
    }
    catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: "Some Error Occured",
        });
    }
});
exports.updateAddress = updateAddress;
const deleteAddress = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        const { id } = req.params;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: "Unauthenticated user",
            });
            return;
        }
        const existingAddress = yield server_1.prisma.address.findFirst({
            where: { id, userId },
        });
        if (!existingAddress) {
            res.status(404).json({
                success: false,
                message: "Address Not Found",
            });
            return;
        }
        yield server_1.prisma.address.delete({
            where: { id, userId },
        });
        res.status(201).json({
            success: true,
            message: "Address Deleted Successfully",
        });
    }
    catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: "Some Error Occured",
        });
    }
});
exports.deleteAddress = deleteAddress;
