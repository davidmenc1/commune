/**
 * File Upload Fixtures
 * 
 * Provides sample files and utilities for testing file upload functionality.
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Create a temporary test file
 */
export function createTestFile(filename: string, content: string | Buffer): string {
  const tmpDir = path.join(process.cwd(), 'e2e', '.tmp');
  
  // Ensure tmp directory exists
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }
  
  const filePath = path.join(tmpDir, filename);
  fs.writeFileSync(filePath, content);
  
  return filePath;
}

/**
 * Create a test image file (1x1 pixel PNG)
 */
export function createTestImage(filename: string = 'test-image.png'): string {
  // Minimal 1x1 transparent PNG
  const pngData = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
    0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
    0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82
  ]);
  
  return createTestFile(filename, pngData);
}

/**
 * Create a test text file
 */
export function createTestTextFile(filename: string = 'test-document.txt'): string {
  const content = 'This is a test document for E2E testing.\n\nIt contains multiple lines of text.';
  return createTestFile(filename, content);
}

/**
 * Create a test PDF file (minimal valid PDF)
 */
export function createTestPDF(filename: string = 'test-document.pdf'): string {
  const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj
4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
100 700 Td
(Test PDF) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000214 00000 n
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
307
%%EOF`;
  
  return createTestFile(filename, pdfContent);
}

/**
 * Create a test JSON file
 */
export function createTestJSON(filename: string = 'test-data.json'): string {
  const content = JSON.stringify({
    name: 'Test Data',
    description: 'Sample JSON file for E2E testing',
    items: [
      { id: 1, value: 'Item 1' },
      { id: 2, value: 'Item 2' },
    ],
  }, null, 2);
  
  return createTestFile(filename, content);
}

/**
 * Create a large test file (for testing file size limits)
 */
export function createLargeTestFile(sizeInMB: number = 10, filename: string = 'large-file.bin'): string {
  const buffer = Buffer.alloc(sizeInMB * 1024 * 1024, 0);
  return createTestFile(filename, buffer);
}

/**
 * Cleanup temporary test files
 */
export function cleanupTestFiles() {
  const tmpDir = path.join(process.cwd(), 'e2e', '.tmp');
  
  if (fs.existsSync(tmpDir)) {
    const files = fs.readdirSync(tmpDir);
    files.forEach(file => {
      fs.unlinkSync(path.join(tmpDir, file));
    });
  }
}

/**
 * Get file info for assertions
 */
export function getFileInfo(filePath: string) {
  const stats = fs.statSync(filePath);
  const name = path.basename(filePath);
  const ext = path.extname(filePath);
  
  return {
    name,
    path: filePath,
    size: stats.size,
    extension: ext,
    mimeType: getMimeType(ext),
  };
}

/**
 * Get MIME type from file extension
 */
function getMimeType(ext: string): string {
  const mimeTypes: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.pdf': 'application/pdf',
    '.txt': 'text/plain',
    '.json': 'application/json',
    '.csv': 'text/csv',
    '.xml': 'application/xml',
    '.zip': 'application/zip',
  };
  
  return mimeTypes[ext.toLowerCase()] || 'application/octet-stream';
}

/**
 * Mock file data for testing
 */
export const MOCK_FILES = {
  image: {
    name: 'test-image.png',
    size: 1024,
    type: 'image/png',
  },
  document: {
    name: 'test-document.pdf',
    size: 2048,
    type: 'application/pdf',
  },
  text: {
    name: 'test-file.txt',
    size: 512,
    type: 'text/plain',
  },
};
