const express = require('express');
const path = require('path');
const PDFDocument = require('pdfkit');

const app = express();
const PORT = process.env.PORT || 3000;

const TEAL = '#0D5C63';
const TEAL_LIGHT = '#1A7F8A';
const GREY_DARK = '#2C3E50';
const GREY_MID = '#7F8C8D';
const GREY_LIGHT = '#ECF0F1';


app.get('/pages/:page', (req, res) => {
  const page = req.params.page;
  // console.log('Requested page:', page);
  const allowedPages = ['billing-generator', 'voucher-generator'];

  if (page.includes('.')) {
    return res.status(403).send('Direct file access not allowed');
  }

  if (!allowedPages.includes(page)) {
    return res.status(404).send('Page not found');
  }
  switch (page) {
    case 'login':
      res.sendFile(path.join(__dirname, 'src/pages/index.html'));
      break;
    case 'billing-generator':
      res.sendFile(path.join(__dirname, 'src/pages/billing-generator.html'));
      break;
    case 'voucher-generator':
      res.sendFile(path.join(__dirname, 'src/pages/voucher-generator.html'));
      break;
  }
});

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'src')));

const { buildInvoicePdf, buildVoucherPdf } = require('./src/js/pdfBuilders');

app.post('/api/billing', (req, res) => {
  try {
    const payload = req.body;
    if (!payload || !payload.clientInfo) {
      return res.status(400).json({ error: 'Invalid payload: clientInfo required' });
    }
    if (!payload.items || !Array.isArray(payload.items)) {
      return res.status(400).json({ error: 'Invalid payload: items array required' });
    }

    buildInvoicePdf(payload, res);
  } catch (err) {
    console.error('Billing PDF error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate PDF' });
  }
});


app.get('/', (req, res) => {
  res.send('Server is running')
});



app.post('/api/voucher', (req, res) => {
  try {
    const payload = req.body;
    if (!payload || !payload.voucherInfo) {
      return res.status(400).json({ error: 'Invalid payload: voucherInfo required' });
    }

    const requiredFields = ['name', 'voucherNo', 'dateOfIssue', 'destination', 'dateOfTravel', 'hotel', 'hotelConfirmation', 'hotelAddress', 'rooms', 'namesList'];
    const missing = requiredFields.filter(f => {
      const v = payload.voucherInfo[f];
      return v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
    });
    if (missing.length) {
      return res.status(400).json({ error: 'Missing voucherInfo fields', missing });
    }

    if (payload.flights && !Array.isArray(payload.flights)) {
      return res.status(400).json({ error: 'Invalid payload: flights must be an array' });
    }

    if (payload.itineraries && !Array.isArray(payload.itineraries)) {
      return res.status(400).json({ error: 'Invalid payload: itineraries must be an array' });
    }

    buildVoucherPdf(payload, res);
  } catch (err) {
    console.error('Voucher PDF error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate PDF' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
