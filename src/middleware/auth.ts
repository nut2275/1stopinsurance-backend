import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
    user?: any;
}

export const verifyToken = (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.header("Authorization");
        if (!authHeader) return res.status(401).json({ message: "Access Denied" });

        const token = authHeader.replace("Bearer ", "");
        if (!token) return res.status(401).json({ message: "Invalid Token" });

        // ⚠️ อย่าลืมเช็ค .env ว่าใช้ key อะไร (ปกติคือ JWT_SECRET)
        const verified = jwt.verify(token, process.env.JWT_SECRET || "secret");
        
        // Attach user data to request
        (req as AuthRequest).user = verified;
        next();
    } catch (err) {
        res.status(401).json({ message: "Invalid Token" });
    }
};

export const isAgent = (req: Request, res: Response, next: NextFunction) => {
    // ปรับ Logic การเช็ค Role ให้ตรงกับ Database ของคุณ
    const user = (req as AuthRequest).user;
    if (user && (user.role === 'agent' || user.type === 'agent')) {
        next();
    } else {
        // ช่วง Dev ถ้ายังไม่ set role ใน DB ให้ comment บรรทัดล่างแล้วใส่ next() แทนได้
        res.status(403).json({ message: "Access Denied: Agent Only" });
    }
};

export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
    const user = (req as AuthRequest).user;
    if (user && user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: "Access Denied: Admin Only" });
    }
};