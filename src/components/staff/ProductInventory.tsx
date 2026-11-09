import React, { useState, useRef } from 'react';
import { Product } from '../../types';
import { StorageService } from '../../services/storage';
import { GeminiService, AnalyzedProductData, BF_SUMA_CATEGORIES } from '../../services/geminiService';
import { useAuth } from '../../context/AuthContext';
import {
  Package,
  Plus,
  Edit2,
  Trash2,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  X,
  ArrowRight,
  Sparkles,
  Upload,
  Image as ImageIcon,
  Camera,
  FileText,
  FileUp,
  Loader2,
  ArrowDownAZ,
  ArrowUpAZ,
  Check,
  RefreshCw,
  HelpCircle,
  FileImage,
  Layers,
} from 'lucide-react';

interface ProductInventoryProps {
  products: Product[];
  onProductsUpdated: () => void;
  onNavigateToDailyReport?: () => void;
}

const SAMPLE_BF_SUMA_PHOTOS = [
  {
    name: 'ArthroXtra',
    category: 'Bones & Joints',
    url: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=300&q=80',
  },
  {
    name: 'ZaminoCal Plus',
    category: 'Bones & Joints',
    url: 'https://images.unsplash.com/photo-1512069772995-ec65ed45afd6?auto=format&fit=crop&w=300&q=80',
  },
  {
    name: 'Ganoderma Spores',
    category: 'Immune Boosters',
    url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=300&q=80',
  },
  {
    name: 'XPower Man Plus',
    category: 'Men\'s Health & Vitality',
    url: 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&w=300&q=80',
  },
];

