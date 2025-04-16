/**
 * PDF generation utilities for invoice export
 */
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/**
 * Configurations for PDF generation
 */
export const PDF_CONFIG = {
  // PDF dimensions in points (equivalent to the Python code's dimensions)
  width: 598.56,
  height: 845.28,
  // Margin in points
  margin: 0,
  // PDF metadata
  title: 'Fatura RaaS Solar',
  author: 'RaaS Solar Platform'
};

/**
 * Generates a PDF from an HTML element
 * 
 * @param element The HTML element to capture
 * @param filename The filename for the PDF
 * @returns A Promise that resolves to the PDF Blob
 */
export async function generatePdfFromElement(
  element: HTMLElement,
  filename = 'fatura.pdf'
): Promise<Blob> {
  try {
    // Capture the element as a canvas
    const canvas = await html2canvas(element, {
      scale: 2, // Higher scale for better quality
      useCORS: true,
      allowTaint: true,
      logging: false, // Disable logging
      backgroundColor: '#ffffff' // White background
    });

    // Create a new PDF document with the specified dimensions
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: [PDF_CONFIG.width, PDF_CONFIG.height]
    });

    // Add metadata
    pdf.setProperties({
      title: PDF_CONFIG.title,
      author: PDF_CONFIG.author,
      subject: 'Fatura de Energia',
      keywords: 'raas, solar, energia, fatura'
    });

    // Convert the canvas to an image
    const imgData = canvas.toDataURL('image/png');

    // Add the image to the PDF, filling the entire page
    pdf.addImage(
      imgData,
      'PNG',
      PDF_CONFIG.margin,
      PDF_CONFIG.margin,
      PDF_CONFIG.width - (PDF_CONFIG.margin * 2),
      PDF_CONFIG.height - (PDF_CONFIG.margin * 2)
    );

    // Return the PDF as a blob
    return pdf.output('blob');
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate PDF');
  }
}

/**
 * Generates a PDF from an invoice ID by rendering its preview
 * 
 * @param invoiceId The ID of the invoice
 * @returns A Promise that resolves to the PDF Blob
 */
export async function generateInvoicePdf(invoiceId: string): Promise<Blob> {
  try {
    // In a browser environment, this would locate the invoice preview element
    // and use it to generate the PDF.
    // 
    // Since we're in a server environment, we need to use a different approach:
    // 1. Fetch the invoice data from the API
    // 2. Render the invoice to a canvas (using a headless browser like Puppeteer)
    // 3. Generate a PDF from the canvas
    //
    // For this example, we'll throw an error indicating this function
    // should be called from the client side
    throw new Error('generateInvoicePdf should be called from the client side');
  } catch (error) {
    console.error(`Error generating PDF for invoice ${invoiceId}:`, error);
    throw error;
  }
}

/**
 * Opens a PDF in a new tab
 * 
 * @param pdfBlob The PDF blob to open
 */
export function openPdfInNewTab(pdfBlob: Blob): void {
  const pdfUrl = URL.createObjectURL(pdfBlob);
  window.open(pdfUrl, '_blank');
}

/**
 * Triggers a download of a PDF file
 * 
 * @param pdfBlob The PDF blob to download
 * @param filename The filename for the download
 */
export function downloadPdf(pdfBlob: Blob, filename = 'fatura.pdf'): void {
  const pdfUrl = URL.createObjectURL(pdfBlob);
  const a = document.createElement('a');
  a.href = pdfUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(pdfUrl);
} 