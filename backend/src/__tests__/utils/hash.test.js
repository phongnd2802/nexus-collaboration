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
const hash_1 = require("../../utils/hash");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
// Mock bcrypt
jest.mock('bcryptjs');
describe('Hash Utilities', () => {
    const mockBcrypt = bcryptjs_1.default;
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe('hashPassword', () => {
        it('should hash a password with correct salt rounds', () => __awaiter(void 0, void 0, void 0, function* () {
            const password = 'Password123!';
            const hashedPassword = 'hashed-password-123';
            mockBcrypt.hash.mockResolvedValue(hashedPassword);
            const result = yield (0, hash_1.hashPassword)(password);
            expect(mockBcrypt.hash).toHaveBeenCalledWith(password, 10);
            expect(result).toBe(hashedPassword);
        }));
        it('should handle empty password', () => __awaiter(void 0, void 0, void 0, function* () {
            const password = '';
            const hashedPassword = 'hashed-empty-password';
            mockBcrypt.hash.mockResolvedValue(hashedPassword);
            const result = yield (0, hash_1.hashPassword)(password);
            expect(mockBcrypt.hash).toHaveBeenCalledWith(password, 10);
            expect(result).toBe(hashedPassword);
        }));
        it('should handle special characters in password', () => __awaiter(void 0, void 0, void 0, function* () {
            const password = 'P@ssw0rd!@#$%^&*()';
            const hashedPassword = 'hashed-special-password';
            mockBcrypt.hash.mockResolvedValue(hashedPassword);
            const result = yield (0, hash_1.hashPassword)(password);
            expect(mockBcrypt.hash).toHaveBeenCalledWith(password, 10);
            expect(result).toBe(hashedPassword);
        }));
    });
    describe('verifyPassword', () => {
        it('should verify correct password', () => __awaiter(void 0, void 0, void 0, function* () {
            const plainPassword = 'Password123!';
            const hashedPassword = 'hashed-password-123';
            mockBcrypt.compare.mockResolvedValue(true);
            const result = yield (0, hash_1.verifyPassword)(plainPassword, hashedPassword);
            expect(mockBcrypt.compare).toHaveBeenCalledWith(plainPassword, hashedPassword);
            expect(result).toBe(true);
        }));
        it('should reject incorrect password', () => __awaiter(void 0, void 0, void 0, function* () {
            const plainPassword = 'WrongPassword123!';
            const hashedPassword = 'hashed-password-123';
            mockBcrypt.compare.mockResolvedValue(false);
            const result = yield (0, hash_1.verifyPassword)(plainPassword, hashedPassword);
            expect(mockBcrypt.compare).toHaveBeenCalledWith(plainPassword, hashedPassword);
            expect(result).toBe(false);
        }));
        it('should handle empty password verification', () => __awaiter(void 0, void 0, void 0, function* () {
            const plainPassword = '';
            const hashedPassword = 'hashed-password-123';
            mockBcrypt.compare.mockResolvedValue(false);
            const result = yield (0, hash_1.verifyPassword)(plainPassword, hashedPassword);
            expect(mockBcrypt.compare).toHaveBeenCalledWith(plainPassword, hashedPassword);
            expect(result).toBe(false);
        }));
        it('should handle null/undefined hashed password', () => __awaiter(void 0, void 0, void 0, function* () {
            const plainPassword = 'Password123!';
            const hashedPassword = null;
            mockBcrypt.compare.mockResolvedValue(false);
            const result = yield (0, hash_1.verifyPassword)(plainPassword, hashedPassword);
            expect(mockBcrypt.compare).toHaveBeenCalledWith(plainPassword, hashedPassword);
            expect(result).toBe(false);
        }));
    });
    describe('Integration tests', () => {
        it('should hash and verify password correctly', () => __awaiter(void 0, void 0, void 0, function* () {
            const password = 'TestPassword123!';
            const hashedPassword = 'hashed-test-password';
            // Mock hash to return a specific value
            mockBcrypt.hash.mockResolvedValue(hashedPassword);
            // Mock compare to return true when comparing the same password
            mockBcrypt.compare.mockImplementation((plain, hashed) => {
                return Promise.resolve(plain === password && hashed === hashedPassword);
            });
            const hashResult = yield (0, hash_1.hashPassword)(password);
            const verifyResult = yield (0, hash_1.verifyPassword)(password, hashResult);
            expect(hashResult).toBe(hashedPassword);
            expect(verifyResult).toBe(true);
        }));
        it('should reject verification with different password', () => __awaiter(void 0, void 0, void 0, function* () {
            const originalPassword = 'OriginalPassword123!';
            const differentPassword = 'DifferentPassword123!';
            const hashedPassword = 'hashed-original-password';
            mockBcrypt.hash.mockResolvedValue(hashedPassword);
            mockBcrypt.compare.mockImplementation((plain, hashed) => {
                return Promise.resolve(plain === originalPassword && hashed === hashedPassword);
            });
            const hashResult = yield (0, hash_1.hashPassword)(originalPassword);
            const verifyResult = yield (0, hash_1.verifyPassword)(differentPassword, hashResult);
            expect(hashResult).toBe(hashedPassword);
            expect(verifyResult).toBe(false);
        }));
    });
});