export const ProductInventory: React.FC<ProductInventoryProps> = ({
  products,
  onProductsUpdated,
  onNavigateToDailyReport,
}) => {
  const { currentUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  // Form Scanner (Photo & PDF) Inputs
  const formImageInputRef = useRef<HTMLInputElement>(null);
  const formCameraInputRef = useRef<HTMLInputElement>(null);
  const formPdfInputRef = useRef<HTMLInputElement>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name-asc' | 'name-desc' | 'price-asc' | 'price-desc' | 'recent'>('name-asc');

  // Add Product Form State (Strictly: Name, Category, Price, PV, Photo — NO QUANTITY!)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newProdName, setNewProdName] = useState('');
  const [newProdPrice, setNewProdPrice] = useState<number | ''>('');
  const [newProdPv, setNewProdPv] = useState<number | ''>('');
  const [newProdCategory, setNewProdCategory] = useState('Bones & Joints');
  const [newProdImage, setNewProdImage] = useState<string>('');
  const [newProdDesc, setNewProdDesc] = useState<string>('');

  // Gemini AI Image Analysis State
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [aiDetectionBadge, setAiDetectionBadge] = useState<string | null>(null);

  // Form Scanner Modal State (Accepts PHOTO or PDF of BF Suma Order Form / Price Sheet)
  const [isFormScanModalOpen, setIsFormScanModalOpen] = useState(false);
  const [isScanningForm, setIsScanningForm] = useState(false);
  const [parsedFormProducts, setParsedFormProducts] = useState<Array<AnalyzedProductData & { selected: boolean }>>([]);
  const [scannedFormSource, setScannedFormSource] = useState<string | null>(null);

  // Edit Product Modal State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editProdName, setEditProdName] = useState('');
  const [editProdPrice, setEditProdPrice] = useState<number | ''>('');
  const [editProdPv, setEditProdPv] = useState<number | ''>('');
  const [editProdCategory, setEditProdCategory] = useState('');
  const [editProdImage, setEditProdImage] = useState<string>('');

  // Delete Confirmation State
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  // Notifications
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotice = (type: 'success' | 'error', message: string) => {
    setNotice({ type, message });
    setTimeout(() => setNotice(null), 5000);
  };

  const categories = BF_SUMA_CATEGORIES;

  // =========================================================================
  // GEMINI AI: PHOTO / CAMERA AUTO-POPULATION (SINGLE PRODUCT)
  // =========================================================================
  const handleAnalyzeImageWithGemini = async (base64Data: string) => {
    setIsAnalyzingImage(true);
    setAiDetectionBadge(null);

    try {
      const extracted = await GeminiService.analyzeProductImage(base64Data);
      setNewProdName(extracted.name);
      setNewProdPrice(extracted.price);
      setNewProdPv(extracted.pv ?? 18);
      if (extracted.category) {
        setNewProdCategory(extracted.category);
      }
      if (extracted.description) {
        setNewProdDesc(extracted.description);
      }
      setAiDetectionBadge(
        `Gemini AI detected BF Suma item: "${extracted.name}" (${extracted.category}, PV: ${extracted.pv ?? 18}, TZS ${extracted.price.toLocaleString()})`
      );
      showNotice(
        'success',
        `✨ Gemini AI successfully analyzed the photo and auto-populated BF Suma product details!`
      );
    } catch (err: any) {
      console.error('Gemini image analysis error:', err);
      showNotice(
        'error',
        err.message || 'Gemini API was unable to auto-detect details. You can enter details manually.'
      );
    } finally {
      setIsAnalyzingImage(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, isEdit = false, triggerAi = true) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showNotice('error', 'Please upload a valid image file (PNG, JPG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      if (isEdit) {
        setEditProdImage(base64);
      } else {
        setNewProdImage(base64);
        if (triggerAi) {
          await handleAnalyzeImageWithGemini(base64);
        }
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSelectSamplePhoto = async (sample: typeof SAMPLE_BF_SUMA_PHOTOS[0]) => {
    setNewProdImage(sample.url);
    setIsAnalyzingImage(true);
    try {
      const response = await fetch(sample.url);
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64data = reader.result as string;
        await handleAnalyzeImageWithGemini(base64data);
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      setIsAnalyzingImage(false);
      console.warn('Could not fetch sample image for AI scan', err);
    }
  };

  // =========================================================================
  // GEMINI AI: FORM SCANNER (PHOTO OR PDF OF ORDER FORM / PRICE SHEET)
  // "Weka uwezo wa system kuichukua picha na pdf ya fomu yenye majina ya bidhaa
  // kumbuka kwenye sehemu ya kuregister bidhaa haitokuwa na quantity itakuwa na
  // categories tu za bidhaa then angalia mfumo wa bidhaa za bf SumaTZ hizo ndio tutaitumia"
  // =========================================================================
  const handleScanForm = async (fileOrDataUrl: File | string, displayName: string, mimeType?: string) => {
    setIsScanningForm(true);
    setScannedFormSource(displayName);
    setParsedFormProducts([]);

    try {
      const result = await GeminiService.scanProductForm(fileOrDataUrl, mimeType);
      // Guarantee strictly sorted from A to Z
      const sorted = [...result.products]
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
        .map((p) => ({ ...p, selected: true }));

      setParsedFormProducts(sorted);
      showNotice(
        'success',
        `✨ Gemini AI successfully extracted ${sorted.length} BF Suma products organized Alphabetically (A to Z) from ${displayName}!`
      );
    } catch (err: any) {
      console.error('Gemini Form scanning error:', err);
      showNotice(
        'error',
        err.message || 'Failed to scan form with Gemini API.'
      );
    } finally {
      setIsScanningForm(false);
    }
  };

  const handleFormFileUpload = (e: React.ChangeEvent<HTMLInputElement>, isPdf: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (isPdf) {
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        showNotice('error', 'Please upload a valid PDF document (.pdf).');
        return;
      }
      handleScanForm(file, `PDF Form: ${file.name}`, 'application/pdf');
    } else {
      if (!file.type.startsWith('image/')) {
        showNotice('error', 'Please upload a valid form photo (PNG, JPG, WebP).');
        return;
      }
      handleScanForm(file, `Photo Form: ${file.name}`, file.type);
    }
    e.target.value = '';
  };

  const handleLoadSamplePdfForm = () => {
    const sample = GeminiService.createSampleCatalogPdfBlob();
    handleScanForm(sample.dataUrl, sample.filename, 'application/pdf');
  };

  const handleLoadSamplePhotoForm = () => {
    const dataUrl = GeminiService.createSampleFormImageDataUrl();
    handleScanForm(dataUrl, 'Sample_BF_Suma_Order_Form.jpg', 'image/svg+xml');
  };

  const handleToggleSelectAll = (select: boolean) => {
    setParsedFormProducts((prev) => prev.map((p) => ({ ...p, selected: select })));
  };

  const handleToggleFormItem = (index: number) => {
    setParsedFormProducts((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, selected: !item.selected } : item))
    );
  };

  const handleUpdateFormItem = (index: number, field: keyof AnalyzedProductData, value: string | number) => {
    setParsedFormProducts((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      if (field === 'name') {
        updated.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
      }
      return updated;
    });
  };

  // Import into catalog: strictly NO quantity field in registered products!
  const handleImportSelectedFormProducts = () => {
    const selected = parsedFormProducts.filter((p) => p.selected);
    if (selected.length === 0) {
      showNotice('error', 'Please select at least one product to import.');
      return;
    }

    selected.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

    const startingIdNum = products.length + 101;
    const newProducts: Product[] = selected.map((item, idx) => ({
      id: `BFS-${String(startingIdNum + idx).padStart(3, '0')}`,
      name: item.name.trim(),
      currentPrice: Number(item.price) || 64400,
      pv: Number(item.pv) || 18,
      category: item.category || 'Bones & Joints',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    StorageService.addProductsBatch(newProducts, currentUser?.username || 'staff');
    onProductsUpdated();

    setIsFormScanModalOpen(false);
    setParsedFormProducts([]);
    setScannedFormSource(null);

    showNotice(
      'success',
      `🎉 Successfully imported ${newProducts.length} BF Suma products organized Alphabetically (A to Z) with PV into the catalog!`
    );
  };

  // =========================================================================
  // CRUD HANDLERS
  // =========================================================================
  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName.trim() || newProdPrice === '' || newProdPv === '') {
      showNotice('error', 'Please fill in required fields: Product Name, Price, and PV.');
      return;
    }

    if (Number(newProdPrice) < 0 || Number(newProdPv) < 0) {
      showNotice('error', 'Product Price and PV must be non-negative numbers.');
      return;
    }

    const newId = `BFS-${String(products.length + 101).padStart(3, '0')}`;
    const newProduct: Product = {
      id: newId,
      name: newProdName.trim(),
      currentPrice: Number(newProdPrice),
      pv: Number(newProdPv),
      category: newProdCategory,
      imageUrl: newProdImage || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    StorageService.addProduct(newProduct, currentUser?.username || 'staff');
    onProductsUpdated();

    // Reset form & close modal
    setNewProdName('');
    setNewProdPrice('');
    setNewProdPv('');
    setNewProdImage('');
    setNewProdDesc('');
    setAiDetectionBadge(null);
    setIsAddModalOpen(false);

    showNotice(
      'success',
      `Product "${newProduct.name}" registered successfully with PV ${newProduct.pv} and auto-populated into the Daily Report!`
    );
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setEditProdName(p.name);
    setEditProdPrice(p.currentPrice);
    setEditProdPv(p.pv ?? 0);
    setEditProdCategory(p.category || 'Bones & Joints');
    setEditProdImage(p.imageUrl || '');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    if (!editProdName.trim() || editProdPrice === '' || editProdPv === '') {
      showNotice('error', 'Product Name, Price, and PV cannot be empty.');
      return;
    }

    if (Number(editProdPrice) < 0 || Number(editProdPv) < 0) {
      showNotice('error', 'Price and PV must be non-negative numbers.');
      return;
    }

    const updated = StorageService.updateProduct(
      editingProduct.id,
      {
        name: editProdName.trim(),
        currentPrice: Number(editProdPrice),
        pv: Number(editProdPv),
        category: editProdCategory,
        imageUrl: editProdImage || undefined,
      },
      currentUser?.username || 'staff'
    );

    if (updated) {
      onProductsUpdated();
      setEditingProduct(null);
      showNotice(
        'success',
        `Product "${updated.name}" updated successfully. Changes are synchronized to reporting forms.`
      );
    }
  };

  const handleConfirmDelete = () => {
    if (!productToDelete) return;

    const ok = StorageService.deleteProduct(productToDelete.id, currentUser?.username || 'staff');
    if (ok) {
      onProductsUpdated();
      showNotice('success', `Product "${productToDelete.name}" was removed from the inventory database.`);
    }
    setProductToDelete(null);
  };

  // Filtered & Sorted products calculation
  const filteredProducts = products
    .filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;

      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      if (sortBy === 'name-asc') {
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
      }
      if (sortBy === 'name-desc') {
        return b.name.localeCompare(a.name, undefined, { sensitivity: 'base' });
      }
      if (sortBy === 'price-asc') {
        return a.currentPrice - b.currentPrice;
      }
      if (sortBy === 'price-desc') {
        return b.currentPrice - a.currentPrice;
      }
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });

  const uniqueCategories = Array.from(new Set(products.map((p) => p.category || 'Bones & Joints'))).length;
  const averagePrice =
    products.length > 0 ? Math.round(products.reduce((acc, p) => acc + p.currentPrice, 0) / products.length) : 0;

  return (
    <div className="space-y-6">
      {/* Notice alert */}
      {notice && (
        <div
          className={`p-4 rounded-xl border flex items-start gap-3 shadow-sm ${
            notice.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {notice.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600" />
          ) : (
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />
          )}
          <div className="text-sm font-semibold">{notice.message}</div>
        </div>
      )}

      {/* Header & Stats Banner */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md">
                BF Suma Tanzania (BF Suma TZ) Products
              </span>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-600" />
                <span>Form Photo & PDF Scanner (A to Z)</span>
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 mt-2">
              BF Suma TZ Product Catalog & Registration
            </h2>
            <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
              Register BF Suma products using <strong>Form Photo Scan / Camera</strong> or <strong>PDF Order Form</strong>.
              Registration only records <strong>Product Name, Category, and Price (No Quantity)</strong>.
              Quantities sold are filled exclusively during the <strong>Daily Report (Step 2)</strong>.
            </p>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 shrink-0">
            {onNavigateToDailyReport && (
              <button
                onClick={onNavigateToDailyReport}
                className="w-full sm:w-auto px-3.5 py-2 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors flex items-center justify-center gap-1.5 min-h-[40px] shadow-xs"
              >
                <span>Step 2: Fill Daily Report</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {/* UNIFIED FORM SCANNER TRIGGER (PHOTO & PDF) */}
            <button
              onClick={() => setIsFormScanModalOpen(true)}
              className="w-full sm:w-auto px-3.5 py-2 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 min-h-[40px]"
            >
              <FileImage className="w-4 h-4 text-blue-200" />
              <span>Scan Form (Photo / PDF)</span>
              <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded text-white font-mono">A-Z</span>
            </button>

            {/* SINGLE PRODUCT REGISTRATION */}
            <button
              onClick={() => {
                setAiDetectionBadge(null);
                setIsAddModalOpen(true);
              }}
              className="w-full sm:w-auto px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 min-h-[40px]"
            >
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>Register Product</span>
            </button>
          </div>
        </div>

        {/* 3 Metrics Strip (No Total Valuation) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
          <div className="p-3 sm:p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              BF Suma Catalog Items
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl sm:text-2xl font-bold font-mono text-slate-900">{products.length}</span>
              <span className="text-xs text-slate-500">active products</span>
            </div>
          </div>

          <div className="p-3 sm:p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              BF Suma Categories
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl sm:text-2xl font-bold font-mono text-blue-700">{uniqueCategories}</span>
              <span className="text-xs text-slate-500">product lines</span>
            </div>
          </div>

          <div className="p-3 sm:p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Average Retail Price
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl sm:text-2xl font-bold font-mono text-emerald-700 tabular-nums">
                TZS {averagePrice.toLocaleString()}
              </span>
              <span className="text-xs text-slate-500">Tanzania retail</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search, Filter & Alphabetical Sort Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 flex-1">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search BF Suma product name, ID, or category..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white min-h-[38px]"
            />
          </div>

          {/* BF Suma Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white text-slate-700 min-h-[38px]"
          >
            <option value="all">All BF Suma Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Sort By Dropdown */}
          <div className="flex items-center gap-1.5">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white text-slate-700 min-h-[38px]"
            >
              <option value="name-asc">Alphabetical: A → Z</option>
              <option value="name-desc">Alphabetical: Z → A</option>
              <option value="price-asc">Price: Low → High</option>
              <option value="price-desc">Price: High → Low</option>
              <option value="recent">Recently Registered</option>
            </select>

            {/* Quick 1-Click Toggle for Alphabetical A to Z */}
            <button
              type="button"
              onClick={() => setSortBy(sortBy === 'name-asc' ? 'name-desc' : 'name-asc')}
              className={`px-2.5 py-2 rounded-lg border text-xs font-semibold flex items-center gap-1 min-h-[38px] transition-colors ${
                sortBy === 'name-asc'
                  ? 'bg-blue-50 border-blue-300 text-blue-700 font-bold'
                  : sortBy === 'name-desc'
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-bold'
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
              title="Toggle Alphabetical A-Z Order"
            >
              {sortBy === 'name-desc' ? <ArrowDownAZ className="w-4 h-4" /> : <ArrowUpAZ className="w-4 h-4" />}
              <span className="hidden sm:inline">A-Z</span>
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2 text-xs text-slate-500">
          <span>
            Showing <strong>{filteredProducts.length}</strong> of {products.length} BF Suma products
          </span>
          {sortBy === 'name-asc' && (
            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
              Sorted A → Z
            </span>
          )}
        </div>
      </div>

      {/* MOBILE CARDS VIEW */}
      <div className="block md:hidden space-y-3">
        {filteredProducts.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 bg-white rounded-xl border border-slate-200">
            No products match the selected filters or search query.
          </div>
        ) : (
          filteredProducts.map((p, idx) => (
            <div
              key={p.id}
              className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3"
            >
              <div className="flex items-start gap-3">
                <div className="w-14 h-14 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                  {p.imageUrl ? (
                    <img
                      src={p.imageUrl}
                      alt={p.name}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Package className="w-6 h-6 text-slate-400" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[10px] text-slate-400 uppercase">{p.id}</span>
                    {sortBy === 'name-asc' && (
                      <span className="text-[9px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded font-mono">
                        #{idx + 1}
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm leading-snug truncate">{p.name}</h3>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded bg-blue-50 text-blue-800 text-[10px] font-medium border border-blue-100">
                    {p.category || 'Bones & Joints'}
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleOpenEdit(p)}
                    className="p-2 rounded-lg text-slate-600 hover:text-blue-600 bg-slate-50 border border-slate-200 min-h-[36px] min-w-[36px] flex items-center justify-center"
                    title="Edit Product"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setProductToDelete(p)}
                    className="p-2 rounded-lg text-slate-600 hover:text-red-600 bg-slate-50 border border-slate-200 min-h-[36px] min-w-[36px] flex items-center justify-center"
                    title="Delete Product"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 block">Member Price:</span>
                  <strong className="font-mono text-emerald-700 text-sm font-bold">
                    TZS {p.currentPrice.toLocaleString()}
                  </strong>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-500 block">Point Value:</span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-50 text-amber-800 border border-amber-300">
                    {p.pv} PV
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* DESKTOP TABLE VIEW */}
      <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-3.5 w-12 text-center">#</th>
                <th className="py-3 px-3.5 w-16">Photo</th>
                <th className="py-3 px-3.5">
                  <div className="flex items-center gap-1.5">
                    <span>BF Suma Product Name & ID</span>
                    {sortBy === 'name-asc' && (
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-100/70 px-1.5 py-0.5 rounded font-mono">
                        A → Z
                      </span>
                    )}
                  </div>
                </th>
                <th className="py-3 px-3.5">BF Suma Category</th>
                <th className="py-3 px-3.5 text-center">Point Value (PV)</th>
                <th className="py-3 px-3.5 text-right">Member Price (TZS)</th>
                <th className="py-3 px-3.5 text-center">Daily Report Status</th>
                <th className="py-3 px-3.5 text-center w-28">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No products found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p, idx) => (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3.5 text-center font-mono text-slate-400">
                      {idx + 1}
                    </td>

                    <td className="py-2.5 px-3.5">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                        {p.imageUrl ? (
                          <img
                            src={p.imageUrl}
                            alt={p.name}
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Package className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                    </td>

                    <td className="py-2.5 px-3.5">
                      <span className="font-mono text-[10px] text-slate-400 uppercase block">
                        {p.id}
                      </span>
                      <strong className="text-slate-900 font-semibold text-xs">{p.name}</strong>
                    </td>

                    <td className="py-2.5 px-3.5">
                      <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 text-[10px] font-semibold border border-blue-200">
                        {p.category || 'Bones & Joints'}
                      </span>
                    </td>

                    <td className="py-2.5 px-3.5 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full font-mono text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300">
                        {p.pv} PV
                      </span>
                    </td>

                    <td className="py-2.5 px-3.5 text-right font-mono font-bold tabular-nums text-emerald-700 text-sm">
                      TZS {p.currentPrice.toLocaleString()}
                    </td>

                    <td className="py-2.5 px-3.5 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-semibold border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Ready in Daily Form</span>
                      </span>
                    </td>

                    <td className="py-2.5 px-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(p)}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Edit Product"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setProductToDelete(p)}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Delete Product"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-300 bg-slate-50 font-bold text-slate-900">
                <td colSpan={4} className="py-3 px-3.5 uppercase tracking-wider text-xs">
                  Total Active BF Suma Products:
                </td>
                <td className="py-3 px-3.5 text-center font-mono text-amber-800">
                  {filteredProducts.reduce((acc, p) => acc + (p.pv || 0), 0).toFixed(1)} PV
                </td>
                <td className="py-3 px-3.5 text-right font-mono text-emerald-700">
                  {filteredProducts.length} Products
                </td>
                <td colSpan={2} className="py-3 px-3.5 text-center text-slate-500 font-normal text-[11px]">
                  All items auto-populate into Daily Report form
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: REGISTER SINGLE PRODUCT (PHOTO + NAME + CATEGORY + PRICE)        */}
      {/* STRICT RULE: NO QUANTITY FIELD IN PRODUCT REGISTRATION                    */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white max-w-lg w-full rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">
            <div className="px-5 sm:px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Register BF Suma Product</h3>
                  <p className="text-[11px] text-slate-300">
                    Product Name, Category & Price (No Quantity Required)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="p-5 sm:p-6 space-y-4">
              {/* Product Photo Upload / Camera Scan Section */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-blue-600" />
                    <span>1. Take Photo or Upload Image</span>
                  </label>
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-blue-600" />
                    <span>Gemini AI Auto-Fills Form</span>
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative w-20 h-20 rounded-xl bg-white border-2 border-dashed border-slate-300 overflow-hidden flex items-center justify-center shrink-0 shadow-xs">
                    {newProdImage ? (
                      <img
                        src={newProdImage}
                        alt="Product Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-slate-400" />
                    )}

                    {isAnalyzingImage && (
                      <div className="absolute inset-0 bg-slate-900/70 flex flex-col items-center justify-center text-white p-1 text-center">
                        <Loader2 className="w-5 h-5 animate-spin text-emerald-400 mb-1" />
                        <span className="text-[8px] font-bold">AI Scan...</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handlePhotoUpload(e, false, true)}
                      className="hidden"
                    />
                    <input
                      ref={cameraInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => handlePhotoUpload(e, false, true)}
                      className="hidden"
                    />

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        disabled={isAnalyzingImage}
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50 min-h-[36px]"
                      >
                        <Camera className="w-4 h-4 text-blue-100" />
                        <span>Camera Snap</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isAnalyzingImage}
                        className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50 min-h-[36px]"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload File</span>
                      </button>

                      {newProdImage && (
                        <button
                          type="button"
                          onClick={() => {
                            setNewProdImage('');
                            setAiDetectionBadge(null);
                          }}
                          className="px-2.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-lg transition-colors min-h-[36px]"
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-500 leading-snug">
                      Snap or upload BF Suma product packaging. <strong>Gemini API</strong> inspects and auto-fills product name and category below.
                    </p>
                  </div>
                </div>

                {/* AI Detection Banner */}
                {aiDetectionBadge && (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-2 text-xs text-emerald-800">
                    <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-semibold block">✨ Gemini AI Auto-Detection:</strong>
                      <span>{aiDetectionBadge}</span>
                    </div>
                  </div>
                )}

                {/* BF Suma Sample Photo Presets */}
                <div className="pt-2 border-t border-slate-200">
                  <span className="text-[10px] font-semibold text-slate-500 block mb-1">
                    Or select sample BF Suma item for instant AI test:
                  </span>
                  <div className="grid grid-cols-4 gap-1.5">
                    {SAMPLE_BF_SUMA_PHOTOS.map((sample) => (
                      <button
                        key={sample.name}
                        type="button"
                        onClick={() => handleSelectSamplePhoto(sample)}
                        disabled={isAnalyzingImage}
                        className={`p-1 rounded-lg border text-[10px] font-medium flex flex-col items-center gap-1 transition-all ${
                          newProdImage === sample.url
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-800 font-bold ring-1 ring-emerald-500'
                            : 'border-slate-200 hover:bg-white text-slate-700'
                        }`}
                      >
                        <img
                          src={sample.url}
                          alt={sample.name}
                          className="w-7 h-7 rounded object-cover"
                        />
                        <span className="truncate w-full text-center">{sample.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Field: Product Name */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  2. BF Suma Product Name *
                </label>
                <input
                  type="text"
                  required
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                  placeholder="e.g. ArthroXtra Tablets (60 Tablets)"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 min-h-[40px] bg-white font-medium"
                />
              </div>

              {/* Field: Category (BF Suma Categories) */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  3. BF Suma Category *
                </label>
                <select
                  value={newProdCategory}
                  onChange={(e) => setNewProdCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white min-h-[40px]"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Field: Member Price */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    4. Member Price (TZS) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      required
                      value={newProdPrice}
                      onChange={(e) => setNewProdPrice(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="e.g. 112000"
                      className="w-full pl-3 pr-14 py-2 text-xs font-mono font-bold text-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 min-h-[40px] bg-white"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">
                      TZS
                    </span>
                  </div>
                </div>

                {/* Field: Point Value (PV) */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    5. Point Value (PV) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      required
                      value={newProdPv}
                      onChange={(e) => setNewProdPv(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="e.g. 18 or 34.5"
                      className="w-full pl-3 pr-12 py-2 text-xs font-mono font-bold text-amber-900 border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[40px] bg-amber-50/30"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-amber-700 font-bold">
                      PV
                    </span>
                  </div>
                </div>
              </div>

              {/* Notice reminding user: NO QUANTITY in registration */}
              <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-lg text-[11px] text-blue-900 flex items-start gap-2">
                <Check className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Catalog Registration (No Quantity):</strong> Only product name, category, member price, and PV are recorded here. Quantity sold is tracked and managed inside the <strong>Daily Operational Report</strong>.
                </span>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 min-h-[40px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAnalyzingImage}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1.5 min-h-[40px] disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Register & Auto-Populate</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: FORM SCANNER (PHOTO OR PDF OF ORDER FORM / PRICE SHEET)          */}
      {/* "Weka uwezo wa system kuichukua picha na pdf ya fomu yenye majina ya       */}
      {/* bidhaa kumbuka kwenye sehemu ya kuregister bidhaa haitokuwa na quantity   */}
      {/* itakuwa na categories tu za bidhaa then angalia mfumo wa bidhaa za        */}
      {/* bf SumaTZ hizo ndio tutaitumia"                                           */}
      {/* ========================================================================= */}
      {isFormScanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white max-w-2xl w-full rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-5 sm:px-6 py-4 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-blue-500/30 border border-blue-400/40 flex items-center justify-center shrink-0">
                  <FileImage className="w-5 h-5 text-blue-200" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold">Scan BF Suma TZ Form (Photo or PDF)</h3>
                    <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full">
                      Alphabetical A → Z
                    </span>
                  </div>
                  <p className="text-[11px] text-blue-200">
                    Reads BF Suma product names & categories from photos of paper forms or PDF documents
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsFormScanModalOpen(false);
                  setParsedFormProducts([]);
                  setScannedFormSource(null);
                }}
                className="text-blue-300 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
              {/* Dual Scanner Controls: PHOTO or PDF */}
              <div className="border-2 border-dashed border-blue-200 bg-blue-50/40 rounded-xl p-5 text-center space-y-3">
                {/* Hidden File Inputs */}
                <input
                  ref={formCameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => handleFormFileUpload(e, false)}
                  className="hidden"
                />
                <input
                  ref={formImageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFormFileUpload(e, false)}
                  className="hidden"
                />
                <input
                  ref={formPdfInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={(e) => handleFormFileUpload(e, true)}
                  className="hidden"
                />

                <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center mx-auto">
                  <FileImage className="w-6 h-6" />
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-900">
                    Scan BF Suma Tanzania Product Form or Price Sheet
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5 max-w-lg mx-auto">
                    Take a <strong>Camera Photo</strong> of a printed form, upload an <strong>Image</strong>, or upload a <strong>PDF document</strong>.
                    Gemini AI will extract all product names, match BF Suma categories, and arrange them from A to Z.
                  </p>
                </div>

                {/* 3 Upload Triggers */}
                <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                  {/* Option A: Camera Snap of Form */}
                  <button
                    type="button"
                    onClick={() => formCameraInputRef.current?.click()}
                    disabled={isScanningForm}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-50 min-h-[38px]"
                  >
                    <Camera className="w-4 h-4 text-blue-100" />
                    <span>Snap Form Photo</span>
                  </button>

                  {/* Option B: Upload Image File */}
                  <button
                    type="button"
                    onClick={() => formImageInputRef.current?.click()}
                    disabled={isScanningForm}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-50 min-h-[38px]"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Form Image</span>
                  </button>

                  {/* Option C: Upload PDF Document */}
                  <button
                    type="button"
                    onClick={() => formPdfInputRef.current?.click()}
                    disabled={isScanningForm}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-50 min-h-[38px]"
                  >
                    <FileText className="w-4 h-4 text-indigo-100" />
                    <span>Upload Form PDF</span>
                  </button>
                </div>

                {/* 1-Click Sample Form Testing */}
                <div className="pt-2 border-t border-blue-200/60 flex flex-wrap items-center justify-center gap-2">
                  <span className="text-[10px] text-slate-500 font-medium">Or test with sample BF Suma forms:</span>
                  <button
                    type="button"
                    onClick={handleLoadSamplePhotoForm}
                    disabled={isScanningForm}
                    className="px-2.5 py-1 bg-white hover:bg-slate-100 text-blue-800 border border-blue-300 text-[10px] font-bold rounded-md shadow-xs flex items-center gap-1 transition-colors disabled:opacity-50"
                  >
                    <Sparkles className="w-3 h-3 text-blue-600" />
                    <span>Try Sample Photo Form</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleLoadSamplePdfForm}
                    disabled={isScanningForm}
                    className="px-2.5 py-1 bg-white hover:bg-slate-100 text-indigo-800 border border-indigo-300 text-[10px] font-bold rounded-md shadow-xs flex items-center gap-1 transition-colors disabled:opacity-50"
                  >
                    <FileText className="w-3 h-3 text-indigo-600" />
                    <span>Try Sample PDF Form</span>
                  </button>
                </div>

                {scannedFormSource && (
                  <div className="text-[11px] text-slate-600 font-mono flex items-center justify-center gap-1.5 pt-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Processed Source: <strong>{scannedFormSource}</strong></span>
                  </div>
                )}
              </div>

              {/* Scanning Loading State */}
              {isScanningForm && (
                <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-3">
                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
                  <div>
                    <h5 className="text-xs font-bold text-slate-900">Gemini API is scanning BF Suma form...</h5>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Reading product lines, matching BF Suma categories, and sorting alphabetically (A → Z).
                    </p>
                  </div>
                </div>
              )}

              {/* Parsed Products Table (Alphabetically Sorted A to Z) */}
              {!isScanningForm && parsedFormProducts.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">
                          Extracted BF Suma Products ({parsedFormProducts.length})
                        </span>
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Alphabetically Ordered A → Z</span>
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Review products below. Product registration strictly captures Name, Category & Price (no quantity).
                      </p>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => handleToggleSelectAll(true)}
                        className="text-blue-700 hover:underline font-semibold"
                      >
                        Select All
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={() => handleToggleSelectAll(false)}
                        className="text-slate-600 hover:underline font-semibold"
                      >
                        Deselect All
                      </button>
                    </div>
                  </div>

                  {/* Strictly 4 Core Columns for Registration: Check, A-Z #, Name, Category, Price (NO Quantity!) */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[10px] uppercase sticky top-0">
                        <tr>
                          <th className="p-2.5 w-8 text-center">Select</th>
                          <th className="p-2.5 w-12 text-center">A-Z</th>
                          <th className="p-2.5">BF Suma Product Name</th>
                          <th className="p-2.5 w-44">BF Suma Category</th>
                          <th className="p-2.5 w-20 text-center">PV</th>
                          <th className="p-2.5 w-28 text-right">Member Price (TZS)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parsedFormProducts.map((item, idx) => (
                          <tr
                            key={idx}
                            className={`hover:bg-slate-50/70 transition-colors ${
                              item.selected ? 'bg-white' : 'bg-slate-50/40 opacity-60'
                            }`}
                          >
                            <td className="p-2.5 text-center">
                              <input
                                type="checkbox"
                                checked={item.selected}
                                onChange={() => handleToggleFormItem(idx)}
                                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                              />
                            </td>
                            <td className="p-2.5 text-center font-mono font-bold text-blue-700 text-[10px]">
                              #{idx + 1}
                            </td>
                            <td className="p-2.5">
                              <input
                                type="text"
                                value={item.name}
                                onChange={(e) => handleUpdateFormItem(idx, 'name', e.target.value)}
                                className="w-full px-2 py-1 text-xs font-semibold text-slate-900 border border-slate-200 rounded focus:border-blue-600 focus:outline-none"
                              />
                            </td>
                            <td className="p-2.5">
                              <select
                                value={item.category}
                                onChange={(e) => handleUpdateFormItem(idx, 'category', e.target.value)}
                                className="w-full px-2 py-1 text-[11px] border border-slate-200 rounded bg-white text-slate-800"
                              >
                                {categories.map((c) => (
                                  <option key={c} value={c}>
                                    {c}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="p-2.5 text-center">
                              <input
                                type="number"
                                step="any"
                                min="0"
                                value={item.pv ?? 18}
                                onChange={(e) => handleUpdateFormItem(idx, 'pv', Number(e.target.value))}
                                className="w-16 px-1.5 py-1 text-xs font-mono font-bold text-center text-amber-800 border border-slate-200 rounded focus:border-amber-500 focus:outline-none bg-amber-50/40"
                              />
                            </td>
                            <td className="p-2.5 text-right">
                              <input
                                type="number"
                                min="0"
                                value={item.price}
                                onChange={(e) => handleUpdateFormItem(idx, 'price', Number(e.target.value))}
                                className="w-24 px-2 py-1 text-xs font-mono font-bold text-right text-emerald-700 border border-slate-200 rounded focus:border-blue-600 focus:outline-none"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Reminder: No Quantity in Registration */}
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-600 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      Notice: Products are registered with <strong>Name, Category, and Price only</strong>. Daily quantities sold are entered in <strong>Step 2 (Daily Operational Report)</strong>.
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 sm:px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
              <div className="text-xs text-slate-600">
                {parsedFormProducts.length > 0 && (
                  <span>
                    Selected: <strong>{parsedFormProducts.filter((p) => p.selected).length}</strong> of{' '}
                    {parsedFormProducts.length} items to register
                  </span>
                )}
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsFormScanModalOpen(false);
                    setParsedFormProducts([]);
                    setScannedFormSource(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Close
                </button>

                {parsedFormProducts.length > 0 && (
                  <button
                    type="button"
                    onClick={handleImportSelectedFormProducts}
                    disabled={parsedFormProducts.filter((p) => p.selected).length === 0}
                    className="px-5 py-2 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                    <span>
                      Import {parsedFormProducts.filter((p) => p.selected).length} Products (A to Z)
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: EDIT PRODUCT                                                    */}
      {/* ========================================================================= */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white max-w-lg w-full rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">
            <div className="px-5 sm:px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
                  <Edit2 className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Edit Product: {editingProduct.id}</h3>
                  <p className="text-[11px] text-slate-300">
                    Update Product Photo, Name, Category, or Price
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingProduct(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 sm:p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Product Photo
                </label>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-300 overflow-hidden flex items-center justify-center shrink-0">
                    {editProdImage ? (
                      <img
                        src={editProdImage}
                        alt="Product Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <input
                      ref={editFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handlePhotoUpload(e, true, false)}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => editFileInputRef.current?.click()}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Change Photo</span>
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  value={editProdName}
                  onChange={(e) => setEditProdName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 min-h-[40px]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Category *
                </label>
                <select
                  value={editProdCategory}
                  onChange={(e) => setEditProdCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white min-h-[40px]"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Member Price (TZS) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editProdPrice}
                    onChange={(e) => setEditProdPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-mono font-bold text-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 min-h-[40px]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Point Value (PV) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    required
                    value={editProdPv}
                    onChange={(e) => setEditProdPv(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-mono font-bold text-amber-900 border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[40px] bg-amber-50/30"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 min-h-[40px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1.5 min-h-[40px]"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: DELETE CONFIRMATION                                              */}
      {/* ========================================================================= */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white max-w-sm w-full rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900">Delete Product</h3>
              <p className="text-xs text-slate-600 mt-1">
                Are you sure you want to remove <strong>"{productToDelete.name}"</strong> ({productToDelete.id}) from the catalog?
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                className="flex-1 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors min-h-[38px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors min-h-[38px]"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
