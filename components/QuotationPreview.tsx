import React, { useRef, useLayoutEffect, useState, useEffect } from 'react';
import { QuotationData, QuoteItem } from '../types';
import { Image, Stamp, Plus, Trash2, Tag, AlertTriangle } from './Icons';

interface Props {
  data: QuotationData;
  setData: (data: QuotationData) => void;
  updateItem: (id: number, field: keyof QuoteItem, value: any) => void;
  addItem: () => void;
  deleteItem: (id: number) => void;
}

// Helper: Format Currency
const formatCurrency = (num: number) => {
  if (isNaN(num)) return "NT$0";
  return "NT$" + new Intl.NumberFormat('en-US', { 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0 
  }).format(num);
};

// Helper: Process and compress image
const processImage = (file: File, callback: (result: string) => void) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      
      const MAX_SIZE = 400;
      if (width > height) {
        if (width > MAX_SIZE) {
          height *= MAX_SIZE / width;
          width = MAX_SIZE;
        }
      } else {
        if (height > MAX_SIZE) {
          width *= MAX_SIZE / height;
          height = MAX_SIZE;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        callback(canvas.toDataURL('image/png', 0.8));
      }
    };
    img.src = e.target?.result as string;
  };
  reader.readAsDataURL(file);
};

// Component: Auto-resizing Textarea
const AutoHeightTextarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & { autoResize?: boolean }> = ({ style, value, autoResize = true, ...props }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
      if (autoResize && textareaRef.current) {
          textareaRef.current.style.height = 'auto';
          textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
      }
  }, [value, autoResize]);

  return (
      <textarea
          ref={textareaRef}
          style={{ ...style, resize: autoResize ? 'none' : 'vertical', overflow: autoResize ? 'hidden' : 'auto' }}
          value={value}
          {...props}
      />
  );
};

// Component: Editable Price Cell
const EditablePriceCell: React.FC<{ value: number; onChange: (val: number) => void }> = ({ value, onChange }) => {
    const [isEditing, setIsEditing] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    if (isEditing) {
        return (
            <div className="flex items-start justify-end w-full h-full pt-[2px]">
                 <input 
                    ref={inputRef}
                    type="number"
                    className="text-right w-24 bg-white outline-none border-b border-blue-500 m-0 p-0 text-black font-medium" 
                    value={value === 0 ? '' : value} 
                    onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
                    onBlur={() => setIsEditing(false)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') setIsEditing(false);
                    }}
                    placeholder="0"
                />
            </div>
        );
    }

    return (
        <div 
            onClick={() => setIsEditing(true)}
            // Changed items-center to items-start and added pt-[2px] to match the 'Amount' cell alignment
            className="text-right w-full cursor-text hover:bg-gray-100 rounded px-1 font-medium text-black h-full flex items-start justify-end pt-[2px]"
        >
            {formatCurrency(value)}
        </div>
    );
};

