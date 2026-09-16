import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import StatusBadge from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { Plus, Search, Eye, Send, Check, X, ArrowRight, Trash2 } from 'lucide-react';

export default function QuotationsPage() {
  const { user } = useAuth();
  const [quotations, setQuotations] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enquiries, setEnquiries] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({
    enquiryId: '',
    validUntil: '',
    items: [{ productId: '', quantity: '', unitPrice: '', discountPercent: '0', gstPercent: '18' }],
  });

  useEffect(() => { loadQuotations(); }, [statusFilter]);

  useEffect(() => {
    if (showForm) {
      api.get('/enquiries').then((r) => setEnquiries(r.data.data.filter(e => e.status === 'NEW' || e.status === 'QUOTED'))).catch(() => {});
      api.get('/products').then((r) => setProducts(r.data.data)).catch(() => {});
    }
  }, [showForm]);

  const loadQuotations = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const res = await api.get('/quotations', { params });
      setQuotations(res.data.data);
    } catch {
      toast.error('Failed to load quotations');
    } finally {
      setLoading(false);
    }
  };

  const loadDetail = async (id) => {
    try {
      const res = await api.get(`/quotations/${id}`);
      setShowDetail(res.data.data);
    } catch {
      toast.error('Failed to load details');
    }
  };

  const addItem = () => setForm({ ...form, items: [...form.items, { productId: '', quantity: '', unitPrice: '', discountPercent: '0', gstPercent: '18' }] });
  const removeItem = (i) => setForm({ ...form, items: form.items.filter((_, idx) => idx !== i) });
  const updateItem = (i, field, value) => {
    const items = [...form.items];
    items[i] = { ...items[i], [field]: value };
    // Auto-fill unit price from product base price
    if (field === 'productId' && value) {
      const product = products.find((p) => p.id === parseInt(value));
      if (product) items[i].unitPrice = String(product.basePrice);
    }
    setForm({ ...form, items });
  };

  // Calculate line totals for preview
  const calculateLineAmount = (item) => {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.unitPrice) || 0;
    const disc = parseFloat(item.discountPercent) || 0;
    const gst = parseFloat(item.gstPercent) || 0;
    const base = qty * price;
    const discAmt = base * disc / 100;
    const taxable = base - discAmt;
    const gstAmt = taxable * gst / 100;
    return (taxable + gstAmt).toFixed(2);
  };

  const calculateTotal = () => {
    return form.items.reduce((sum, item) => sum + parseFloat(calculateLineAmount(item) || 0), 0).toFixed(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/quotations', {
        enquiryId: parseInt(form.enquiryId),
        validUntil: form.validUntil,
        items: form.items.map((i) => ({
          productId: parseInt(i.productId),
          quantity: parseInt(i.quantity),
          unitPrice: parseFloat(i.unitPrice),
          discountPercent: parseFloat(i.discountPercent) || 0,
          gstPercent: parseFloat(i.gstPercent) || 18,
        })),
      });
      toast.success('Quotation created');
      setShowForm(false);
      setForm({ enquiryId: '', validUntil: '', items: [{ productId: '', quantity: '', unitPrice: '', discountPercent: '0', gstPercent: '18' }] });
      loadQuotations();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create quotation');
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await api.patch(`/quotations/${id}/status`, { status });
      toast.success(`Quotation ${status.toLowerCase()}`);
      loadQuotations();
      if (showDetail) loadDetail(id);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const convertToSO = async (id) => {
    try {
      await api.post(`/quotations/${id}/convert`);
      toast.success('Sales Order created');
      loadQuotations();
      if (showDetail) loadDetail(id);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to convert');
    }
  };

  // Pre-fill items when enquiry is selected
  const handleEnquirySelect = (enquiryId) => {
    setForm({ ...form, enquiryId });
    const enquiry = enquiries.find((e) => e.id === parseInt(enquiryId));
    if (enquiry && enquiry.items) {
      const items = enquiry.items.map((item) => {
        const product = products.find((p) => p.id === item.productId);
        return {
          productId: String(item.productId),
          quantity: String(item.quantity),
          unitPrice: product ? String(product.basePrice) : '',
          discountPercent: '0',
          gstPercent: '18',
        };
      });
      setForm((f) => ({ ...f, enquiryId, items: items.length > 0 ? items : f.items }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quotations</h1>
          <p className="text-sm text-gray-500">{quotations.length} total quotations</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-medium">
          <Plus className="w-4 h-4" /> New Quotation
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h3 className="font-semibold text-gray-900">Create Quotation</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Enquiry</label>
              <select value={form.enquiryId} onChange={(e) => handleEnquirySelect(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" required>
                <option value="">Select enquiry...</option>
                {enquiries.map((enq) => (
                  <option key={enq.id} value={enq.id}>{enq.enquiryNumber} - {enq.customer?.companyName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valid Until</label>
              <input type="date" value={form.validUntil} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" required />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Line Items</label>
              <button type="button" onClick={addItem} className="text-blue-600 text-sm hover:underline">+ Add item</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-left">
                  <th className="py-2 pr-2">Product</th>
                  <th className="py-2 px-2 w-20">Qty</th>
                  <th className="py-2 px-2 w-28">Unit Price</th>
                  <th className="py-2 px-2 w-20">Disc %</th>
                  <th className="py-2 px-2 w-20">GST %</th>
                  <th className="py-2 px-2 w-28 text-right">Line Total</th>
                  <th className="py-2 w-8"></th>
                </tr></thead>
                <tbody>
                  {form.items.map((item, i) => (
                    <tr key={i} className="border-b">
                      <td className="py-2 pr-2">
                        <select value={item.productId} onChange={(e) => updateItem(i, 'productId', e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm" required>
                          <option value="">Select...</option>
                          {products.map((p) => <option key={p.id} value={p.id}>{p.productCode} - {p.productName}</option>)}
                        </select>
                      </td>
                      <td className="py-2 px-2"><input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(i, 'quantity', e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm" required /></td>
                      <td className="py-2 px-2"><input type="number" min="0" step="0.01" value={item.unitPrice} onChange={(e) => updateItem(i, 'unitPrice', e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm" required /></td>
                      <td className="py-2 px-2"><input type="number" min="0" max="100" step="0.01" value={item.discountPercent} onChange={(e) => updateItem(i, 'discountPercent', e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm" /></td>
                      <td className="py-2 px-2"><input type="number" min="0" max="100" step="0.01" value={item.gstPercent} onChange={(e) => updateItem(i, 'gstPercent', e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm" /></td>
                      <td className="py-2 px-2 text-right font-medium">₹{calculateLineAmount(item)}</td>
                      <td className="py-2">{form.items.length > 1 && <button type="button" onClick={() => removeItem(i)} className="text-red-500 p-1"><Trash2 className="w-4 h-4" /></button>}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr><td colSpan={5} className="text-right font-semibold py-2 pr-2">Estimated Total:</td><td className="text-right font-bold py-2 px-2">₹{calculateTotal()}</td><td></td></tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium">Create Quotation</button>
            <button type="button" onClick={() => setShowForm(false)} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 text-sm">Cancel</button>
          </div>
        </form>
      )}

      {/* Detail Modal */}
      {showDetail && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowDetail(null)}>
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{showDetail.quotationNumber}</h3>
              <StatusBadge status={showDetail.status} />
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
              <div><span className="text-gray-500">Customer:</span> <span className="font-medium">{showDetail.customer?.companyName}</span></div>
              <div><span className="text-gray-500">Enquiry:</span> <span className="font-medium">{showDetail.enquiry?.enquiryNumber}</span></div>
              <div><span className="text-gray-500">Valid Until:</span> <span className="font-medium">{new Date(showDetail.validUntil).toLocaleDateString()}</span></div>
              <div><span className="text-gray-500">Created By:</span> <span className="font-medium">{showDetail.createdBy?.name}</span></div>
            </div>
            <table className="w-full text-sm mb-4">
              <thead><tr className="border-b bg-gray-50"><th className="text-left py-2 px-2">Product</th><th className="text-right py-2 px-2">Qty</th><th className="text-right py-2 px-2">Unit Price</th><th className="text-right py-2 px-2">Disc %</th><th className="text-right py-2 px-2">GST %</th><th className="text-right py-2 px-2">Amount</th></tr></thead>
              <tbody>
                {showDetail.items?.map((item) => (
                  <tr key={item.id} className="border-b"><td className="py-2 px-2">{item.product?.productName}</td><td className="text-right py-2 px-2">{item.quantity}</td><td className="text-right py-2 px-2">₹{Number(item.unitPrice).toLocaleString()}</td><td className="text-right py-2 px-2">{Number(item.discountPercent)}%</td><td className="text-right py-2 px-2">{Number(item.gstPercent)}%</td><td className="text-right py-2 px-2 font-medium">₹{Number(item.lineAmount).toLocaleString()}</td></tr>
                ))}
              </tbody>
            </table>
            <div className="border-t pt-3 space-y-1 text-sm text-right">
              <div>Subtotal: <span className="font-medium">₹{Number(showDetail.subtotal).toLocaleString()}</span></div>
              <div>Discount: <span className="font-medium text-red-600">-₹{Number(showDetail.discountAmount).toLocaleString()}</span></div>
              <div>GST: <span className="font-medium">₹{Number(showDetail.gstAmount).toLocaleString()}</span></div>
              <div className="text-base font-bold">Grand Total: ₹{Number(showDetail.grandTotal).toLocaleString()}</div>
            </div>

            {showDetail.salesOrder && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm">
                <span className="text-gray-600">Sales Order:</span> <span className="font-medium">{showDetail.salesOrder.orderNumber}</span> <StatusBadge status={showDetail.salesOrder.status} />
              </div>
            )}

            <div className="flex flex-wrap gap-2 mt-4">
              {showDetail.status === 'DRAFT' && (
                <button onClick={() => updateStatus(showDetail.id, 'SENT')} className="inline-flex items-center gap-1 bg-yellow-500 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-yellow-600"><Send className="w-3.5 h-3.5" /> Send</button>
              )}
              {showDetail.status === 'SENT' && (
                <>
                  <button onClick={() => updateStatus(showDetail.id, 'ACCEPTED')} className="inline-flex items-center gap-1 bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-green-700"><Check className="w-3.5 h-3.5" /> Accept</button>
                  <button onClick={() => updateStatus(showDetail.id, 'REJECTED')} className="inline-flex items-center gap-1 bg-red-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-red-700"><X className="w-3.5 h-3.5" /> Reject</button>
                </>
              )}
              {showDetail.status === 'ACCEPTED' && !showDetail.salesOrder && (
                <button onClick={() => convertToSO(showDetail.id)} className="inline-flex items-center gap-1 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-blue-700"><ArrowRight className="w-3.5 h-3.5" /> Convert to Sales Order</button>
              )}
              <button onClick={() => setShowDetail(null)} className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg text-sm">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-2">
        <form onSubmit={(e) => { e.preventDefault(); loadQuotations(); }} className="flex gap-2 flex-1">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search quotations..." className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <button type="submit" className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 text-sm">Search</button>
        </form>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
          <option value="">All Statuses</option>
          <option value="DRAFT">DRAFT</option>
          <option value="SENT">SENT</option>
          <option value="ACCEPTED">ACCEPTED</option>
          <option value="REJECTED">REJECTED</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Quotation #</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Enquiry</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Customer</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Grand Total</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">SO</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
              ) : quotations.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No quotations found</td></tr>
              ) : (
                quotations.map((q) => (
                  <tr key={q.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{q.quotationNumber}</td>
                    <td className="px-4 py-3 text-gray-600">{q.enquiry?.enquiryNumber}</td>
                    <td className="px-4 py-3 text-gray-600">{q.customer?.companyName}</td>
                    <td className="px-4 py-3 text-right font-medium">₹{Number(q.grandTotal).toLocaleString()}</td>
                    <td className="px-4 py-3"><StatusBadge status={q.status} /></td>
                    <td className="px-4 py-3 text-gray-600">{q.salesOrder ? q.salesOrder.orderNumber : '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => loadDetail(q.id)} className="text-blue-600 hover:text-blue-800 p-1" title="View"><Eye className="w-4 h-4" /></button>
                        {q.status === 'DRAFT' && <button onClick={() => updateStatus(q.id, 'SENT')} className="text-yellow-600 hover:text-yellow-800 p-1" title="Send"><Send className="w-4 h-4" /></button>}
                        {q.status === 'SENT' && <button onClick={() => updateStatus(q.id, 'ACCEPTED')} className="text-green-600 hover:text-green-800 p-1" title="Accept"><Check className="w-4 h-4" /></button>}
                        {q.status === 'ACCEPTED' && !q.salesOrder && <button onClick={() => convertToSO(q.id)} className="text-blue-600 hover:text-blue-800 p-1" title="Convert to SO"><ArrowRight className="w-4 h-4" /></button>}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
