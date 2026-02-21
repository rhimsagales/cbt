const PDFDocument = require('pdfkit');

const TEAL = '#0D5C63';
const TEAL_LIGHT = '#1A7F8A';
const GREY_DARK = '#2C3E50';
const GREY_MID = '#7F8C8D';
const GREY_LIGHT = '#ECF0F1';

function formatNumber(n) {
  return Number(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function getCurrencySymbol(currency) {
  const symbols = { USD: '$', EUR: 'EUR ', GBP: 'GBP ', NGN: 'NGN ', PHP: 'PHP ' };
  return symbols[currency] || (currency ? currency + ' ' : '');
}

function formatDateSlash(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

function buildInvoicePdf(payload, res) {
  const { clientInfo, items, bankDetails } = payload;

  const doc = new PDFDocument({ size: 'A4', margin: 0 });

  const pageWidth = 595;
  const pageHeight = 842;
  const margin = 40;
  const contentWidth = pageWidth - margin * 2; // 515

  res.setHeader('Content-Type', 'application/pdf');
  const filename = `invoice-${(clientInfo.voucherNo || Date.now())
    .toString()
    .replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`;
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  doc.pipe(res);

  const currency = items[0]?.currency || 'USD';
  const symbol = getCurrencySymbol(currency);

  let y = 0;

  /* =========================
     1. TOP HEADER
  ========================== */
  const headerHeight = 50;

  doc.rect(0, 0, pageWidth, headerHeight).fill(TEAL);

  doc.fillColor('#fff')
     .fontSize(16)
     .font('Helvetica-Bold')
     .text('Invoice', pageWidth - margin - 80, 15, {
       width: 80,
       align: 'right'
     });

  y = headerHeight;

  /* =========================
     2. CURVED ELEMENT
  ========================== */
  doc.save();
  doc.fillColor(TEAL_LIGHT);
  doc.moveTo(0, y);
  doc.lineTo(0, y + 70);
  doc.quadraticCurveTo(150, y + 85, 320, y + 45);
  doc.lineTo(pageWidth, y);
  doc.closePath();
  doc.fill();
  doc.restore();

  y += 55;

  /* =========================
     3. INVOICE META (RIGHT ALIGNED)
  ========================== */
  const metaWidth = 200;
  const metaX = pageWidth - margin - metaWidth;

  doc.fillColor(GREY_DARK)
     .font('Helvetica')
     .fontSize(10);

  doc.text(`Invoice No: #${clientInfo.voucherNo || '-'}`, metaX, y, {
    width: metaWidth,
    align: 'right'
  });

  doc.text(`Date: ${formatDateSlash(clientInfo.dateOfIssue)}`, metaX, y + 14, {
    width: metaWidth,
    align: 'right'
  });

  doc.text(`Account No: ${clientInfo.tinNumber || '-'}`, metaX, y + 28, {
    width: metaWidth,
    align: 'right'
  });

  doc.text(
    `Deadline: ${formatDateSlash(clientInfo.deadlineOfPayment)}`,
    metaX,
    y + 42,
    {
      width: metaWidth,
      align: 'right'
    }
  );

  y += 80;

  /* =========================
     4. CLIENT + PAYMENT INFO
  ========================== */

  doc.fillColor(GREY_DARK)
     .font('Helvetica-Bold')
     .fontSize(10)
     .text('INVOICE TO:', margin, y);

  doc.font('Helvetica')
     .fontSize(9)
     .fillColor(GREY_DARK);

  doc.text(`Name: ${clientInfo.name || '-'}`, margin, y + 18);
  doc.text(`Customer Attention: ${clientInfo.customerAttention || '-'}`, margin, y + 32);

  const bankLines = bankDetails
    ? bankDetails.split('\n').filter(Boolean)
    : [];

  if (bankLines.length) {
    const bankWidth = 180;
    const bankX = pageWidth - margin - bankWidth;

    doc.font('Helvetica-Bold')
       .text('Payment Info:', bankX, y, {
         width: bankWidth,
         align: 'right'
       });

    doc.font('Helvetica');

    bankLines.slice(0, 4).forEach((line, i) => {
      doc.text(line.trim(), bankX, y + 18 + i * 14, {
        width: bankWidth,
        align: 'right'
      });
    });
  }

  y += 80;

  /* =========================
     5. TABLE
  ========================== */

  const rowHeight = 24;

  const noWidth = 35;
  const descWidth = 220;
  const priceWidth = 70;
  const qtyWidth = 60;
  const totalWidth = 100;

  const colNo = margin;
  const colDesc = colNo + noWidth;
  const colPrice = colDesc + descWidth;
  const colQty = colPrice + priceWidth;
  const colTotal = colQty + qtyWidth;

  /* ----- HEADER ROW ----- */
  doc.rect(margin, y, contentWidth, rowHeight).fill(TEAL);

  doc.fillColor('#fff')
     .font('Helvetica-Bold')
     .fontSize(9);

  doc.text('NO.', colNo + 5, y + 8, { width: noWidth });
  doc.text('PRODUCT DESCRIPTION', colDesc + 5, y + 8, { width: descWidth });
  doc.text('PRICE', colPrice + 5, y + 8, { width: priceWidth });
  doc.text('QUANTITY', colQty + 5, y + 8, { width: qtyWidth });
  doc.text('TOTAL', colTotal + 5, y + 8, {
    width: totalWidth,
    align: 'right'
  });

  y += rowHeight;

  /* ----- ROWS ----- */

  doc.font('Helvetica')
     .fontSize(9)
     .fillColor(GREY_DARK);

  let subtotal = 0;

  items.forEach((row, i) => {
    const amount = row.quantity * row.price;
    subtotal += amount;

    const rowSymbol = getCurrencySymbol(row.currency || currency);
    const bgColor = i % 2 === 0 ? '#fff' : GREY_LIGHT;

    doc.rect(margin, y, contentWidth, rowHeight).fill(bgColor);
    doc.rect(margin, y, contentWidth, rowHeight).stroke('#ddd');

    doc.fillColor(GREY_DARK);

    doc.text(String(i + 1).padStart(2, '0'), colNo + 5, y + 6, {
      width: noWidth
    });

    doc.text(
      (row.item || '-').substring(0, 45),
      colDesc + 5,
      y + 6,
      { width: descWidth }
    );

    doc.text(
      `${rowSymbol}${formatNumber(row.price)}`,
      colPrice + 5,
      y + 6,
      { width: priceWidth }
    );

    doc.text(
      String(row.quantity).padStart(2, '0'),
      colQty + 5,
      y + 6,
      { width: qtyWidth }
    );

    doc.text(
      `${rowSymbol}${formatNumber(amount)}`,
      colTotal + 5,
      y + 6,
      {
        width: totalWidth,
        align: 'right'
      }
    );

    y += rowHeight;
  });

  y += 20;

  /* =========================
     6. SUMMARY
  ========================== */

  const summaryX = colTotal;
  const summaryY = y;

  doc.font('Helvetica-Bold')
     .fontSize(10)
     .fillColor(GREY_DARK)
     .text('Total:', summaryX - 60, summaryY);

  doc.rect(summaryX, summaryY - 4, totalWidth + 10, 30).fill(TEAL);

  doc.fillColor('#fff')
     .fontSize(12)
     .text(`${symbol}${formatNumber(subtotal)}`, summaryX + 5, summaryY, {
       width: totalWidth,
       align: 'right'
     });

  /* =========================
     7. FOOTER BAND
  ========================== */

  doc.rect(0, pageHeight - 15, pageWidth, 15).fill(TEAL);

  doc.end();
}

function buildVoucherPdf(payload, res) {
  const { voucherInfo = {}, flights = [], itineraries = [], scopeOfWork = {} } = payload;

  const doc = new PDFDocument({ size: 'A4', margin: 0 });
  const pageWidth = 595;
  const pageHeight = 842;
  const margin = 40;

  res.setHeader('Content-Type', 'application/pdf');
  const filename = `voucher-${(voucherInfo.voucherNo || Date.now()).toString().replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`;
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  doc.pipe(res);

  let y = 0;

  // Header band
  doc.rect(0, 0, pageWidth, 50).fill(TEAL);
  doc.fillColor('#fff').fontSize(16).font('Helvetica-Bold').text('Voucher', pageWidth - margin - 100, 15, { width: 100, align: 'right' });
  y = 60;

  // Meta block (right)
  const metaWidth = 220;
  const metaX = pageWidth - margin - metaWidth;
  doc.fillColor(GREY_DARK).font('Helvetica').fontSize(10);
  doc.text(`Voucher No: ${voucherInfo.voucherNo || '-'}`, metaX, 70, { width: metaWidth, align: 'right' });
  doc.text(`Issued: ${formatDateSlash(voucherInfo.dateOfIssue)}`, metaX, 86, { width: metaWidth, align: 'right' });
  doc.text(`Travel Date: ${formatDateSlash(voucherInfo.dateOfTravel)}`, metaX, 102, { width: metaWidth, align: 'right' });
  doc.text(`Destination: ${voucherInfo.destination || '-'}`, metaX, 118, { width: metaWidth, align: 'right' });

  // Voucher info (left)
  doc.fillColor(GREY_DARK).font('Helvetica-Bold').fontSize(10).text('VOUCHER TO:', margin, 70);
  doc.font('Helvetica').fontSize(9);
  doc.text(`Name: ${voucherInfo.name || '-'}`, margin, 88);
  doc.text(`Hotel: ${voucherInfo.hotel || '-'}`, margin, 104);
  doc.text(`Hotel CN: ${voucherInfo.hotelConfirmation || '-'}`, margin, 120);
  doc.text(`Rooms: ${voucherInfo.rooms != null ? voucherInfo.rooms : '-'}`, margin, 136);

  const names = (voucherInfo.namesList || '').split('\n').filter(Boolean);
  if (names.length) {
    doc.font('Helvetica-Bold').text('Passengers:', margin, 154);
    doc.font('Helvetica').fontSize(9);
    names.slice(0, 8).forEach((line, i) => {
      doc.text(line.trim(), margin, 170 + i * 12);
    });
    y = 170 + Math.min(names.length, 8) * 12 + 10;
  } else {
    y = 170;
  }

  // Flights
  y += 6;
  doc.moveTo(margin, y).lineTo(pageWidth - margin, y).stroke(GREY_LIGHT);
  y += 10;
  doc.font('Helvetica-Bold').fontSize(10).fillColor(GREY_DARK).text('Flights:', margin, y);
  y += 16;
  doc.font('Helvetica').fontSize(9);
  flights.forEach((f, i) => {
    const dep = `${formatDateSlash(f.depDate)} ${f.depTime || ''}`.trim();
    const arr = `${formatDateSlash(f.arrDate)} ${f.arrTime || ''}`.trim();
    doc.text(`${i + 1}. ${f.flightNo || '-'} — Dep: ${dep} — Arr: ${arr}`, margin, y, { width: pageWidth - margin * 2 });
    y += 14;
  });

  // Itineraries
  y += 8;
  doc.font('Helvetica-Bold').fontSize(10).text('Itineraries:', margin, y);
  y += 14;
  doc.font('Helvetica').fontSize(9);
  itineraries.forEach((it, idx) => {
    const mealStr = `${it.breakfast ? 'B' : '-'} ${it.lunch ? 'L' : '-'} ${it.dinner ? 'D' : '-'}`;
    doc.text(`${idx + 1}. ${it.city || '-'} — ${it.hotel || '-'} — Meals: ${mealStr}`, margin, y, { width: pageWidth - margin * 2 });
    y += 12;
    if (it.description) {
      doc.text(it.description, margin + 10, y, { width: pageWidth - margin * 2 - 10 });
      y += 12 + (it.description.split('\n').length * 6);
    }
    y += 6;
  });

  // Scope of Work
  y += 6;
  doc.font('Helvetica-Bold').fontSize(10).text('Scope of Work:', margin, y);
  y += 14;
  doc.font('Helvetica').fontSize(9);
  if (scopeOfWork.description) {
    doc.text('Description:', margin, y);
    y += 12;
    doc.text(scopeOfWork.description, margin + 8, y, { width: pageWidth - margin * 2 - 8 });
    y += 12 + (scopeOfWork.description.split('\n').length * 6);
  }
  if (scopeOfWork.inclusions) {
    doc.text('Inclusions:', margin, y);
    y += 12;
    doc.text(scopeOfWork.inclusions, margin + 8, y, { width: pageWidth - margin * 2 - 8 });
    y += 12 + (scopeOfWork.inclusions.split('\n').length * 6);
  }
  if (scopeOfWork.exclusions) {
    doc.text('Exclusions:', margin, y);
    y += 12;
    doc.text(scopeOfWork.exclusions, margin + 8, y, { width: pageWidth - margin * 2 - 8 });
    y += 12 + (scopeOfWork.exclusions.split('\n').length * 6);
  }
  if (scopeOfWork.arrivalInstructions) {
    doc.text('Arrival Instructions:', margin, y);
    y += 12;
    doc.text(scopeOfWork.arrivalInstructions, margin + 8, y, { width: pageWidth - margin * 2 - 8 });
    y += 12 + (scopeOfWork.arrivalInstructions.split('\n').length * 6);
  }
  if (scopeOfWork.remarks) {
    doc.text('Remarks:', margin, y);
    y += 12;
    doc.text(scopeOfWork.remarks, margin + 8, y, { width: pageWidth - margin * 2 - 8 });
    y += 12 + (scopeOfWork.remarks.split('\n').length * 6);
  }

  // Footer
  doc.rect(0, pageHeight - 15, pageWidth, 15).fill(TEAL);

  doc.end();
}

module.exports = {
  buildInvoicePdf,
  buildVoucherPdf
};
