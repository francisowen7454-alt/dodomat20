/**
 * Client-side service to communicate with server-side Gemini API endpoints.
 * Never imports @google/genai directly into the browser.
 */
import { SecurityService } from './security';

export interface AnalyzedProductData {
  name: string;
  category: string;
  price: number;
  pv: number;
  description?: string;
}

export interface ParsedPdfProductResult {
  count: number;
  products: AnalyzedProductData[];
  isFallback?: boolean;
}

export const BF_SUMA_CATEGORIES = [
  'Bones & Joints',          // MIFUPA NA MAUNGIO
  'Immune Boosters',         // KINGA YA MWILI
  'Reproductive Health',    // MFUMO WA UZAZI
  'Digestive Health',       // MMENG'ENYO WA CHAKULA
  'Cardiovascular Health',  // MZUNGUKO WA DAMU
  'Personal Care',          // MATUMIZI BINAFSI
  "Children's Health",       // BIDHAA ZAWATOTO
  'Skin Care',              // NGOZI
];

export class GeminiService {
  /**
   * Helper to convert File to Base64
   */
  static fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  }

  /**
   * Analyzes an uploaded photo or camera capture via Gemini API
   * and extracts product name, category, price in TZS, and description.
   */
  static async analyzeProductImage(fileOrBase64: File | string, mimeType?: string): Promise<AnalyzedProductData> {
    let imageBase64: string;
    let finalMime = mimeType || 'image/jpeg';

    if (typeof fileOrBase64 === 'string') {
      imageBase64 = fileOrBase64;
      const match = imageBase64.match(/^data:([^;]+);base64,/);
      if (match) {
        finalMime = match[1];
      }
    } else {
      finalMime = fileOrBase64.type || 'image/jpeg';
      imageBase64 = await this.fileToBase64(fileOrBase64);
    }

    const response = await fetch('/api/gemini/analyze-product-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...SecurityService.getAuthHeaders(),
      },
      credentials: 'include',
      body: JSON.stringify({
        imageBase64,
        mimeType: finalMime,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `Server responded with status ${response.status}`);
    }

    const data = await response.json();
    if (!data.success || !data.product) {
      throw new Error(data.error || 'Failed to extract product information from image.');
    }

    return data.product;
  }

  /**
   * Scans a Product Order Form or Price List (either a PHOTO image or a PDF document).
   * Extracts all BF Suma product names, categories, and prices, and strictly sorts them A to Z.
   */
  static async scanProductForm(fileOrBase64: File | string, mimeType?: string): Promise<ParsedPdfProductResult> {
    let fileBase64: string;
    let finalMime = mimeType || 'image/jpeg';

    if (typeof fileOrBase64 === 'string') {
      fileBase64 = fileOrBase64;
      const match = fileBase64.match(/^data:([^;]+);base64,/);
      if (match) {
        finalMime = match[1];
      }
    } else {
      finalMime = fileOrBase64.type || (fileOrBase64.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');
      fileBase64 = await this.fileToBase64(fileOrBase64);
    }

    const response = await fetch('/api/gemini/scan-product-form', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...SecurityService.getAuthHeaders(),
      },
      credentials: 'include',
      body: JSON.stringify({
        fileBase64,
        mimeType: finalMime,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `Server responded with status ${response.status}`);
    }

    const data = await response.json();
    if (!data.success || !Array.isArray(data.products)) {
      throw new Error(data.error || 'Failed to extract products from form.');
    }

    // Double-verify strict A-to-Z alphabetical sorting on client side
    const sortedProducts = [...data.products].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    );

    return {
      count: sortedProducts.length,
      products: sortedProducts,
      isFallback: data.isFallback,
    };
  }

  /**
   * Alias for backward compatibility with PDF parser
   */
  static async parseProductPdf(fileOrBase64: File | string): Promise<ParsedPdfProductResult> {
    return this.scanProductForm(fileOrBase64, 'application/pdf');
  }

  /**
   * Creates an official sample BF Suma Tanzania Product Order Form PDF
   * with genuine BF Suma TZ items and prices.
   */
  static createSampleCatalogPdfBlob(): { blob: Blob; filename: string; dataUrl: string } {
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
  /Resources <<
    /Font <<
      /F1 4 0 R
    >>
  >>
  /MediaBox [0 0 612 792]
  /Contents 5 0 R
>>
endobj
4 0 obj
<<
  /Type /Font
  /Subtype /Type1
  /BaseFont /Helvetica
>>
endobj
5 0 obj
<< /Length 820 >>
stream
BT
/F1 16 Tf
50 740 Td
(BF SUMA TANZANIA - OFFICIAL PRODUCT ORDER FORM & PRICE LIST) Tj
/F1 10 Tf
0 -26 Td
(Kariakoo Branch, Dar es Salaam - Official Retail Product Catalog) Tj
0 -28 Td
(1. ArthroXtra Tablets (60 Tablets) - TZS 175,000 - Bones & Joints) Tj
0 -22 Td
(2. ZaminoCal Plus Capsules (60 Capsules) - TZS 95,000 - Bones & Joints) Tj
0 -22 Td
(3. Pure & Broken Ganoderma Spores (30 Capsules) - TZS 230,000 - Immune Boosters) Tj
0 -22 Td
(4. Refined Yunzhi Essence (60 Capsules) - TZS 115,000 - Immune Boosters) Tj
0 -22 Td
(5. XPower Man Plus Capsules (30 Capsules) - TZS 120,000 - Men's Health & Vitality) Tj
0 -22 Td
(6. XPower 4-in-1 Coffee (20 Sachets) - TZS 55,000 - Men's Health & Vitality) Tj
0 -22 Td
(7. ProstatRelax Capsules (60 Capsules) - TZS 110,000 - Men's Health & Vitality) Tj
0 -22 Td
(8. CereBrain Tablets (60 Tablets) - TZS 92,000 - Cardiovascular & Brain) Tj
0 -22 Td
(9. Micr-O2 Cycle Tablets (100 Tablets) - TZS 88,000 - Cardiovascular & Brain) Tj
0 -22 Td
(10. ConstiRelax Oral Solution (12 Sachets) - TZS 75,000 - Digestive Health) Tj
0 -22 Td
(11. Dr. Cow Calcium & Vitamin D3 Milk Candy (120s) - TZS 85,000 - Smart Kids) Tj
0 -22 Td
(12. Anatic Herbal Essence Soap - TZS 12,000 - Personal Care) Tj
ET
endstream
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000261 00000 n 
0000000337 00000 n 
trailer
<<
  /Size 6
  /Root 1 0 R
>>
startxref
1230
%%EOF`;

    const blob = new Blob([pdfContent], { type: 'application/pdf' });
    const dataUrl = `data:application/pdf;base64,${btoa(pdfContent)}`;
    return {
      blob,
      filename: 'BF_Suma_Tanzania_Order_Form.pdf',
      dataUrl,
    };
  }

  /**
   * Generates a sample image data URL of a printed BF Suma Tanzania order form sheet
   * for testing photo scan without needing an external photo file.
   */
  static createSampleFormImageDataUrl(): string {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800" style="background:#ffffff; font-family:sans-serif;">
      <rect width="600" height="800" fill="#fcfcfc" stroke="#333333" stroke-width="3"/>
      <rect x="20" y="20" width="560" height="70" fill="#003366" rx="8"/>
      <text x="300" y="48" fill="#ffffff" font-size="18" font-weight="bold" text-anchor="middle">BF SUMA TANZANIA</text>
      <text x="300" y="72" fill="#ffd700" font-size="12" font-weight="bold" text-anchor="middle">OFFICIAL PRODUCT REGISTRATION ORDER FORM</text>
      
      <text x="40" y="125" fill="#222" font-size="12" font-weight="bold">Branch: Kariakoo, Dar es Salaam | Date: 2026-10-25</text>
      <line x1="40" y1="135" x2="560" y2="135" stroke="#cccccc" stroke-width="1"/>
      
      <!-- Table Header -->
      <rect x="40" y="150" width="520" height="30" fill="#e6f0fa"/>
      <text x="50" y="170" fill="#003366" font-size="11" font-weight="bold">#</text>
      <text x="90" y="170" fill="#003366" font-size="11" font-weight="bold">PRODUCT NAME (BF SUMA)</text>
      <text x="340" y="170" fill="#003366" font-size="11" font-weight="bold">CATEGORY</text>
      <text x="490" y="170" fill="#003366" font-size="11" font-weight="bold">RETAIL (TZS)</text>
      
      <!-- Rows -->
      <text x="50" y="210" fill="#333" font-size="11">1</text>
      <text x="90" y="210" fill="#111" font-size="11" font-weight="bold">ArthroXtra Tablets</text>
      <text x="340" y="210" fill="#555" font-size="10">Bones &amp; Joints</text>
      <text x="490" y="210" fill="#008000" font-size="11" font-weight="bold">175,000</text>
      
      <text x="50" y="245" fill="#333" font-size="11">2</text>
      <text x="90" y="245" fill="#111" font-size="11" font-weight="bold">Pure &amp; Broken Ganoderma</text>
      <text x="340" y="245" fill="#555" font-size="10">Immune Boosters</text>
      <text x="490" y="245" fill="#008000" font-size="11" font-weight="bold">230,000</text>
      
      <text x="50" y="280" fill="#333" font-size="11">3</text>
      <text x="90" y="280" fill="#111" font-size="11" font-weight="bold">XPower Man Plus</text>
      <text x="340" y="280" fill="#555" font-size="10">Men's Health</text>
      <text x="490" y="280" fill="#008000" font-size="11" font-weight="bold">120,000</text>
      
      <text x="50" y="315" fill="#333" font-size="11">4</text>
      <text x="90" y="315" fill="#111" font-size="11" font-weight="bold">ZaminoCal Plus</text>
      <text x="340" y="315" fill="#555" font-size="10">Bones &amp; Joints</text>
      <text x="490" y="315" fill="#008000" font-size="11" font-weight="bold">95,000</text>
      
      <text x="50" y="350" fill="#333" font-size="11">5</text>
      <text x="90" y="350" fill="#111" font-size="11" font-weight="bold">CereBrain Tablets</text>
      <text x="340" y="350" fill="#555" font-size="10">Cardiovascular &amp; Brain</text>
      <text x="490" y="350" fill="#008000" font-size="11" font-weight="bold">92,000</text>
      
      <text x="50" y="385" fill="#333" font-size="11">6</text>
      <text x="90" y="385" fill="#111" font-size="11" font-weight="bold">Micr-O2 Cycle Tablets</text>
      <text x="340" y="385" fill="#555" font-size="10">Cardiovascular &amp; Brain</text>
      <text x="490" y="385" fill="#008000" font-size="11" font-weight="bold">88,000</text>
      
      <text x="50" y="420" fill="#333" font-size="11">7</text>
      <text x="90" y="420" fill="#111" font-size="11" font-weight="bold">ConstiRelax Oral Solution</text>
      <text x="340" y="420" fill="#555" font-size="10">Digestive Health</text>
      <text x="490" y="420" fill="#008000" font-size="11" font-weight="bold">75,000</text>
      
      <text x="50" y="455" fill="#333" font-size="11">8</text>
      <text x="90" y="455" fill="#111" font-size="11" font-weight="bold">Dr. Cow Calcium Milk Candy</text>
      <text x="340" y="455" fill="#555" font-size="10">Smart Kids</text>
      <text x="490" y="455" fill="#008000" font-size="11" font-weight="bold">85,000</text>
      
      <text x="50" y="490" fill="#333" font-size="11">9</text>
      <text x="90" y="490" fill="#111" font-size="11" font-weight="bold">Anatic Herbal Soap</text>
      <text x="340" y="490" fill="#555" font-size="10">Personal Care</text>
      <text x="490" y="490" fill="#008000" font-size="11" font-weight="bold">12,000</text>
      
      <rect x="40" y="520" width="520" height="40" fill="#f0f7ff" stroke="#b8d5f2" rx="4"/>
      <text x="55" y="545" fill="#004085" font-size="10">Note: Form lists product categories and retail prices. Quantities are filled in Daily Sales Report.</text>
    </svg>`;

    return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
  }
}
