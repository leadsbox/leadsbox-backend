import jwt from "jsonwebtoken";
import { TokenPayload } from "../types";

class Tools {
  private JWT_SECRET: string;

  constructor() {
    this.JWT_SECRET = process.env.JWT_SECRET as string;
    if (!this.JWT_SECRET) {
      throw new Error("JWT_SECRET is not defined in environment variables");
    }
  }

  public async createToken(payload: object): Promise<string> {
    return jwt.sign(payload, this.JWT_SECRET, { expiresIn: "30d" });
  }

  public decodeToken(token: string): object | null {
    try {
      return jwt.decode(token) as object;
    } catch (err) {
      return null;
    }
  }

  public encrypt(data: string, secret: string): string {
    const crypto = require("crypto");
    const cipher = crypto.createCipher("aes-256-cbc", secret);
    let encrypted = cipher.update(data, "utf8", "hex");
    encrypted += cipher.final("hex");
    return encrypted;
  }

  public decrypt(encryptedData: string, secret: string): string {
    const crypto = require("crypto");
    const decipher = crypto.createDecipher("aes-256-cbc", secret);
    let decrypted = decipher.update(encryptedData, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  }

  public async verifyToken(token: string): Promise<TokenPayload | null> {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
      return decoded as TokenPayload;
    } catch (error) {
      return null;
    }
  }
}

export const Toolbox = new Tools();
