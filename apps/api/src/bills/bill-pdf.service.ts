import { join } from 'node:path';
import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import type { BillDto } from '@domar/shared';

// Bundled so diacritics (Croatian č/š/ž, German äöüß) render correctly —
// pdfkit's built-in Helvetica is WinAnsi-only and mangles Latin Extended-A.
const FONT_DIR = join(__dirname, 'fonts');
const FONT_REGULAR = join(FONT_DIR, 'DejaVuSans.ttf');
const FONT_BOLD = join(FONT_DIR, 'DejaVuSans-Bold.ttf');

@Injectable()
export class BillPdfService {
  /** Render a one-page invoice and resolve the full PDF as a Buffer. */
  render(bill: BillDto): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      doc.registerFont('body', FONT_REGULAR);
      doc.registerFont('body-bold', FONT_BOLD);
      doc.font('body');
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      this.draw(doc, bill);
      doc.end();
    });
  }

  private money(cents: number, currency: string): string {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency,
    }).format(cents / 100);
  }

  private draw(doc: PDFKit.PDFDocument, bill: BillDto) {
    const { currency } = bill;

    // Header
    doc.fontSize(20).text('Invoice', { align: 'left' });
    doc.moveDown(0.3);
    doc
      .fontSize(10)
      .fillColor('#666')
      .text(bill.number ?? 'DRAFT (preview)');
    if (bill.confirmedAt) {
      doc.text(`Issued: ${new Date(bill.confirmedAt).toLocaleDateString('en-GB')}`);
    }
    doc.fillColor('#000');
    doc.moveDown(1);

    // Property block
    doc.fontSize(12).text('Property', { underline: true });
    doc.fontSize(10).text(bill.property.name);
    doc.text(bill.property.address);
    doc.moveDown(1);

    // Line items table
    const x = { label: 50, qty: 320, unit: 390, total: 480 };
    const drawRow = (
      label: string,
      qty: string,
      unit: string,
      total: string,
      bold = false,
    ) => {
      const y = doc.y;
      doc.font(bold ? 'body-bold' : 'body').fontSize(10);
      doc.text(label, x.label, y, { width: x.qty - x.label - 10 });
      doc.text(qty, x.qty, y, { width: x.unit - x.qty - 10, align: 'right' });
      doc.text(unit, x.unit, y, { width: x.total - x.unit - 10, align: 'right' });
      doc.text(total, x.total, y, { width: 65, align: 'right' });
      doc.moveDown(0.5);
    };

    drawRow('Description', 'Qty/Hrs', 'Unit', 'Total', true);
    doc
      .moveTo(x.label, doc.y)
      .lineTo(545, doc.y)
      .strokeColor('#ccc')
      .stroke();
    doc.moveDown(0.5);

    for (const li of bill.lineItems) {
      const qty = (li.quantity / 100).toString();
      drawRow(
        li.label,
        qty,
        this.money(li.unitAmountCents, currency),
        this.money(li.lineTotalCents, currency),
      );
    }

    doc.moveDown(0.5);
    doc.moveTo(x.unit, doc.y).lineTo(545, doc.y).strokeColor('#ccc').stroke();
    doc.moveDown(0.5);

    // Totals
    const totalLine = (label: string, amount: string, bold = false) => {
      const y = doc.y;
      doc.font(bold ? 'body-bold' : 'body').fontSize(10);
      doc.text(label, x.unit, y, { width: x.total - x.unit - 10, align: 'right' });
      doc.text(amount, x.total, y, { width: 65, align: 'right' });
      doc.moveDown(0.5);
    };

    totalLine('Net', this.money(bill.netCents, currency));
    if (bill.taxRateBps != null) {
      totalLine(
        `VAT (${(bill.taxRateBps / 100).toFixed(2)}%)`,
        this.money(bill.taxCents, currency),
      );
    }
    totalLine('Total', this.money(bill.grossCents, currency), true);

    // Notes
    if (bill.notes) {
      doc.font('body').fontSize(10).fillColor('#000');
      doc.moveDown(1.5);
      doc.text('Notes', x.label, doc.y, { underline: true });
      doc.moveDown(0.3);
      doc.fillColor('#444').text(bill.notes, x.label, doc.y, { width: 495 });
    }
  }
}
