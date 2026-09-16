const statusColors = {
  // Enquiry
  NEW: 'bg-blue-100 text-blue-800',
  QUOTED: 'bg-purple-100 text-purple-800',
  WON: 'bg-green-100 text-green-800',
  LOST: 'bg-red-100 text-red-800',
  // Quotation
  DRAFT: 'bg-gray-100 text-gray-800',
  SENT: 'bg-yellow-100 text-yellow-800',
  ACCEPTED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  // Sales Order
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  DISPATCHED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

export default function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
        statusColors[status] || 'bg-gray-100 text-gray-800'
      }`}
    >
      {status}
    </span>
  );
}
