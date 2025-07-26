// Jest mock type declarations to help with TypeScript compilation
declare global {
  namespace jest {
    interface Mock<T = unknown, Y extends unknown[] = unknown> {
      mockResolvedValue(value: T): Mock<Promise<T>, Y>;
      mockResolvedValueOnce(value: T): Mock<Promise<T>, Y>;
      mockReturnValue(value: T): Mock<T, Y>;
      mockReturnValueOnce(value: T): Mock<T, Y>;
      mockImplementation(fn: (...args: Y) => T): Mock<T, Y>;
      mockImplementationOnce(fn: (...args: Y) => T): Mock<T, Y>;
    }
  }
}

export {}; 