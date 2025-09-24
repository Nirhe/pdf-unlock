// Minimal Node.js type declarations to satisfy the TypeScript compiler in offline environments.
interface Buffer extends Uint8Array {
  toString(encoding?: string): string
}

interface BufferConstructor {
  from(data: string, encoding?: string): Buffer
  from(array: ArrayLike<number> | ArrayBufferLike): Buffer
  concat(list: readonly Buffer[]): Buffer
  alloc(size: number, fill?: number | string | Buffer, encoding?: string): Buffer
}

declare const Buffer: BufferConstructor

declare namespace NodeJS {
  interface ErrnoException extends Error {
    code?: string
    errno?: number
    syscall?: string
    path?: string
  }

  interface WritableStream {
    write(chunk: any, encoding?: string, callback?: (error?: Error | null) => void): boolean
    end(chunk?: any, encoding?: string, callback?: () => void): void
  }
}

declare const process: {
  env: Record<string, string | undefined>
}

declare const __dirname: string

declare const require: NodeRequire

declare interface NodeRequire {
  (id: string): unknown
  resolve(id: string): string
  cache: Record<string, unknown>
  main: unknown
}

declare const console: {
  log: (...args: any[]) => void
  error: (...args: any[]) => void
  warn: (...args: any[]) => void
}
