import React, { useState, useEffect } from 'react';
import { 
  QuotationData, 
  DEFAULT_COMPANY_INFO, 
  DEFAULT_NOTES, 
  QuoteItem 
} from './types';
import { QuotationPreview } from './components/QuotationPreview';
import { 
  Save, 
  Printer, 
  FilePlus, 
  Cloud, 
  Trash2, 
  RefreshCw,
  Loader2,
  Check,
  ChevronDown,
  AlertTriangle
} from './components/Icons';
import { 
  saveQuotationToCloud, 
  fetchQuotationsFromCloud, 
  deleteQuotationFromCloud 
} from './services/storage';
import { isFirebaseConfigured } from './firebaseConfig';

// --- Helper: Generate ROC Filename ---
// Format: 民國年月日_祥鉞不鏽鋼_客戶名稱 (e.g., 1131024_祥鉞不鏽鋼_王小明)
const getFormattedFileName = (dateStr: string, clientName: string) => {
  if (!dateStr) return '報價單';
  const parts = dateStr.split('-'); // Expect YYYY-MM-DD
  if (parts.length !== 3) return '報價單';
  
  const year = parseInt(parts[0]) - 1911;
  const month = parts[1];
  const day = parts[2];
  const cName = clientName.trim() || '客戶名稱';
  
  return `${year}${month}${day}_祥鉞不鏽鋼_${cName}`;
};

// --- Math Captcha Helper ---
const generateMathProblem = () => {
  const num1 = Math.floor(Math.random() * 9) + 1; // 1-9
  const num2 = Math.floor(Math.random() * 9) + 1; // 1-9
  const answer = num1 + num2;
  
  // Generate options (one correct, two wrong)
  const options = new Set<number>();
  options.add(answer);
  while (options.size < 3) {
    let wrong = answer + Math.floor(Math.random() * 5) - 2; // Close range
    if (wrong > 0 && wrong !== answer) options.add(wrong);
  }
  
  return {
    question: `${num1} + ${num2} = ?`,
    answer: answer,
    options: Array.from(options).sort(() => Math.random() - 0.5)
  };
};

