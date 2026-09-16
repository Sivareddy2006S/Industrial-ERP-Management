import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Plus, Search, Building2 } from 'lucide-react';

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    companyName: '', contactPerson: '', mobile: '', email: '', city: '',
  });

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/customers', { params: { search: search || undefined } });
      setCustomers(res.data.data);
    } catch (err) {
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    loadCustomers();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/customers', form);
      toast.success('Customer created successfully');
      setShowForm(false);
      setForm({ companyName: '', contactPerson: '', mobile: '', email: '', city: '' });
      loadCustomers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create customer');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-sm text-gray-500">{customers.length} total customers</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          New Customer
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h3 className="font-semibold text-gray-900">Create New Customer</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { key: 'companyName', label: 'Company Name', type: 'text' },
              { key: 'contactPerson', label: 'Contact Person', type: 'text' },
              { key: 'mobile', label: 'Mobile', type: 'text' },
              { key: 'email', label: 'Email', type: 'email' },
              { key: 'city', label: 'City', type: 'text' },
            ].map(({ key, label, type }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                <input
                  type={type}
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                  required
                />
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-2">
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium">
              Create Customer
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 text-sm">
              Cancel
            </button>
          </div>
        </form>
      )}

      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customers..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
          />
        </div>
        <button type="submit" className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 text-sm">
          Search
        </button>
      </form>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Company</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Contact</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Mobile</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">City</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
              ) : customers.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No customers found</td></tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-gray-400" />
                      {c.companyName}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{c.contactPerson}</td>
                    <td className="px-4 py-3 text-gray-600">{c.mobile}</td>
                    <td className="px-4 py-3 text-gray-600">{c.email}</td>
                    <td className="px-4 py-3 text-gray-600">{c.city}</td>
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
