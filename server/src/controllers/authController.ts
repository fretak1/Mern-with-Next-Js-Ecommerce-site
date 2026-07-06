import { Request, Response } from "express";
import { prisma } from "../server";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";
import { sendEmail } from "../utils/sendEmail";

const RESET_CODE_TTL_MINUTES = 15;

function gen6DigitCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ success: false, message: "Email is required" });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(200).json({
        success: true,
        message: "If the email exists, a code was sent.",
      });
    }

    const code = gen6DigitCode();
    const expires = new Date(Date.now() + RESET_CODE_TTL_MINUTES * 60 * 1000);

    await prisma.user.update({
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
        <p style="margin-top:16px"><a href="${
          process.env.CLIENT_URL || ""
        }" style="background:#3b82f6;color:white;padding:10px 14px;border-radius:6px;text-decoration:none">Visit EthioMarket</a></p>
      </div>
    `;

    await sendEmail(email, subject, html);

    res.status(200).json({
      success: true,
      message: "If the email exists, a code was sent.",
    });
  } catch (err) {
    console.error("forgotPassword error", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to send reset code" });
  }
};

export const verifyResetCode = async (req: Request, res: Response) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      res
        .status(400)
        .json({ success: false, message: "Email and code are required" });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
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
  } catch (err) {
    console.error("verifyResetCode error", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      res.status(400).json({ success: false, message: "Missing fields" });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    const hashed = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
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
  } catch (err) {
    console.error("resetPassword error", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

function generateToken(userId: string, email: string, role: string) {
  const accessToken = jwt.sign(
    {
      userId,
      email,
      role,
    },
    process.env.JWT_SECRET!,
    { expiresIn: "60m" }
  );

  const refreshToken = uuidv4();
  return { accessToken, refreshToken };
}

async function setTokens(
  res: Response,
  accessToken: string,
  refreshToken: string,
  userId?: string
) {
  const isProd = process.env.NODE_ENV === "production";

  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/",
    maxAge: 60 * 60 * 1000,
  });

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  if (userId) {
    await prisma.user.update({
      where: { id: userId },
      data: { refreshToken },
    });
  }
}

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log("register called");
    const { name, email, password } = req.body;
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(400).json({
        success: false,
        error: "user with this email allready exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
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
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Registration Failed",
    });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    const extractCurrentUser = await prisma.user.findUnique({
      where: { email },
    });

    if (
      !extractCurrentUser ||
      !(await bcrypt.compare(password, extractCurrentUser.password))
    ) {
      res.status(401).json({
        success: false,
        error: "Invalid Credintials",
      });

      return;
    }

    const { accessToken, refreshToken } = generateToken(
      extractCurrentUser.id,
      extractCurrentUser.email,
      extractCurrentUser.role
    );

    await setTokens(res, accessToken, refreshToken, extractCurrentUser.id);

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
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Login Failed",
    });
  }
};

export const refereshAccessToken = async (
  req: Request,
  res: Response
): Promise<void> => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) {
    res.status(401).json({ success: false, error: "No refresh token" });
    return;
  }

  try {
    const user = await prisma.user.findFirst({ where: { refreshToken } });
    if (!user) {
      res.status(401).json({ success: false, error: "Invalid refresh token" });
      return;
    }

    const { accessToken, refreshToken: newRefreshToken } = generateToken(
      user.id,
      user.email,
      user.role
    );
    await setTokens(res, accessToken, newRefreshToken, user.id);

    res.status(200).json({
      success: true,
      accessToken,
      refreshToken: newRefreshToken,
      message: "Token refreshed successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Refresh token error" });
  }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  res.clearCookie("accessToken");
  res.clearCookie("refreshToken");

  res.status(200).json({
    success: true,
    message: "user logged out successfully",
  });
};

export const checkAccess = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const accessToken = req.cookies?.accessToken;
    console.log(accessToken);
    if (!accessToken) {
      res.status(401).json({ success: false, error: "No access token" });
      return;
    }

    let payload: any;
    try {
      payload = jwt.verify(accessToken, process.env.JWT_SECRET as string);
    } catch (err) {
      res.status(401).json({ success: false, error: "Invalid token" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!user) {
      res.status(401).json({ success: false, error: "User not found" });
      return;
    }

    res.status(200).json({ success: true, user });
  } catch (error) {
    console.error("me error", error);
    res.status(500).json({ success: false, error: "Server error" });
  }
};
