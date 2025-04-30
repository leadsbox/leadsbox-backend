import crypto from 'crypto';

export class CryptoUtils {
  private static algorithm = 'aes-256-cbc';

  static hashPassword(password: string): string {
    return crypto.createHash('sha512').update(password).digest('hex');
  }

  static randomHex(bytes = 16): string {
    return this.createRandomBytes(bytes);
  }  

  static generateUserKeyPair() {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
      },
    });

    const PUBLIC_KEY = publicKey.toString();
    const PRIVATE_KEY = privateKey.toString();

    return {
      PUBLIC_KEY,
      PRIVATE_KEY,
    };
  }

  static checkPassword(inputPassword: string, storedHash: string): boolean {
    const inputHash = this.hashPassword(inputPassword);
    return inputHash === storedHash;
  }

  static createRandomBytes(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  static encrypt(text: string, secret: string): string {
    const key = crypto.createHash('sha256').update(secret).digest();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return `${iv.toString('hex')}:${encrypted}`;
  }

  static decrypt(encryptedText: string, secret: string): string {
    const [ivHex, encrypted] = encryptedText.split(':');
    const key = crypto.createHash('sha256').update(secret).digest();
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(this.algorithm, key, iv);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}
