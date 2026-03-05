import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDate, formatTime, formatCurrency, formatDateTime } from './formatters';

/**
 * Generate and download a PDF ticket for a booking.
 * @param {object} booking  — populated booking object from API
 * @param {object} user     — { name, email } from authStore
 */
export function generateTicket(booking, user) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const route = booking.routeId;
  const bus   = route?.busId;

  // ── Palette ────────────────────────────────────────────────────────────────
  const PRIMARY  = [109, 40, 217];  // violet-700 approx
  const LIGHT    = [237, 233, 254]; // violet-100
  const DARK     = [30, 27, 75];    // near-black
  const GRAY     = [107, 114, 128];
  const WHITE    = [255, 255, 255];

  // ── Header band ────────────────────────────────────────────────────────────
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, 210, 28, 'F');

  doc.setTextColor(...WHITE);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('BusGo', 14, 13);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Bus Ticket Reservation', 14, 20);

  doc.setFontSize(9);
  doc.text('BOARDING PASS', 196, 13, { align: 'right' });
  doc.setFontSize(8);
  doc.text(`Issued: ${formatDateTime(booking.createdAt)}`, 196, 20, { align: 'right' });

  // ── Booking ref strip ──────────────────────────────────────────────────────
  doc.setFillColor(...LIGHT);
  doc.rect(0, 28, 210, 14, 'F');

  doc.setTextColor(...DARK);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('BOOKING ID', 14, 35);
  doc.setFont('helvetica', 'normal');
  doc.text(booking._id?.toString() || '—', 14, 40);

  doc.setFont('helvetica', 'bold');
  doc.text('PAYMENT REF', 80, 35);
  doc.setFont('helvetica', 'normal');
  doc.text(booking.paymentId || '—', 80, 40);

  doc.setFont('helvetica', 'bold');
  doc.text('STATUS', 160, 35);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...(booking.status === 'confirmed' ? [22, 163, 74] : [239, 68, 68]));
  doc.text((booking.status || '').toUpperCase(), 160, 40);
  doc.setTextColor(...DARK);

  // ── Route section ──────────────────────────────────────────────────────────
  let y = 54;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PRIMARY);
  doc.text('JOURNEY DETAILS', 14, y);

  doc.setDrawColor(...PRIMARY);
  doc.setLineWidth(0.4);
  doc.line(14, y + 2, 196, y + 2);
  y += 8;

  doc.setTextColor(...DARK);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');

  // From / To row
  doc.text(route?.source || '—', 14, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRAY);
  doc.text('FROM', 14, y + 5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK);
  doc.text('→', 100, y, { align: 'center' });

  doc.text(route?.destination || '—', 196, y, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRAY);
  doc.text('TO', 196, y + 5, { align: 'right' });

  y += 16;

  // Details table
  autoTable(doc, {
    startY: y,
    head: [['Date', 'Departure', 'Arrival', 'Bus', 'Bus No.', 'Type']],
    body: [[
      formatDate(route?.date),
      formatTime(route?.departureTime),
      formatTime(route?.arrivalTime),
      bus?.name || '—',
      bus?.busNumber || '—',
      bus?.type || '—',
    ]],
    theme: 'grid',
    headStyles: { fillColor: PRIMARY, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 9 },
    margin: { left: 14, right: 14 },
  });

  y = doc.lastAutoTable.finalY + 10;

  // ── Passenger section ──────────────────────────────────────────────────────
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PRIMARY);
  doc.text('PASSENGER DETAILS', 14, y);
  doc.setDrawColor(...PRIMARY);
  doc.line(14, y + 2, 196, y + 2);
  y += 8;

  autoTable(doc, {
    startY: y,
    head: [['Name', 'Email']],
    body: [[user?.name || '—', user?.email || '—']],
    theme: 'grid',
    headStyles: { fillColor: PRIMARY, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 9 },
    margin: { left: 14, right: 14 },
  });

  y = doc.lastAutoTable.finalY + 10;

  // ── Seats section ──────────────────────────────────────────────────────────
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PRIMARY);
  doc.text('SEAT DETAILS', 14, y);
  doc.setDrawColor(...PRIMARY);
  doc.line(14, y + 2, 196, y + 2);
  y += 8;

  const seatRows = (booking.seatNumbers || []).map((sn) => [sn]);

  autoTable(doc, {
    startY: y,
    head: [['Seat Number']],
    body: seatRows,
    theme: 'striped',
    headStyles: { fillColor: PRIMARY, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 9 },
    margin: { left: 14, right: 100 },
  });

  // Total amount (right-aligned)
  const totalY = doc.lastAutoTable.finalY;
  doc.setFillColor(...LIGHT);
  doc.rect(120, totalY - 8, 76, 16, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRAY);
  doc.text('TOTAL AMOUNT', 130, totalY);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PRIMARY);
  doc.text(formatCurrency(booking.totalAmount), 194, totalY + 6, { align: 'right' });

  // ── Footer ─────────────────────────────────────────────────────────────────
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 280, 210, 17, 'F');
  doc.setTextColor(...WHITE);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Thank you for choosing BusGo. Have a safe journey!', 105, 287, { align: 'center' });
  doc.text('This is a system-generated ticket and requires no signature.', 105, 293, { align: 'center' });

  // ── Save ───────────────────────────────────────────────────────────────────
  const fileName = `BusGo-Ticket-${booking._id?.toString().slice(-8).toUpperCase()}.pdf`;
  doc.save(fileName);
}
