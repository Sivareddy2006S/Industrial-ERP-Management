import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { Package } from 'lucide-react';

export default function InventoryPage() {
  const { isAdmin } = useAuth();
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => { loadInventory(); }, []);

  const loadInventory = async () => {
    try {
      setLoading(true);
      const res = await api.get('/inventory');
      setInventory(res.data.data);
    } catch {
      toast.error('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (inv) => {
    setEditing(inv.productId);
    setEditValue(String(inv.physicalQuantity));
  };

  const saveEdit = async (productId) => {
    try {
      await api.patch(`/inventory/${productId}`, { physicalQuantity: parseInt(editValue) });
      toast.success('Inventory updated');
      setEditing(null);
      loadInventory();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
        <p className="text-sm text-gray-500">Manage product stock levels</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Product</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Code</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Category</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Physical</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Reserved</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Available</th>
                {isAdmin && <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
              ) : inventory.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No inventory records</td></tr>
              ) : (
                inventory.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900 flex items-center gap-2">
                      <Package className="w-4 h-4 text-gray-400" />
                      {inv.product?.productName}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{inv.product?.productCode}</td>
                    <td className="px-4 py-3 text-gray-600">{inv.product?.category}</td>
                    <td className="px-4 py-3 text-right">
                      {editing === inv.productId ? (
                        <input type="number" min="0" value={editValue} onChange={(e) => setEditValue(e.target.value)} className="w-24 px-2 py-1 border border-gray-300 rounded text-sm text-right" autoFocus />
                      ) : (
                        <span className="font-medium">{inv.physicalQuantity}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-yellow-600 font-medium">{inv.reservedQuantity}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-bold ${inv.availableQuantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {inv.availableQuantity}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3">
                        {editing === inv.productId ? (
                          <div className="flex gap-1">
                            <button onClick={() => saveEdit(inv.productId)} className="text-green-600 hover:text-green-800 text-xs font-medium">Save</button>
                            <button onClick={() => setEditing(null)} className="text-gray-500 hover:text-gray-700 text-xs">Cancel</button>
                          </div>
                        ) : (
                          <button onClick={() => startEdit(inv)} className="text-blue-600 hover:text-blue-800 text-xs font-medium">Edit</button>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
        <strong>Formula:</strong> Available Quantity = Physical Quantity − Reserved Quantity
      </div>
    </div>
  );
}
