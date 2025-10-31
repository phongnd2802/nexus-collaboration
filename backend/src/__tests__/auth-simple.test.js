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
const hash_1 = require("../utils/hash");
const pass_1 = require("../utils/pass");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
// Mock bcrypt
jest.mock('bcryptjs');
describe('Authentication Utilities', () => {
    const mockBcrypt = bcryptjs_1.default;
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe('Password Hashing', () => {
        it('should hash passwords with bcrypt', () => __awaiter(void 0, void 0, void 0, function* () {
            const password = 'TestPassword123!';
            const hashedPassword = 'hashed-password-123';
            mockBcrypt.hash.mockResolvedValue(hashedPassword);
            const result = yield (0, hash_1.hashPassword)(password);
            expect(mockBcrypt.hash).toHaveBeenCalledWith(password, 10);
            expect(result).toBe(hashedPassword);
        }));
        it('should verify passwords correctly', () => __awaiter(void 0, void 0, void 0, function* () {
            const plainPassword = 'TestPassword123!';
            const hashedPassword = 'hashed-password-123';
            mockBcrypt.compare.mockResolvedValue(true);
            const result = yield (0, hash_1.verifyPassword)(plainPassword, hashedPassword);
            expect(mockBcrypt.compare).toHaveBeenCalledWith(plainPassword, hashedPassword);
            expect(result).toBe(true);
        }));
    });
    describe('Password Validation', () => {
        it('should accept strong passwords', () => {
            const strongPasswords = [
                'Password123!',
                'MyStr0ng#Pass',
                'Test@1234',
                'ComplexP@ssw0rd',
            ];
            strongPasswords.forEach(password => {
                expect((0, pass_1.checkPassword)(password)).toBe(true);
            });
        });
        it('should reject weak passwords', () => {
            const weakPasswords = [
                'password', // no uppercase, numbers, special chars
                'PASSWORD', // no lowercase, numbers, special chars
                'Password', // no numbers, special chars
                'Password123', // no special chars
                'Pass1!', // too short
                '', // empty
            ];
            weakPasswords.forEach(password => {
                expect((0, pass_1.checkPassword)(password)).toBe(false);
            });
        });
        it('should require minimum 8 characters', () => {
            expect((0, pass_1.checkPassword)('P@ss1')).toBe(false);
            expect((0, pass_1.checkPassword)('P@ssw0rd')).toBe(true);
        });
        it('should require at least one uppercase letter', () => {
            expect((0, pass_1.checkPassword)('password123!')).toBe(false);
            expect((0, pass_1.checkPassword)('Password123!')).toBe(true);
        });
        it('should require at least one lowercase letter', () => {
            expect((0, pass_1.checkPassword)('PASSWORD123!')).toBe(false);
            expect((0, pass_1.checkPassword)('Password123!')).toBe(true);
        });
        it('should require at least one number', () => {
            expect((0, pass_1.checkPassword)('Password!')).toBe(false);
            expect((0, pass_1.checkPassword)('Password123!')).toBe(true);
        });
        it('should require at least one special character', () => {
            expect((0, pass_1.checkPassword)('Password123')).toBe(false);
            expect((0, pass_1.checkPassword)('Password123!')).toBe(true);
        });
    });
    describe('Integration Tests', () => {
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
