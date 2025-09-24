// Minimal module declarations for external dependencies used in the project.

declare module 'express' {
  export type Request = any
  export type Response = any
  export type NextFunction = any

  export type RequestHandler = (req: Request, res: Response, next?: NextFunction) => any

  export interface Router {
    use: (...handlers: any[]) => Router
    get: (path: any, ...handlers: RequestHandler[]) => Router
    post: (path: any, ...handlers: RequestHandler[]) => Router
  }

  export const Router: () => Router

  export interface ExpressApp extends Router {
    listen: (...args: any[]) => any
    json: (...args: any[]) => any
    use: (...handlers: any[]) => ExpressApp
    get: (path: any, ...handlers: RequestHandler[]) => ExpressApp
    post: (path: any, ...handlers: RequestHandler[]) => ExpressApp
  }

  export interface ExpressModule {
    (): ExpressApp
    Router: () => Router
    json: (...args: any[]) => any
  }

  const express: ExpressModule
  export default express
}

declare module 'cors' {
  const cors: (...args: any[]) => any
  export default cors
}

declare module 'morgan' {
  const morgan: (...args: any[]) => any
  export default morgan
}

declare module 'swagger-ui-express' {
  const swaggerUi: any
  export default swaggerUi
  export const serve: any
  export const setup: any
}

declare module 'dotenv' {
  const dotenv: { config: () => void }
  export default dotenv
}

declare module 'fs' {
  export const promises: {
    readFile: (path: string | Buffer, options?: any) => Promise<Buffer>
    writeFile: (path: string | Buffer, data: any, options?: any) => Promise<void>
    access: (path: string | Buffer) => Promise<void>
    copyFile: (src: string, dest: string) => Promise<void>
    unlink: (path: string) => Promise<void>
  }
}

declare module 'fs/promises' {
  export const readFile: (path: string | Buffer, options?: any) => Promise<Buffer>
  export const writeFile: (path: string | Buffer, data: any, options?: any) => Promise<void>
  export const access: (path: string | Buffer) => Promise<void>
  export const copyFile: (src: string, dest: string) => Promise<void>
  export const unlink: (path: string) => Promise<void>
}

declare module 'os' {
  export function tmpdir(): string
}

declare module 'path' {
  export function extname(path: string): string
  export function basename(path: string, ext?: string): string
  export function join(...paths: string[]): string
}

declare module 'pdf-lib' {
  export class PDFDocument {
    static create(): Promise<PDFDocument>
    static load(data: Uint8Array, options?: any): Promise<PDFDocument>
    addPage(size?: [number, number]): void
    save(options?: any): Promise<Uint8Array>
    getPageCount(): number
  }
}

declare module 'nodemailer' {
  const nodemailer: any
  export default nodemailer
}

declare module 'pdfkit' {
  const PDFDocument: any
  export default PDFDocument
}

declare module 'swagger-jsdoc' {
  const swaggerJsdoc: any
  export default swaggerJsdoc
}