export const QuotationPreview: React.FC<Props> = ({ data, setData, updateItem, addItem, deleteItem }) => {
  
  const [showDiscount, setShowDiscount] = useState(data.discount > 0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    if (data.discount > 0) setShowDiscount(true);
  }, [data.discount]);

  // Check for A4 overflow
  useEffect(() => {
    if (containerRef.current) {
        // 297mm in pixels is approx 1122.5px (at 96 DPI)
        // We use a safe buffer (1130px) to distinguish between min-height (empty A4) and overflow.
        const a4HeightPx = 1130; 
        setIsOverflowing(containerRef.current.scrollHeight > a4HeightPx);
    }
  }, [data]);

  // --- Calculations ---
  const taxFactor = 1 + (data.quoteDetails.taxRate / 100);
  let calculatedSubtotal = 0;
  
  data.items.forEach(item => {
      if (data.isTaxInclusive) {
          calculatedSubtotal += Math.round((item.price * item.quantity) / taxFactor);
      } else {
          calculatedSubtotal += item.price * item.quantity;
      }
  });

  const taxableAmount = Math.max(0, calculatedSubtotal - (data.discount || 0));
  const taxAmount = Math.round(taxableAmount * (data.quoteDetails.taxRate / 100));
  const total = taxableAmount + taxAmount;

  // --- Handlers ---
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          processImage(file, (result) => setData({ ...data, logo: result }));
      }
  };

  const handleSealUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          processImage(file, (result) => setData({ ...data, seal: result }));
      }
  };

  // Base input style
  const inputStyle = "bg-white text-black rounded px-1 outline-none transition w-full hover:bg-gray-50 focus:bg-blue-50";
  // Underlined input style for Header
  const underlinedInputStyle = "bg-white text-black border-b border-gray-400 rounded-none px-1 outline-none transition w-full hover:bg-gray-50 focus:border-blue-500 text-right";

  return (
    <div className="relative flex flex-col items-center">
        {/* A4 Overflow Warning (Screen Only) */}
        {isOverflowing && (
            <div className="mb-4 bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-2 rounded-lg flex items-center gap-2 print:hidden shadow-sm animate-pulse">
                <AlertTriangle size={18} />
                <span className="text-sm font-medium">注意：內容已超過一頁 A4 大小，列印時將會產生第二頁。</span>
            </div>
        )}

        <div ref={containerRef} className="w-[210mm] min-h-[297mm] bg-white shadow-lg p-[8mm] flex flex-col print:shadow-none print:m-0 print:w-full print:h-auto print:min-h-0 relative font-[Noto_Sans_TC]">
        <style>{`
            /* Hide default calendar picker indicator but keep it clickable */
            input[type="date"]::-webkit-calendar-picker-indicator {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                width: 100%;
                height: 100%;
                color: transparent;
                background: transparent;
                cursor: pointer;
            }
            /* Remove number input spinner */
            input[type=number]::-webkit-inner-spin-button, 
            input[type=number]::-webkit-outer-spin-button { 
            -webkit-appearance: none; 
            margin: 0; 
            }
        `}</style>

        {/* Header */}
        <div className="flex justify-between border-b-2 border-black pb-1 mb-1">
            {/* Left: Company Info */}
            <div className="w-3/5 flex gap-4">
            <div className="shrink-0 pt-1">
                <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" id="logo-upload" />
                {data.logo ? (
                <div className="relative group">
                    <img src={data.logo} alt="Logo" className="h-24 w-auto object-contain" />
                    <label htmlFor="logo-upload" className="absolute inset-0 bg-black/0 group-hover:bg-black/10 cursor-pointer flex items-center justify-center transition print:hidden">
                    <span className="opacity-0 group-hover:opacity-100 bg-white px-2 py-1 text-xs rounded shadow">更換</span>
                    </label>
                </div>
                ) : (
                <label htmlFor="logo-upload" className="flex flex-col items-center justify-center gap-1 text-gray-400 border border-dashed border-gray-300 w-24 h-20 rounded cursor-pointer hover:bg-gray-50 print:hidden">
                    <Image size={20} /> <span className="text-xs">上傳 Logo</span>
                </label>
                )}
            </div>

            <div className="flex-grow space-y-0">
                <input 
                className={`text-3xl font-bold placeholder-gray-300 ${inputStyle} mb-3`} 
                value={data.companyInfo.name}
                onChange={(e) => setData({...data, companyInfo: {...data.companyInfo, name: e.target.value}})}
                placeholder="公司名稱"
                />
                <div className="text-base text-gray-700 space-y-[2px]">
                    <div className="flex items-center gap-1">
                        <span className="w-12 font-medium shrink-0">地址:</span>
                        <input className={`flex-1 ${inputStyle}`} value={data.companyInfo.address} onChange={(e) => setData({...data, companyInfo: {...data.companyInfo, address: e.target.value}})} />
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1 flex-1">
                            <span className="w-12 font-medium shrink-0">電話:</span>
                            <input className={`flex-1 ${inputStyle}`} value={data.companyInfo.phone} onChange={(e) => setData({...data, companyInfo: {...data.companyInfo, phone: e.target.value}})} />
                        </div>
                        <div className="flex items-center gap-1 flex-1">
                            <span className="w-12 font-medium shrink-0">傳真:</span>
                            <input className={`flex-1 ${inputStyle}`} value={data.companyInfo.fax} onChange={(e) => setData({...data, companyInfo: {...data.companyInfo, fax: e.target.value}})} />
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="w-12 font-medium shrink-0">信箱:</span>
                        <input className={`flex-1 ${inputStyle}`} value={data.companyInfo.email} onChange={(e) => setData({...data, companyInfo: {...data.companyInfo, email: e.target.value}})} />
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="w-12 font-medium shrink-0">統編:</span>
                        <input className={`flex-1 ${inputStyle}`} value={data.companyInfo.taxId} onChange={(e) => setData({...data, companyInfo: {...data.companyInfo, taxId: e.target.value}})} />
                    </div>
                </div>
            </div>
            </div>

            {/* Right: Quotation Info */}
            <div className="w-2/5 text-right flex flex-col items-end justify-between">
                {/* Adjusted leading and negative top margin to align the visual top of '報價單' characters with the Company Name input */}
                <h2 className="text-[3.5rem] font-extrabold tracking-widest mb-2 text-black leading-none mt-[-10px]">報 價 單</h2>
                
                {/* Header Grid for Alignment - changed items-end to items-center */}
                <div className="grid grid-cols-[auto_150px] gap-x-2 gap-y-1 items-center justify-end text-base w-full">
                    {/* Row 1 */}
                    <span className="font-bold text-gray-800 text-lg text-right pb-1">單號:</span>
                    {/* Reduced font size to text-base (16px) and fixed width to w-[150px] */}
                    <input 
                        className={`font-mono text-base w-[150px] ${underlinedInputStyle}`} 
                        value={data.quoteDetails.number} 
                        onChange={(e) => setData({...data, quoteDetails: {...data.quoteDetails, number: e.target.value}})} 
                    />
                    
                    {/* Row 2 */}
                    <span className="font-bold text-gray-800 text-lg text-right pb-1">日期:</span>
                    <div className="relative w-[150px]">
                        <input 
                            type="date" 
                            className={`font-mono text-base relative z-10 cursor-pointer ${underlinedInputStyle}`} 
                            value={data.quoteDetails.date} 
                            onChange={(e) => setData({...data, quoteDetails: {...data.quoteDetails, date: e.target.value}})} 
                        />
                    </div>
                </div>
            </div>
        </div>

        {/* Client Info */}
        <div className="mb-2 flex gap-4 items-start pt-1">
            <div className="flex-1">
                <label className="text-sm text-gray-500 block mb-1">客戶名稱</label>
                <AutoHeightTextarea 
                    className={`w-full font-bold text-xl ${inputStyle}`} 
                    rows={1}
                    value={data.clientInfo.name} 
                    onChange={(e) => setData({...data, clientInfo: {...data.clientInfo, name: e.target.value}})}
                    placeholder="輸入客戶名稱"
                />
            </div>
            <div className="w-1/4">
                <label className="text-sm text-gray-500 block mb-1">電話</label>
                <input className={`text-lg ${inputStyle}`} 
                    value={data.clientInfo.phone} onChange={(e) => setData({...data, clientInfo: {...data.clientInfo, phone: e.target.value}})} placeholder="電話" />
            </div>
            <div className="w-1/3">
                <label className="text-sm text-gray-500 block mb-1">地址</label>
                <AutoHeightTextarea 
                    className={`text-lg w-full ${inputStyle}`} 
                    value={data.clientInfo.address} 
                    onChange={(e) => setData({...data, clientInfo: {...data.clientInfo, address: e.target.value}})} 
                    placeholder="地址" 
                    rows={1}
                />
            </div>
        </div>

        {/* Items Table */}
        <div className="flex-grow mb-3">
            <table className="w-full text-left border-collapse">
                <thead>
                    {/* Increased header font size from text-base to text-lg */}
                    <tr className="text-white print:text-white print:bg-black" style={{ backgroundColor: data.themeColor }}>
                        <th className="p-2 w-[5%] text-center rounded-tl-sm text-lg">#</th>
                        <th className="p-2 w-[40%] text-left text-lg">品名</th>
                        <th className="p-2 w-[20%] text-left text-lg">規格</th>
                        <th className="p-2 w-[8%] text-center text-lg">數量</th>
                        <th className="p-2 w-[12%] text-center text-lg">單價</th>
                        <th className="p-2 w-[12%] text-center rounded-tr-sm text-lg">金額</th>
                        <th className="p-2 w-[3%] print:hidden"></th>
                    </tr>
                </thead>
                <tbody className="text-base">
                {data.items.map((item, index) => (
                    <tr key={item.id} className="border-b border-gray-200 group hover:bg-gray-50 print:border-gray-300 break-inside-avoid">
                        <td className="p-2 text-center text-gray-500 align-top pt-3">{index + 1}</td>
                        <td className="p-2 align-top">
                            <div className="flex items-center gap-2">
                                <input className={`font-bold text-lg ${inputStyle} flex-grow min-w-0`} value={item.name} onChange={(e) => updateItem(item.id, 'name', e.target.value)} placeholder="項目名稱" />
                                
                                {(item.description === null) && (
                                    <button onClick={() => updateItem(item.id, 'description', '')} className="shrink-0 text-[10px] text-blue-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 print:hidden whitespace-nowrap">+ 描述</button>
                                )}
                            </div>
                            
                            {(item.description !== null) && (
                                <div className="relative mt-1">
                                    <AutoHeightTextarea 
                                        className={`text-sm text-gray-500 ${inputStyle}`} 
                                        value={item.description || ''} 
                                        onChange={(e) => updateItem(item.id, 'description', e.target.value)} 
                                        placeholder="詳細描述..."
                                    />
                                    <button onClick={() => updateItem(item.id, 'description', null)} className="absolute -right-4 top-0 text-gray-300 hover:text-red-500 print:hidden">&times;</button>
                                </div>
                            )}
                        </td>
                        <td className="p-2 align-top">
                            <AutoHeightTextarea 
                                rows={1}
                                className={`text-base ${inputStyle}`} 
                                value={item.spec} 
                                onChange={(e) => updateItem(item.id, 'spec', e.target.value)} 
                            />
                        </td>
                        <td className="p-2 text-center align-top">
                            <input type="number" className={`text-center ${inputStyle}`} value={item.quantity} onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)} />
                        </td>
                        <td className="p-2 align-top">
                            <EditablePriceCell 
                                value={item.price} 
                                onChange={(val) => updateItem(item.id, 'price', val)} 
                            />
                        </td>
                        <td className="p-2 text-right font-medium align-top pt-2.5 text-black">
                            {formatCurrency(data.isTaxInclusive ? Math.round((item.price * item.quantity) / taxFactor) : item.price * item.quantity)}
                        </td>
                        <td className="p-2 text-center align-top print:hidden pt-3">
                            <button onClick={() => deleteItem(item.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"><Trash2 size={14} /></button>
                        </td>
                    </tr>
                ))}
                </tbody>
            </table>
            <button onClick={addItem} className="mt-2 text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1 print:hidden opacity-50 hover:opacity-100 transition">
                <Plus size={16} /> 新增項目
            </button>
        </div>

        {/* Footer Section */}
        <div className="break-inside-avoid">
            {/* Reduced margin-bottom from mb-4 to mb-[1px] to bring divider closer */}
            <div className="flex gap-4 mb-[1px] items-start">
                {/* Matched height with Seal (h-40) */}
                <div className="flex-grow h-40">
                    <textarea 
                        className={`h-full w-full resize-none ${inputStyle} text-base p-2`} 
                        placeholder="額外備註 (Optional)..."
                        value={data.extraNote}
                        onChange={(e) => setData({...data, extraNote: e.target.value})}
                    ></textarea>
                </div>
                
                {/* Seal */}
                <div className="w-48 shrink-0 flex flex-col items-center justify-center relative h-40 border border-transparent hover:border-gray-200 rounded">
                    <input type="file" accept="image/*" onChange={handleSealUpload} className="hidden" id="seal-upload" />
                    {data.seal ? (
                        <div className="relative h-full w-full flex items-center justify-center group">
                            <img src={data.seal} alt="Seal" className="max-h-full max-w-full object-contain opacity-90" />
                            <label htmlFor="seal-upload" className="absolute inset-0 bg-black/0 hover:bg-black/10 cursor-pointer flex items-center justify-center transition print:hidden">
                                <span className="opacity-0 group-hover:opacity-100 bg-white px-2 py-1 text-xs rounded shadow">更換印章</span>
                            </label>
                        </div>
                    ) : (
                        <label htmlFor="seal-upload" className="flex flex-col items-center justify-center gap-1 text-gray-300 border border-dashed border-gray-300 w-full h-full rounded cursor-pointer hover:bg-gray-50 print:hidden">
                            <Stamp size={28} /> <span className="text-xs">上傳印章</span>
                        </label>
                    )}
                </div>

                {/* Calculation Stats */}
                <div className="min-w-[280px] w-auto shrink-0 bg-white p-3 rounded print:p-0 group">
                    <div className="flex justify-between py-1 text-base items-center relative whitespace-nowrap">
                        <div className="flex items-center gap-2">
                            <span className="text-gray-600">銷售金額 (Subtotal)</span>
                            {!showDiscount && (
                                <button 
                                onClick={() => setShowDiscount(true)} 
                                className="invisible group-hover:visible text-xs flex items-center gap-1 text-blue-600 hover:text-blue-800 print:hidden bg-blue-50 px-2 py-0.5 rounded border border-blue-100"
                                >
                                <Tag size={10} /> 優惠
                                </button>
                            )}
                        </div>
                        <span className="font-medium ml-4">{formatCurrency(calculatedSubtotal)}</span>
                    </div>
                    
                    {showDiscount && (
                    <div className="flex justify-between py-1 text-base text-red-600 items-center font-bold whitespace-nowrap">
                        <div className="flex items-center gap-1">
                            <span>折扣 (Discount)</span>
                            <button onClick={() => {setShowDiscount(false); setData({...data, discount: 0});}} className="text-gray-400 hover:text-red-500 print:hidden ml-1">
                            &times;
                            </button>
                        </div>
                        <div className="flex items-center ml-4">
                            <span className="mr-1">-</span>
                            <span className="mr-1 text-sm">NT$</span>
                            {/* Removed border-b and focus border for discount input */}
                            <input 
                                type="number" 
                                className={`w-24 text-right text-red-600 bg-white outline-none`} 
                                value={data.discount} 
                                onChange={(e) => setData({...data, discount: parseFloat(e.target.value) || 0})}
                            />
                        </div>
                    </div>
                    )}

                    <div className="flex justify-between items-center py-1 text-base whitespace-nowrap">
                        <span className="text-gray-600 flex items-center gap-1">
                            營業稅 (Tax)
                            <span className="bg-gray-200 px-1 rounded text-xs print:hidden flex items-center">
                                <input type="number" className="w-8 text-center bg-transparent outline-none" value={data.quoteDetails.taxRate} onChange={(e) => setData({...data, quoteDetails: {...data.quoteDetails, taxRate: parseFloat(e.target.value) || 0}})} />%
                            </span>
                            <span className="hidden print:inline text-xs">({data.quoteDetails.taxRate}%)</span>
                        </span>
                        <span className="font-medium ml-4">{formatCurrency(taxAmount)}</span>
                    </div>
                    
                    <div className="flex justify-between py-3 text-2xl font-bold border-t-2 border-black mt-3 text-black items-end whitespace-nowrap">
                        <span className="text-gray-800">總計 (Total)</span>
                        <span className="ml-4">{formatCurrency(total)}</span>
                    </div>
                </div>
            </div>

            {/* Bottom Terms & Signature - Aligned Top (items-start), Reduced Padding (pt-2) */}
            <div className="border-t-2 border-gray-200 pt-2 flex gap-8 items-start mt-0">
                <div className="flex-grow">
                    <h4 className="font-bold text-lg mb-3 text-gray-700">備註與條款:</h4>
                    <AutoHeightTextarea 
                        autoResize={false}
                        rows={6}
                        className={`w-full text-base text-gray-600 leading-relaxed ${inputStyle}`} 
                        value={data.notes}
                        onChange={(e) => setData({...data, notes: e.target.value})}
                    />
                </div>
                <div className="w-64 shrink-0 flex flex-col gap-6"> 
                    {/* Client Signature - Aligned Top - Increased height to h-[52px] */}
                    <div className="flex flex-col"> 
                        <div className="h-[52px] border-b border-black mb-1"></div>
                        <div className="text-center text-base">客戶簽名</div>
                    </div>
                    {/* Sales Person */}
                    <div className="mt-0">
                        <div className="mb-1 font-bold text-xl tracking-wide text-center">
                            <input className={`text-center ${inputStyle}`} value={data.salesPerson} onChange={(e) => setData({...data, salesPerson: e.target.value})} />
                        </div>
                        <div className="border-t border-black pt-2 text-center text-base">業務人員</div>
                    </div>
                </div>
            </div>
        </div>

        {/* Visual Page Break Marker (for A4 guidance) - Always visible on screen, hidden on print */}
        <div className="absolute top-[297mm] left-0 w-full border-b border-dashed border-red-300 pointer-events-none print:hidden flex justify-end pr-2">
            <span className="text-[10px] text-red-300 bg-white px-1">A4 Page 1 End</span>
        </div>
        </div>
    </div>
  );
};