declare module 'word-extractor' {
  interface Document {
    getBody(): string
    getHeaders(options?: { includeFooters?: boolean }): string
    getFooters(): string
    getFootnotes(): string
  }

  class WordExtractor {
    extract(input: string | Buffer): Promise<Document>
  }

  export default WordExtractor
}
