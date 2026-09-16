import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import StatusBadge from '../components/StatusBadge';
import { Plus, Search, Trash2, Eye } from 'lucide-react';

export default function EnquiriesPage() {
  const [enquiries, setEnquiries] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({
    customerId: '',
    requiredDate: '',
    notes: '',
    items: [{ productId: '', quantity: '' }],
  });

  useEffect(() => {
    loadEnquiries();
  }, [statusFilter]);

  useEffect(() => {
    if (showForm) {
      api.get('/customers').then((r) => setCustomers(r.data.data)).catch(() => {});
      api.get('/products').then((r) => setProducts(r.data.data)).catch(() => {});
    }
  }, [showForm]);

  const loadEnquiries = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const res = await api.get('/enquiries', { params });
      setEnquiries(res.data.data);
    } catch {
      toast.error('Failed to load enquiries');
    } finally {
      setLoading(false);
    }
  };

  const loadDetail = async (id) => {
    try {
      const res = await api.get(`/enquiries/${id}`);
      setShowDetail(res.data.data);
    } catch {
      toast.error('Failed to load details');
    }
  };

  const addItem = () => setForm({ ...form, items: [...form.items, { productId: '', quantity: '' }] });
  const removeItem = (i) => setForm({ ...form, items: form.items.filter((_, idx) => idx !== i) });
  const updateItem = (i, field, value) => {
    const items = [...form.items];
    items[i] = { ...items[i], [field]: value };
    setForm({ ...form, items });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/enquiries', {
        customerId: parseInt(form.customerId),
        requiredDate: form.requiredDate,
        notes: form.notes || undefined,
        items: form.items.map((i) => ({
          productId: parseInt(i.productId),
          quantity: parseInt(i.quantity),
        })),
      });
      toast.success('Enquiry created');
      setShowForm(false);
      setForm({ customerId: '', requiredDate: '', notes: '', items: [{ productId: '', quantity: '' }] });
      loadEnquiries();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create enquiry');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Enquiries</h1>
          <p className="text-sm text-gray-500">{enquiries.length} total enquiries</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-medium">
          <Plus className="w-4 h-4" /> New Enquiry
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h3 className="font-semibold text-gray-900">Create Enquiry</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
              <select value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" required>
                <option value="">Select customer...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.companyName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Required Date</label>
              <input type="date" value={form.requiredDate} onChange={(e) => setForm({ ...form, requiredDate: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" required />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" rows={2} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Products</label>
              <button type="button" onClick={addItem} className="text-blue-600 text-sm hover:underline">+ Add product</button>
            </div>
            <div className="space-y-2">
              {form.items.map((item, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <select value={item.productId} onChange={(e) => updateItem(i, 'productId', e.target.value)} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" required>
                    <option value="">Select product...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.productCode} - {p.productName}</option>
                    ))}
                  </select>
                  <input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(i, 'quantity', e.target.value)} placeholder="Qty" className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm" required />
                  {form.items.length > 1 && (
                    <button type="button" onClick={() => removeItem(i)} className="text-red-500 hover:text-red-700 p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium">Create Enquiry</button>
            <button type="button" onClick={() => setShowForm(false)} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 text-sm">Cancel</button>
          </div>
        </form>
      )}

      {/* Detail Modal */}
      {showDetail && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowDetail(null)}>
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{showDetail.enquiryNumber}</h3>
              <StatusBadge status={showDetail.status} />
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
              <div><span className="text-gray-500">Customer:</span> <span className="font-medium">{showDetail.customer?.companyName}</span></div>
              <div><span className="text-gray-500">Required Date:</span> <span className="font-medium">{new Date(showDetail.requiredDate).toLocaleDateString()}</span></div>
              <div><span className="text-gray-500">Created By:</span> <span className="font-medium">{showDetail.createdBy?.name}</span></div>
              {showDetail.notes && <div className="col-span-2"><span className="text-gray-500">Notes:</span> <span className="font-medium">{showDetail.notes}</span></div>}
            </div>
            <table className="w-full text-sm border-t">
              <thead><tr className="border-b"><th className="text-left py-2">Product</th><th className="text-left py-2">Code</th><th className="text-right py-2">Quantity</th></tr></thead>
              <tbody>
                {showDetail.items?.map((item) => (
                  <tr key={item.id} className="border-b"><td className="py-2">{item.product?.productName}</td><td className="py-2">{item.product?.productCode}</td><td className="text-right py-2">{item.quantity}</td></tr>
                ))}
              </tbody>
            </table>
            {showDetail.quotations?.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Quotations</h4>
                <div className="space-y-1">
                  {showDetail.quotations.map((q) => (
                    <div key={q.id} className="flex items-center gap-2 text-sm">
                      <span>{q.quotationNumber}</span>
                      <StatusBadge status={q.status} />
                      <span className="text-gray-500">₹{Number(q.grandTotal).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <button onClick={() => setShowDetail(null)} className="mt-4 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm">Close</button>
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <form onSubmit={(e) => { e.preventDefault(); loadEnquiries(); }} className="flex gap-2 flex-1">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search enquiries..." className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <button type="submit" className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 text-sm">Search</button>
        </form>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
          <option value="">All Statuses</option>
          <option value="NEW">NEW</option>
          <option value="QUOTED">QUOTED</option>
          <option value="WON">WON</option>
          <option value="LOST">LOST</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Enquiry #</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Customer</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Items</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Required Date</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
              ) : enquiries.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No enquiries found</td></tr>
              ) : (
                enquiries.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{e.enquiryNumber}</td>
                    <td className="px-4 py-3 text-gray-600">{e.customer?.companyName}</td>
                    <td className="px-4 py-3 text-gray-600">{e.items?.length || 0} products</td>
                    <td className="px-4 py-3 text-gray-600">{new Date(e.requiredDate).toLocaleDateString()}</td>
                    <td className="px-4 py-3"><StatusBadge status={e.status} /></td>
                    <td className="px-4 py-3">
                      <button onClick={() => loadDetail(e.id)} className="text-blue-600 hover:text-blue-800 p-1"><Eye className="w-4 h-4" /></button>
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
