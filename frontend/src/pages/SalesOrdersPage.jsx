import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import StatusBadge from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { Search, Eye, CheckCircle, Truck } from 'lucide-react';

export default function SalesOrdersPage() {
  const { isAdmin } = useAuth();
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showDetail, setShowDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dispatchForm, setDispatchForm] = useState({ vehicleNumber: '', driverName: '' });
  const [showDispatch, setShowDispatch] = useState(false);

  useEffect(() => { loadOrders(); }, [statusFilter]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const res = await api.get('/sales-orders', { params });
      setOrders(res.data.data);
    } catch {
      toast.error('Failed to load sales orders');
    } finally {
      setLoading(false);
    }
  };

  const loadDetail = async (id) => {
    try {
      const res = await api.get(`/sales-orders/${id}`);
      setShowDetail(res.data.data);
      setShowDispatch(false);
    } catch {
      toast.error('Failed to load details');
    }
  };

  const confirmOrder = async (id) => {
    try {
      await api.post(`/sales-orders/${id}/confirm`);
      toast.success('Order confirmed & inventory reserved');
      loadOrders();
      if (showDetail) loadDetail(id);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to confirm order');
    }
  };

  const dispatchOrder = async (id) => {
    try {
      await api.post(`/sales-orders/${id}/dispatch`, dispatchForm);
      toast.success('Order dispatched');
      setDispatchForm({ vehicleNumber: '', driverName: '' });
      setShowDispatch(false);
      loadOrders();
      if (showDetail) loadDetail(id);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to dispatch');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Sales Orders</h1>
        <p className="text-sm text-gray-500">{orders.length} total orders</p>
      </div>

      {/* Detail Modal */}
      {showDetail && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowDetail(null)}>
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{showDetail.orderNumber}</h3>
              <StatusBadge status={showDetail.status} />
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
              <div><span className="text-gray-500">Customer:</span> <span className="font-medium">{showDetail.customer?.companyName}</span></div>
              <div><span className="text-gray-500">Quotation:</span> <span className="font-medium">{showDetail.quotation?.quotationNumber}</span></div>
              <div><span className="text-gray-500">Order Date:</span> <span className="font-medium">{new Date(showDetail.orderDate).toLocaleDateString()}</span></div>
              <div><span className="text-gray-500">Total:</span> <span className="font-bold">₹{Number(showDetail.totalAmount).toLocaleString()}</span></div>
            </div>

            <table className="w-full text-sm mb-4">
              <thead><tr className="border-b bg-gray-50">
                <th className="text-left py-2 px-2">Product</th>
                <th className="text-right py-2 px-2">Qty</th>
                <th className="text-right py-2 px-2">Unit Price</th>
                <th className="text-right py-2 px-2">Amount</th>
                <th className="text-right py-2 px-2">Available</th>
              </tr></thead>
              <tbody>
                {showDetail.items?.map((item) => (
                  <tr key={item.id} className="border-b">
                    <td className="py-2 px-2">{item.product?.productName} <span className="text-gray-400">({item.product?.productCode})</span></td>
                    <td className="text-right py-2 px-2">{item.quantity}</td>
                    <td className="text-right py-2 px-2">₹{Number(item.unitPrice).toLocaleString()}</td>
                    <td className="text-right py-2 px-2 font-medium">₹{Number(item.lineAmount).toLocaleString()}</td>
                    <td className="text-right py-2 px-2">
                      {item.product?.inventory ? (
                        <span className={item.product.inventory.availableQuantity >= item.quantity ? 'text-green-600' : 'text-red-600'}>
                          {item.product.inventory.availableQuantity}
                        </span>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Dispatch Info */}
            {showDetail.dispatch && (
              <div className="p-3 bg-green-50 rounded-lg text-sm mb-4">
                <h4 className="font-medium text-green-800 mb-1">Dispatch: {showDetail.dispatch.dispatchNumber}</h4>
                <div className="grid grid-cols-2 gap-2 text-green-700">
                  <div>Date: {new Date(showDetail.dispatch.dispatchDate).toLocaleDateString()}</div>
                  <div>Vehicle: {showDetail.dispatch.vehicleNumber}</div>
                  <div>Driver: {showDetail.dispatch.driverName}</div>
                  <div>By: {showDetail.dispatch.processedBy?.name}</div>
                </div>
              </div>
            )}

            {/* Dispatch Form */}
            {showDispatch && (
              <div className="p-4 bg-gray-50 rounded-lg mb-4 space-y-3">
                <h4 className="font-medium text-gray-900">Dispatch Details</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Vehicle Number</label>
                    <input type="text" value={dispatchForm.vehicleNumber} onChange={(e) => setDispatchForm({ ...dispatchForm, vehicleNumber: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" required />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Driver Name</label>
                    <input type="text" value={dispatchForm.driverName} onChange={(e) => setDispatchForm({ ...dispatchForm, driverName: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" required />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => dispatchOrder(showDetail.id)} disabled={!dispatchForm.vehicleNumber || !dispatchForm.driverName} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50">Confirm Dispatch</button>
                  <button onClick={() => setShowDispatch(false)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm">Cancel</button>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {isAdmin && showDetail.status === 'PENDING' && (
                <button onClick={() => confirmOrder(showDetail.id)} className="inline-flex items-center gap-1 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-blue-700">
                  <CheckCircle className="w-3.5 h-3.5" /> Confirm & Reserve
                </button>
              )}
              {isAdmin && showDetail.status === 'CONFIRMED' && !showDetail.dispatch && !showDispatch && (
                <button onClick={() => setShowDispatch(true)} className="inline-flex items-center gap-1 bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-green-700">
                  <Truck className="w-3.5 h-3.5" /> Dispatch
                </button>
              )}
              <button onClick={() => setShowDetail(null)} className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg text-sm">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-2">
        <form onSubmit={(e) => { e.preventDefault(); loadOrders(); }} className="flex gap-2 flex-1">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search orders..." className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <button type="submit" className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 text-sm">Search</button>
        </form>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
          <option value="">All Statuses</option>
          <option value="PENDING">PENDING</option>
          <option value="CONFIRMED">CONFIRMED</option>
          <option value="DISPATCHED">DISPATCHED</option>
          <option value="CANCELLED">CANCELLED</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Order #</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Customer</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Quotation</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Total</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Dispatch</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No orders found</td></tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{o.orderNumber}</td>
                    <td className="px-4 py-3 text-gray-600">{o.customer?.companyName}</td>
                    <td className="px-4 py-3 text-gray-600">{o.quotation?.quotationNumber}</td>
                    <td className="px-4 py-3 text-right font-medium">₹{Number(o.totalAmount).toLocaleString()}</td>
                    <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                    <td className="px-4 py-3 text-gray-600">{o.dispatch ? o.dispatch.dispatchNumber : '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => loadDetail(o.id)} className="text-blue-600 hover:text-blue-800 p-1"><Eye className="w-4 h-4" /></button>
                        {isAdmin && o.status === 'PENDING' && (
                          <button onClick={() => confirmOrder(o.id)} className="text-green-600 hover:text-green-800 p-1" title="Confirm"><CheckCircle className="w-4 h-4" /></button>
                        )}
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