const App: React.FC = () => {
  // --- Init State from LocalStorage for Theme ---
  const savedTheme = localStorage.getItem('app_theme_color') || '#1f2937';

  // --- State ---
  const [quotation, setQuotation] = useState<QuotationData>({
    fileName: '', 
    companyInfo: DEFAULT_COMPANY_INFO,
    clientInfo: { name: '', contact: '', address: '', phone: '' },
    quoteDetails: {
      number: `Q-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}001`,
      date: new Date().toISOString().split('T')[0],
      taxRate: 5,
    },
    items: [
      { id: 1, name: '不鏽鋼工作台', spec: '120x60x80cm, SUS304', description: null, quantity: 1, price: 8500 },
    ],
    themeColor: savedTheme,
    logo: null,
    seal: null,
    salesPerson: '簡呈光 0923-866-222',
    notes: DEFAULT_NOTES,
    extraNote: '',
    discount: 0,
    isTaxInclusive: false,
  });

  const [savedFiles, setSavedFiles] = useState<QuotationData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [showFileMenu, setShowFileMenu] = useState(false);

  // --- Delete Modal State ---
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    file: QuotationData | null;
    problem: { question: string, answer: number, options: number[] };
  }>({
    isOpen: false,
    file: null,
    problem: { question: '', answer: 0, options: [] }
  });

  // --- Effects ---
  useEffect(() => {
    if (isFirebaseConfigured) {
      loadFileList();
    }
  }, []);

  // Persist Theme Selection
  useEffect(() => {
    localStorage.setItem('app_theme_color', quotation.themeColor);
  }, [quotation.themeColor]);

  // --- Helpers ---
  const showStatus = (msg: string, isError = false) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(''), 3000);
  };

  const loadFileList = async () => {
    try {
      const files = await fetchQuotationsFromCloud();
      setSavedFiles(files);
    } catch (error) {
      console.error(error);
      showStatus('無法載入檔案列表', true);
    }
  };

  const handleCreateNew = () => {
    setQuotation({
      ...quotation, // Keeps current theme
      fileName: '', 
      items: [{ id: Date.now(), name: '', spec: '', description: null, quantity: 1, price: 0 }],
      clientInfo: { name: '', contact: '', address: '', phone: '' },
      discount: 0,
      extraNote: '',
    });
    setShowFileMenu(false);
    showStatus('已建立新報價單');
  };

  const handleSave = async () => {
    if (!isFirebaseConfigured) {
      alert("請先設定 Firebase Config (詳見 firebaseConfig.ts)");
      return;
    }
    if (!quotation.fileName.trim()) {
      alert("請輸入檔案名稱");
      return;
    }

    setIsLoading(true);
    try {
      await saveQuotationToCloud(quotation);
      await loadFileList();
      showStatus('儲存成功');
    } catch (error) {
      console.error(error);
      showStatus('儲存失敗: 請檢查控制台');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoad = (file: QuotationData) => {
    setQuotation({
      ...file,
      themeColor: localStorage.getItem('app_theme_color') || file.themeColor // Force global theme
    });
    setShowFileMenu(false);
    showStatus(`已載入: ${file.fileName}`);
  };

  const initiateDelete = (e: React.MouseEvent, file: QuotationData) => {
    e.stopPropagation(); // Prevent loading the file
    setDeleteModal({
      isOpen: true,
      file: file,
      problem: generateMathProblem()
    });
    setShowFileMenu(false);
  };

  const confirmDelete = async (selectedAnswer: number) => {
    if (!deleteModal.file) return;

    if (selectedAnswer !== deleteModal.problem.answer) {
      alert("答錯了！取消刪除。");
      setDeleteModal({ ...deleteModal, isOpen: false });
      return;
    }

    setIsLoading(true);
    try {
      await deleteQuotationFromCloud(deleteModal.file.fileName);
      await loadFileList();
      
      // If deleted current file, reset to new
      if (quotation.fileName === deleteModal.file.fileName) {
        handleCreateNew();
      }
      showStatus('已刪除');
    } catch (error) {
      console.error(error);
      showStatus('刪除失敗');
    } finally {
      setIsLoading(false);
      setDeleteModal({ ...deleteModal, isOpen: false });
    }
  };

  const handlePrint = () => {
    const originalTitle = document.title;
    
    // Generate the required format just for the print action
    // "民國年月日_祥鉞不鏽鋼_客戶名稱"
    const printFileName = getFormattedFileName(quotation.quoteDetails.date, quotation.clientInfo.name);
    
    document.title = printFileName;
    window.print();
    
    // Restore original title (or default)
    document.title = originalTitle;
  };

  // --- Item Handlers ---
  const updateItem = (id: number, field: keyof QuoteItem, value: any) => {
    setQuotation(prev => ({
      ...prev,
      items: prev.items.map(item => item.id === id ? { ...item, [field]: value } : item)
    }));
  };

  const addItem = () => {
    setQuotation(prev => ({
      ...prev,
      items: [...prev.items, { id: Date.now(), name: '', spec: '', description: null, quantity: 1, price: 0 }]
    }));
  };

  const deleteItem = (id: number) => {
    if (quotation.items.length <= 1) return;
    setQuotation(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== id)
    }));
  };

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800 pb-12 print:pb-0 print:bg-white">
      
      {/* --- Status Toast --- */}
      {statusMsg && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-gray-800 text-white px-6 py-2 rounded-full shadow-xl flex items-center gap-2 animate-fade-in print:hidden">
          <Check size={16} className="text-green-400" /> {statusMsg}
        </div>
      )}

      {/* --- Config Warning --- */}
      {!isFirebaseConfigured && (
        <div className="bg-orange-100 border-l-4 border-orange-500 text-orange-700 p-4 print:hidden">
          <div className="container mx-auto flex items-center gap-2">
            <AlertTriangle />
            <p className="font-bold">尚未設定 Firebase</p>
            <p className="text-sm">請編輯 <code>firebaseConfig.ts</code> 填入您的專案金鑰以啟用雲端儲存功能。</p>
          </div>
        </div>
      )}

      {/* --- Toolbar --- */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-sm border-b border-gray-200 shadow-sm print:hidden">
        <div className="max-w-[220mm] mx-auto px-4 h-16 flex items-center justify-between gap-4">
          
          {/* File Controls */}
          <div className="flex items-center gap-3">
             <div className="relative">
                <div className="flex items-center bg-gray-100 rounded-md p-1 border border-gray-200">
                    <Cloud className="text-blue-500 mx-2" size={18} />
                    <input 
                      className="bg-transparent outline-none text-sm font-medium w-32 md:w-64 placeholder-gray-400" 
                      value={quotation.fileName}
                      onChange={(e) => setQuotation({...quotation, fileName: e.target.value})}
                      onFocus={() => setShowFileMenu(true)}
                      placeholder="檔案名稱"
                    />
                    <button 
                      className="p-1 hover:bg-gray-200 rounded text-gray-500"
                      onClick={() => setShowFileMenu(!showFileMenu)}
                    >
                      <ChevronDown size={14} />
                    </button>
                </div>

                {/* Dropdown Menu */}
                {showFileMenu && (
                  <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-lg shadow-xl border border-gray-100 overflow-hidden z-40">
                      <div 
                        className="px-4 py-3 bg-blue-50 text-blue-700 hover:bg-blue-100 cursor-pointer flex items-center gap-2 font-medium text-sm transition"
                        onClick={handleCreateNew}
                      >
                        <FilePlus size={16} /> 建立新報價單
                      </div>
                      <div className="bg-gray-50 px-4 py-1 text-[10px] text-gray-400 font-bold uppercase tracking-wider">雲端存檔</div>
                      <div className="max-h-64 overflow-y-auto">
                        {savedFiles.length === 0 ? (
                          <div className="px-4 py-3 text-sm text-gray-400 text-center">無存檔</div>
                        ) : (
                          savedFiles.map(file => (
                            <div 
                              key={file.id || file.fileName}
                              className="px-4 py-2 hover:bg-gray-50 text-sm text-gray-700 border-b border-gray-50 last:border-0 flex justify-between items-center group"
                            >
                              <div className="flex-grow cursor-pointer truncate mr-2" onClick={() => handleLoad(file)}>
                                {file.fileName}
                                <span className="block text-[10px] text-gray-400">
                                  {file.updatedAt ? new Date(file.updatedAt).toLocaleDateString() : ''}
                                </span>
                              </div>
                              <button 
                                onClick={(e) => initiateDelete(e, file)}
                                className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition opacity-0 group-hover:opacity-100"
                                title="刪除檔案"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                  </div>
                )}
             </div>

             <button 
                onClick={loadFileList} 
                className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition" 
                title="重新整理列表"
             >
               <RefreshCw size={18} />
             </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
              {/* Tax Inclusive Checkbox moved here */}
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-gray-600 hover:text-gray-900 select-none mr-4 border-r pr-4 border-gray-300">
                  <input 
                      type="checkbox" 
                      checked={quotation.isTaxInclusive} 
                      onChange={(e) => setQuotation({...quotation, isTaxInclusive: e.target.checked})} 
                      className="accent-gray-900 rounded w-4 h-4" 
                  />
                  單價已含稅
              </label>

              <div className="flex items-center gap-2 mr-4 border-r pr-4 border-gray-300">
                 <span className="text-xs text-gray-500 font-medium">主題色</span>
                 <input 
                    type="color" 
                    value={quotation.themeColor} 
                    onChange={(e) => setQuotation({...quotation, themeColor: e.target.value})}
                    className="w-6 h-6 rounded cursor-pointer border-0 p-0"
                 />
              </div>

              <button 
                onClick={handleSave} 
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition disabled:opacity-50 text-sm font-medium"
              >
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                儲存
              </button>
              
              <button 
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-sm text-sm font-medium"
              >
                <Printer size={16} />
                預覽列印
              </button>
          </div>
        </div>
      </header>

      {/* --- Main Content --- */}
      <main className="mt-8 print:mt-0">
        <QuotationPreview 
          data={quotation} 
          setData={setQuotation}
          updateItem={updateItem}
          addItem={addItem}
          deleteItem={deleteItem}
        />
      </main>

      {/* --- Overlay for Click Outside Menu --- */}
      {showFileMenu && (
        <div 
          className="fixed inset-0 z-20 bg-transparent" 
          onClick={() => setShowFileMenu(false)}
        />
      )}

      {/* --- Delete Verification Modal --- */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full animate-bounce-in">
             <div className="text-center mb-4">
               <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3 text-red-500">
                  <Trash2 size={24} />
               </div>
               <h3 className="text-lg font-bold text-gray-800">刪除確認</h3>
               <p className="text-sm text-gray-500 mt-1">確定要刪除「{deleteModal.file?.fileName}」嗎？</p>
             </div>
             
             <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 mb-6">
                <p className="text-sm text-gray-600 mb-3 text-center">請回答以下問題以確認刪除：</p>
                <div className="text-2xl font-bold text-center text-blue-600 mb-4 tracking-widest">
                  {deleteModal.problem.question}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {deleteModal.problem.options.map((option, idx) => (
                    <button
                      key={idx}
                      onClick={() => confirmDelete(option)}
                      className="py-2 px-1 bg-white border border-gray-200 hover:border-blue-500 hover:bg-blue-50 text-gray-700 rounded shadow-sm font-medium transition"
                    >
                      {option}
                    </button>
                  ))}
                </div>
             </div>

             <div className="flex justify-center">
               <button 
                 onClick={() => setDeleteModal({...deleteModal, isOpen: false})}
                 className="text-gray-400 hover:text-gray-600 text-sm underline"
               >
                 取消
               </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;