import axios from "axios";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import { NextFunction, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "../server";
import type { Prisma } from "@prisma/client";
const CHAPA_SECRET_KEY = process.env.CHAPA_SECRET_KEY;
const CHAPA_API_URL = "https://api.chapa.co/v1/transaction/verify";

export const createChapaOrder = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { userId, addressId, items, couponId, total, txRef, paymentMethod } =
      req.body;

    if (!txRef || paymentMethod !== "CHAPA") {
      return res.status(400).json({
        success: false,
        message: "Invalid request data for Chapa order initialization.",
      });
    }

    const existing = await prisma.order.findFirst({ where: { txRef } });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Transaction reference already in use.",
      });
    }

    const order = await prisma.order.create({
      data: {
        userId,
        addressId,
        total,
        couponId,
        paymentMethod,
        paymentStatus: "PENDING",
        txRef: txRef,
        items: {
          createMany: {
            data: items.map((item: any) => ({
              productId: item.productId,
              productName: item.productName,
              productCategory: item.productCategory,
              quantity: item.quantity,
              price: item.price,
              size: item.size,
              color: item.color,
            })),
          },
        },
        status: "PENDING",
      },
      include: { items: true },
    });

    return res.status(201).json(order);
  } catch (err: any) {
    console.error("createChapaOrder error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to create PENDING order on server.",
      error: err.message,
    });
  }
};

export const finalizeChapaOrder = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const { txRef } = req.params;
  if (!txRef) {
    return res.status(400).json({
      success: false,
      message: "Missing transaction reference.",
    });
  }

  if (!CHAPA_SECRET_KEY) {
    return res.status(500).json({
      success: false,
      message: "Server misconfiguration: CHAPA_SECRET_KEY missing.",
    });
  }

  try {
    const existingOrder = await prisma.order.findFirst({
      where: { txRef: txRef, paymentStatus: "PENDING" },
    });

    if (!existingOrder) {
      const completedOrder = await prisma.order.findFirst({
        where: { txRef, paymentStatus: "COMPLETED" },
      });
      if (completedOrder) {
        return res.status(200).json({
          success: true,
          order: completedOrder,
          message: "Order already finalized.",
        });
      }

      return res.status(404).json({
        success: false,
        message: "Pending order not found.",
      });
    }

    const verificationResponse = await axios.get(`${CHAPA_API_URL}/${txRef}`, {
      headers: {
        Authorization: `Bearer ${CHAPA_SECRET_KEY}`,
      },
    });

    const chapaData = verificationResponse.data.data;
    if (
      verificationResponse.data.status !== "success" ||
      chapaData.status !== "success"
    ) {
      await prisma.order.update({
        where: { id: existingOrder.id },
        data: { paymentStatus: "FAILED", status: "PENDING" },
      });
      return res.status(400).json({
        success: false,
        message: "Chapa verification failed or payment was unsuccessful.",
      });
    }

    if (existingOrder.total !== chapaData.amount) {
      console.warn(
        `[FRAUD] Amount mismatch for txRef: ${txRef}. Order total: ${existingOrder.total}, Paid: ${chapaData.amount}`
      );
      await prisma.order.update({
        where: { id: existingOrder.id },
        data: { paymentStatus: "FAILED", status: "PENDING" },
      });

      return res.status(403).json({
        success: false,
        message: "Amount paid does not match order total. Payment rejected.",
      });
    }
    const finalizedOrder = await prisma.order.update({
      where: { id: existingOrder.id },
      data: {
        paymentStatus: "COMPLETED",
        status: "PENDING",
        paymentId: chapaData.id,
      },
      include: { items: true },
    });

    return res.status(200).json({
      success: true,
      order: finalizedOrder,
      message: "Order finalized successfully.",
    });
  } catch (err: any) {
    console.error("finalizeChapaOrder error:", err);
    try {
      await prisma.order.updateMany({
        where: { txRef, paymentStatus: "PENDING" },
        data: { paymentStatus: "FAILED", status: "PENDING" },
      });
    } catch (e) {}

    return res.status(500).json({
      success: false,
      message: "Error finalizing order during Chapa API call.",
      error: err.message,
    });
  }
};

export const createOrder = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { items, addressId, couponId, total, paymentId } = req.body;

    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Unauthenticated user",
      });

      console.log("Unauthenticated user", userId);

      return;
    }

    const order = await prisma.$transaction(async (prisma: Prisma.TransactionClient) => {
      const newOrder = await prisma.order.create({
        data: {
          userId,
          addressId,
          couponId,
          total,
          paymentMethod: "CHAPA",
          paymentStatus: "COMPLETED",
          paymentId,
          items: {
            create: items.map((item: any) => ({
              productId: item.productId,
              productName: item.productName,
              productCategory: item.productCategory,
              quantity: item.quantity,
              size: item.size,
              color: item.color,
              price: item.price,
            })),
          },
        },
        include: {
          items: true,
        },
      });

      for (const item of items) {
        await prisma.product.update({
          where: { id: item.productId },
          data: {
            stock: { decrement: item.quantity },
            soldCount: { increment: item.quantity },
          },
        });
      }

      await prisma.cartItem.deleteMany({
        where: {
          cart: { userId },
        },
      });

      await prisma.cart.delete({
        where: { userId },
      });

      if (couponId) {
        await prisma.coupon.update({
          where: { id: couponId },
          data: {
            usageCount: { increment: 1 },
          },
        });
      }

      return newOrder;
    });

    res.status(201).json(order);
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Unexpected Error Occured!",
    });
  }
};

export const getOrder = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { orderId } = req.params;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Unauthenticated user",
      });

      return;
    }

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId,
      },
      include: {
        items: true,
        address: true,
        coupon: true,
      },
    });

    res.status(201).json(order);
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Unexpected Error Occured!",
    });
  }
};

export const updateOrderStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { orderId } = req.params;
    const { status } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Unauthenticated user",
      });

      return;
    }

    const updateOrder = await prisma.order.updateMany({
      where: {
        id: orderId,
      },
      data: {
        status,
      },
    });

    res.status(200).json({
      success: true,
      message: "Order Status update successfully",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Unexpected Error Occured!",
    });
  }
};

export const getAllOrdersForAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Unauthenticated user",
      });

      return;
    }

    const orders = await prisma.order.findMany({
      include: {
        items: true,
        address: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    console.log(orders);
    res.status(200).json(orders);
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Unexpected Error Occured!",
    });
  }
};

export const getOrdersByUserId = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Unauthenticated user",
      });

      return;
    }

    const orders = await prisma.order.findMany({
      where: {
        userId: userId,
      },
      include: {
        items: true,
        address: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.status(200).json(orders);
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Unexpected Error Occured!",
    });
  }
};

