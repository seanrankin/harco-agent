// mailparser ships no type declarations; we only use simpleParser.
declare module "mailparser" {
  export function simpleParser(input: Buffer | string): Promise<unknown>;
}
