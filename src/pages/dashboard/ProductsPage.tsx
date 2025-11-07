import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Plus, Edit, Trash2, X, Filter } from 'lucide-react';
import { useSupabaseTable } from '../../hooks/useSupabaseTable';
import type { Product } from '../../types/supabase';

export const ProductsPage: React.FC = () => {
  const {
    data: products,
    loading,
    error,
    addItem,
    updateItem,
    deleteItem,
  } = useSupabaseTable<Product>({ tableName: 'products', enableRealtime: true });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    price: '',
    stock: '',
    status: 'active' as 'active' | 'inactive',
  });

  const openAddModal = () => {
    setIsEditMode(false);
    setSelectedProduct(null);
    setFormData({ name: '', category: '', price: '', stock: '', status: 'active' });
    setIsModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setIsEditMode(true);
    setSelectedProduct(product);
    setFormData({
      name: product.name,
      category: product.category,
      price: product.price.toString(),
      stock: product.stock.toString(),
      status: product.status,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData({ name: '', category: '', price: '', stock: '', status: 'active' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditMode && selectedProduct) {
        await updateItem(selectedProduct.id, {
          name: formData.name,
          category: formData.category,
          price: parseFloat(formData.price),
          stock: parseInt(formData.stock),
          status: formData.status,
        });
      } else {
        await addItem({
          name: formData.name,
          category: formData.category,
          price: parseFloat(formData.price),
          stock: parseInt(formData.stock),
          status: formData.status,
        });
      }
      closeModal();
    } catch (err) {
      console.error('Error saving product:', err);
      alert('Failed to save product. Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await deleteItem(id);
        setSelectedIds(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      } catch (err) {
        console.error('Error deleting product:', err);
        alert('Failed to delete product. Please try again.');
      }
    }
  };

  // Get unique categories for filter dropdown
  const uniqueCategories = Array.from(new Set(products.map(p => p.category)));

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || product.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const handleSelectAll = () => {
    if (selectedIds.size === filteredProducts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredProducts.map(p => p.id)));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (loading && products.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-[#E5E7EB] mb-2">Products</h1>
            <p className="text-[#E5E7EB]/70 text-lg">Manage your product catalog</p>
          </div>
        </div>
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-[#E5E7EB]/70">Loading products...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-[#E5E7EB] mb-2">Products</h1>
            <p className="text-[#E5E7EB]/70 text-lg">Manage your product catalog</p>
          </div>
        </div>
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-red-400">Error: {error}</p>
            <Button onClick={() => window.location.reload()} className="mt-4">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-3xl font-bold text-[#E5E7EB] mb-2">Products</h1>
          <p className="text-[#E5E7EB]/70 text-lg">Manage your product catalog</p>
        </div>
        <Button onClick={openAddModal}>
          <Plus size={20} className="mr-2" />
          Add Product
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="!pt-4 !pb-3 !px-6">
          <CardTitle className="flex items-center gap-2">
            <Filter size={20} />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="!pt-0 !px-6 !pb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Search by Name"
              placeholder="Enter product name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div>
              <label className="block text-sm font-medium text-[#E5E7EB]/90 mb-2">Category</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg text-[#E5E7EB] focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]"
              >
                <option value="all">All Categories</option>
                {uniqueCategories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#E5E7EB]/90 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg text-[#E5E7EB] focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b border-[#1E223D] flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleSelectAll}
                className="text-sm text-[#E5E7EB]/70 hover:text-[#E5E7EB] transition"
              >
                {selectedIds.size === filteredProducts.length && filteredProducts.length > 0
                  ? 'Deselect All'
                  : 'Select All'}
              </button>
              {selectedIds.size > 0 && (
                <span className="text-sm text-[#E5E7EB]/70">
                  {selectedIds.size} selected
                </span>
              )}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1E223D]">
                  <th className="px-6 py-5 text-left text-sm font-semibold text-[#E5E7EB] w-12">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === filteredProducts.length && filteredProducts.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded border-white/20 bg-white/5 text-[#8B5CF6] focus:ring-[#8B5CF6] focus:ring-offset-0 cursor-pointer"
                    />
                  </th>
                  <th className="px-6 py-5 text-left text-sm font-semibold text-[#E5E7EB]">Name</th>
                  <th className="px-6 py-5 text-left text-sm font-semibold text-[#E5E7EB]">Category</th>
                  <th className="px-6 py-5 text-left text-sm font-semibold text-[#E5E7EB]">Price</th>
                  <th className="px-6 py-5 text-left text-sm font-semibold text-[#E5E7EB]">Stock</th>
                  <th className="px-6 py-5 text-left text-sm font-semibold text-[#E5E7EB]">Status</th>
                  <th className="px-6 py-5 text-left text-sm font-semibold text-[#E5E7EB]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="border-b border-[#1E223D] hover:bg-white/5 transition">
                    <td className="px-6 py-5">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(product.id)}
                        onChange={() => handleToggleSelect(product.id)}
                        className="w-4 h-4 rounded border-white/20 bg-white/5 text-[#8B5CF6] focus:ring-[#8B5CF6] focus:ring-offset-0 cursor-pointer"
                      />
                    </td>
                    <td className="px-6 py-5 text-sm text-[#E5E7EB]">{product.name}</td>
                    <td className="px-6 py-5 text-sm text-[#E5E7EB]">{product.category}</td>
                    <td className="px-6 py-5 text-sm text-[#E5E7EB]">
                      {product.price.toLocaleString('vi-VN')} VND
                    </td>
                    <td className="px-6 py-5 text-sm text-[#E5E7EB]">{product.stock}</td>
                    <td className="px-6 py-5">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        product.status === 'active' 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {product.status}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEditModal(product)}
                          className="p-2 rounded hover:bg-white/10 text-[#E5E7EB] transition"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="p-2 rounded hover:bg-red-500/10 text-red-400 transition"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredProducts.length === 0 && (
              <div className="p-12 text-center text-[#E5E7EB]/70">
                {products.length === 0
                  ? 'No products found. Add your first product to get started.'
                  : 'No products match your filters.'}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-[#12163A] to-[#181C3B] rounded-lg border border-[#1E223D] p-6 lg:p-8 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-[#E5E7EB]">
                {isEditMode ? 'Edit Product' : 'Add Product'}
              </h3>
              <button onClick={closeModal} className="text-[#E5E7EB]/70 hover:text-[#E5E7EB]">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                label="Product Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <Input
                label="Category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                required
              />
              <Input
                label="Price (VND)"
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                required
              />
              <Input
                label="Stock"
                type="number"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                required
              />
              <div>
                <label className="block text-sm font-medium text-[#E5E7EB]/90 mb-2">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                  className="w-full px-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg text-[#E5E7EB] focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <Button type="button" variant="outline" onClick={closeModal}>
                  Cancel
                </Button>
                <Button type="submit">
                  {isEditMode ? 'Update' : 'Add'} Product
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

