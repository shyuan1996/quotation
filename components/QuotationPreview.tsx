import React, { useRef, useLayoutEffect, useState, useEffect, useMemo } from 'react';
import { QuotationData, QuoteItem } from '../types';
import { Image, Stamp, Plus, Trash2, Tag } from './Icons';

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
// Added displayValue prop to show calculated (pre-tax) price when not editing
const EditablePriceCell: React.FC<{ value: number; displayValue?: number; onChange: (val: number) => void }> = ({ value, displayValue, onChange }) => {
    const [isEditing, setIsEditing] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const showValue = displayValue !== undefined ? displayValue : value;

    if (isEditing) {
        return (
            <div className="flex items-baseline justify-end w-full h-full">
                 <input 
                    ref={inputRef}
                    type="number"
                    className="text-right w-24 bg-white outline-none border-b border-blue-500 m-0 px-1 py-0 text-black font-medium leading-snug text-[17px]" 
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
            className="text-right w-full cursor-text hover:bg-gray-100 rounded px-1 py-0 font-medium text-black h-full flex items-baseline justify-end leading-snug text-[17px]"
        >
            {formatCurrency(showValue)}
        </div>
    );
};

export const QuotationPreview: React.FC<Props> = ({ data, setData, updateItem, addItem, deleteItem }) => {
  
  const [showDiscount, setShowDiscount] = useState(data.discount > 0);
  
  // Drag and Drop Refs and State
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  const [dragActiveIndex, setDragActiveIndex] = useState<number | null>(null);

  useEffect(() => {
    if (data.discount > 0) setShowDiscount(true);
  }, [data.discount]);

  // --- Sort Handler ---
  const handleSort = () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    
    // No change if dropped on itself
    if (dragItem.current === dragOverItem.current) {
        dragItem.current = null;
        dragOverItem.current = null;
        return;
    }

    const _items = [...data.items];
    const draggedItemContent = _items[dragItem.current];

    // Remove the item from its original position
    _items.splice(dragItem.current, 1);
    // Insert it at the new position
    _items.splice(dragOverItem.current, 0, draggedItemContent);

    setData({ ...data, items: _items });
    
    dragItem.current = null;
    dragOverItem.current = null;
  };

  // --- Dynamic Pagination Logic ---
  const pages = useMemo(() => {
      // Constants for A4 layout (Approximate pixels based on 96DPI and Tailwind styles)
      const A4_CONTENT_HEIGHT = 1050; 
      
      const HEADER_HEIGHT = 380; 
      const FOOTER_HEIGHT = 320; 
      const PAGE_2_HEADER_HEIGHT = 60; 
      const ROW_BASE_HEIGHT = 45; 
      const ROW_LINE_HEIGHT = 24; 
      const BOTTOM_SPACER = 50; 

      const getItemHeight = (item: QuoteItem) => {
          const countLines = (text: string | null, approxCharsPerLine: number) => {
              if (!text) return 1;
              const explicitLines = text.split('\n');
              let totalLines = 0;
              explicitLines.forEach(line => {
                  totalLines += Math.max(1, Math.ceil(line.length / approxCharsPerLine));
              });
              return totalLines;
          };

          const nameLines = countLines(item.name, 22); 
          const descLines = countLines(item.description, 35); 
          const specLines = countLines(item.spec, 15); 
          
          const nameBlockLines = nameLines + (item.description ? descLines : 0);
          const maxLines = Math.max(nameBlockLines, specLines, 1);
          return ROW_BASE_HEIGHT + ((maxLines - 1) * ROW_LINE_HEIGHT);
      };

      const resultPages: QuoteItem[][] = [];
      let currentPageItems: QuoteItem[] = [];
      let currentHeight = HEADER_HEIGHT; 
      let pageIndex = 0;

      data.items.forEach((item, index) => {
          const itemHeight = getItemHeight(item);
          let limit = A4_CONTENT_HEIGHT - BOTTOM_SPACER; 
          
          const isLastItemGlobal = index === data.items.length - 1;
          
          if (isLastItemGlobal) {
             if (currentHeight + itemHeight + FOOTER_HEIGHT > A4_CONTENT_HEIGHT) {
                 if (currentHeight + itemHeight < limit) {
                     currentPageItems.push(item);
                     resultPages.push(currentPageItems);
                     currentPageItems = []; 
                     currentHeight = PAGE_2_HEADER_HEIGHT;
                 } else {
                     resultPages.push(currentPageItems);
                     currentPageItems = [item];
                     currentHeight = PAGE_2_HEADER_HEIGHT + itemHeight;
                 }
             } else {
                 currentPageItems.push(item);
                 currentHeight += itemHeight;
             }
          } else {
              if (currentHeight + itemHeight > limit) {
                  resultPages.push(currentPageItems);
                  currentPageItems = [item];
                  currentHeight = PAGE_2_HEADER_HEIGHT + itemHeight; 
                  pageIndex++;
              } else {
                  currentPageItems.push(item);
                  currentHeight += itemHeight;
              }
          }
      });

      if (currentPageItems.length > 0) {
          resultPages.push(currentPageItems);
      } else if (resultPages.length === 0) {
          resultPages.push([]);
      }

      return resultPages;

  }, [data.items, data.discount, data.quoteDetails, data.companyInfo, data.clientInfo]);

  // --- Calculations ---
  const taxFactor = 1 + (data.quoteDetails.taxRate / 100);
  
  // Logic: 
  // If Tax Inclusive: Unit Price (Input) -> Convert to Pre-Tax Unit Price -> Multiply by Qty -> Row Amount
  // If Tax Exclusive: Unit Price (Input) -> Multiply by Qty -> Row Amount
  const getPreTaxUnitPrice = (price: number) => {
      if (data.isTaxInclusive) {
          return Math.round(price / taxFactor);
      }
      return price;
  };

  let calculatedSubtotal = 0;
  data.items.forEach(item => {
      const unitPrice = getPreTaxUnitPrice(item.price);
      calculatedSubtotal += unitPrice * item.quantity;
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

  // Added py-1 to ensure consistent height with other cells
  const inputStyle = "bg-white text-black rounded px-1 py-1 outline-none transition w-full hover:bg-gray-50 focus:bg-blue-50 leading-snug";
  const underlinedInputStyle = "bg-white text-black border-b border-gray-400 rounded-none px-1 py-1 outline-none transition w-full hover:bg-gray-50 focus:border-blue-500 text-right leading-snug";

  const getGlobalIndex = (pageIndex: number, localIndex: number) => {
      let count = 0;
      for (let i = 0; i < pageIndex; i++) {
          count += pages[i].length;
      }
      return count + localIndex + 1;
  };

  return (
    <div className="flex flex-col items-center gap-8 print:gap-0 print:block">
        <style>{`
            /* Print pagination settings */
            @media print {
                .page-break { 
                    page-break-after: always; 
                    height: 297mm;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                }
                .page-break:last-child {
                    page-break-after: auto;
                    height: auto;
                    min-height: 297mm;
                }
                body { margin: 0; }
            }
            input[type="date"]::-webkit-calendar-picker-indicator {
                position: absolute; top: 0; left: 0; right: 0; bottom: 0;
                width: 100%; height: 100%; color: transparent; background: transparent; cursor: pointer;
            }
            input[type=number]::-webkit-inner-spin-button, 
            input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        `}</style>

        {pages.map((pageItems, pageIndex) => {
            const isFirstPage = pageIndex === 0;
            const isLastPage = pageIndex === pages.length - 1;

            return (
                <div 
                    key={pageIndex}
                    /* Adjusted padding: top 20px, bottom 5px as requested */
                    className="w-[210mm] min-h-[297mm] bg-white shadow-lg px-[8mm] pt-[20px] pb-[5px] flex flex-col relative font-[Noto_Sans_TC] print:shadow-none print:m-0 print:w-full page-break box-border"
                >
                    <div className="flex-grow flex flex-col">
                        
                        {isFirstPage && (
                            <>
                                <div className="flex justify-between border-b-2 border-black pb-1 mb-1">
                                    <div className="flex-grow flex gap-4">
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
                                            className={`text-[30px] font-bold placeholder-gray-300 ${inputStyle} mb-0`} 
                                            value={data.companyInfo.name}
                                            onChange={(e) => setData({...data, companyInfo: {...data.companyInfo, name: e.target.value}})}
                                            placeholder="公司名稱"
                                            />
                                            {/* Adjusted spacing to gap-0 */}
                                            <div className="text-[16px] text-gray-700 flex flex-col gap-0">
                                                <div className="flex items-center gap-1">
                                                    <span className="w-12 font-medium shrink-0">地址:</span>
                                                    <input className={`flex-1 ${inputStyle} py-0`} value={data.companyInfo.address} onChange={(e) => setData({...data, companyInfo: {...data.companyInfo, address: e.target.value}})} />
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className="flex items-center gap-1 flex-1">
                                                        <span className="w-12 font-medium shrink-0">電話:</span>
                                                        <input className={`flex-1 ${inputStyle} py-0`} value={data.companyInfo.phone} onChange={(e) => setData({...data, companyInfo: {...data.companyInfo, phone: e.target.value}})} />
                                                    </div>
                                                    <div className="flex items-center gap-1 flex-1">
                                                        <span className="w-12 font-medium shrink-0">傳真:</span>
                                                        <input className={`flex-1 ${inputStyle} py-0`} value={data.companyInfo.fax} onChange={(e) => setData({...data, companyInfo: {...data.companyInfo, fax: e.target.value}})} />
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <span className="w-12 font-medium shrink-0">信箱:</span>
                                                    <input className={`flex-1 ${inputStyle} py-0`} value={data.companyInfo.email} onChange={(e) => setData({...data, companyInfo: {...data.companyInfo, email: e.target.value}})} />
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <span className="w-12 font-medium shrink-0">統編:</span>
                                                    <input className={`flex-1 ${inputStyle} py-0`} value={data.companyInfo.taxId} onChange={(e) => setData({...data, companyInfo: {...data.companyInfo, taxId: e.target.value}})} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Changed gap-2 to gap-0 */}
                                    <div className="w-auto ml-auto text-right flex flex-col items-end justify-between gap-0 shrink-0 h-auto">
                                        {/* Changed mt-[-10px] to mt-[-5px] */}
                                        <h2 className="text-[58px] font-extrabold tracking-widest mb-0 text-black leading-none mt-[-5px] mr-[-0.1em] text-right">報 價 單</h2>
                                        
                                        {/* Adjusted margin to -15px to move up 10px more from -5px, and mb-[20px] for bottom spacing */}
                                        <div className="grid grid-cols-[auto_150px] gap-x-2 gap-y-1 items-center justify-end text-base w-full mb-[20px] mt-[-15px]">
                                            <span className="font-bold text-gray-800 text-lg text-right pb-1 whitespace-nowrap">單號:</span>
                                            <input 
                                                className={`font-mono text-base w-[150px] ${underlinedInputStyle}`} 
                                                value={data.quoteDetails.number} 
                                                onChange={(e) => setData({...data, quoteDetails: {...data.quoteDetails, number: e.target.value}})} 
                                            />
                                            
                                            <span className="font-bold text-gray-800 text-lg text-right pb-1 whitespace-nowrap">日期:</span>
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
                            </>
                        )}

                        {!isFirstPage && (
                            <div className="mb-4 border-b pb-2 flex justify-between items-center text-gray-400 text-sm">
                                <span>{data.quoteDetails.number} - (續)</span>
                                <span>Page {pageIndex + 1}</span>
                            </div>
                        )}

                        <div className="flex-grow mb-3">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="text-white print:text-white print:bg-black" style={{ backgroundColor: data.themeColor }}>
                                        <th className="p-2 w-[5%] text-center rounded-tl-sm text-[19px]">#</th>
                                        <th className="p-2 w-[40%] text-left text-[19px]">品名</th>
                                        <th className="p-2 w-[20%] text-left text-[19px]">規格(cm)</th>
                                        <th className="p-2 w-[8%] text-center text-[19px]">數量</th>
                                        <th className="p-2 w-[12%] text-right text-[19px]">單價</th>
                                        <th className="p-2 w-[12%] text-right rounded-tr-sm text-[19px]">金額</th>
                                        <th className="p-2 w-[3%] print:hidden"></th>
                                    </tr>
                                </thead>
                                <tbody className="text-[17px]">
                                {pageItems.map((item, index) => {
                                    const effectiveUnitPrice = getPreTaxUnitPrice(item.price);
                                    const rowAmount = effectiveUnitPrice * item.quantity;
                                    const globalIndex = getGlobalIndex(pageIndex, index);
                                    const arrayIndex = globalIndex - 1; // 0-based index for array manipulation
                                    
                                    return (
                                        <tr 
                                            key={item.id} 
                                            className="border-b border-gray-200 group hover:bg-gray-50 print:border-gray-300"
                                            draggable={dragActiveIndex === arrayIndex}
                                            onDragStart={(e) => {
                                                dragItem.current = arrayIndex;
                                                // Optional: Set ghost image or effect
                                                e.dataTransfer.effectAllowed = "move";
                                            }}
                                            onDragEnter={(e) => {
                                                dragOverItem.current = arrayIndex;
                                            }}
                                            onDragEnd={handleSort}
                                            onDragOver={(e) => e.preventDefault()}
                                        >
                                            {/* Text-only cells get py-2 to match input padding+height */}
                                            <td 
                                                className="px-2 py-[1px] text-center text-gray-500 align-baseline cursor-move select-none hover:text-gray-800 active:text-blue-500"
                                                onMouseEnter={() => setDragActiveIndex(arrayIndex)}
                                                onMouseLeave={() => setDragActiveIndex(null)}
                                                onMouseDown={() => setDragActiveIndex(arrayIndex)} // Ensure touch/click works
                                                title="按住拖曳排序"
                                            >
                                                {globalIndex}
                                            </td>
                                            {/* Input cells get p-1, inner input has py-1 */}
                                            <td className="px-1 py-[1px] align-baseline">
                                                {/* Added mb-0 to wrapper to remove any bottom margin from the flex container */}
                                                <div className="flex items-baseline gap-2 mb-0">
                                                    <input className={`font-bold text-[19px] ${inputStyle} flex-grow min-w-0 py-0`} value={item.name} onChange={(e) => updateItem(item.id, 'name', e.target.value)} placeholder="項目名稱" />
                                                    
                                                    {(item.description === null) && (
                                                        <button onClick={() => updateItem(item.id, 'description', '')} className="shrink-0 text-[11px] text-blue-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 print:hidden whitespace-nowrap">+ 描述</button>
                                                    )}
                                                </div>
                                                
                                                {(item.description !== null) && (
                                                    <div className="relative mt-0">
                                                        <AutoHeightTextarea 
                                                            className={`text-[15px] text-gray-500 ${inputStyle} py-0 leading-none block`} 
                                                            value={item.description || ''} 
                                                            onChange={(e) => updateItem(item.id, 'description', e.target.value)} 
                                                            placeholder="詳細描述..."
                                                            rows={1}
                                                        />
                                                        <button onClick={() => updateItem(item.id, 'description', null)} className="absolute -right-4 top-0 text-gray-300 hover:text-red-500 print:hidden">&times;</button>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-1 py-[1px] align-baseline">
                                                <div className="flex items-baseline">
                                                    <AutoHeightTextarea 
                                                        rows={1}
                                                        className={`text-[16px] ${inputStyle} py-0`} 
                                                        value={item.spec} 
                                                        onChange={(e) => updateItem(item.id, 'spec', e.target.value)} 
                                                    />
                                                </div>
                                            </td>
                                            <td className="px-1 py-[1px] text-center align-baseline">
                                                <input type="number" className={`text-center ${inputStyle} text-[17px] py-0`} value={item.quantity} onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)} />
                                            </td>
                                            <td className="px-1 py-[1px] align-baseline">
                                                <EditablePriceCell 
                                                    value={item.price} 
                                                    displayValue={effectiveUnitPrice}
                                                    onChange={(val) => updateItem(item.id, 'price', val)} 
                                                />
                                            </td>
                                            {/* Text-only cells get py-2 to match input padding+height */}
                                            <td className="px-2 py-[1px] text-right font-medium align-baseline leading-snug text-black">
                                                {formatCurrency(rowAmount)}
                                            </td>
                                            <td className="px-2 py-[1px] text-center align-top print:hidden">
                                                <button onClick={() => deleteItem(item.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"><Trash2 size={14} /></button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                </tbody>
                            </table>
                            {isLastPage && (
                                <button onClick={addItem} className="mt-2 text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1 print:hidden opacity-50 hover:opacity-100 transition">
                                    <Plus size={16} /> 新增項目
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Footer Section */}
                    
                    {!isLastPage && (
                        <div className="text-center text-gray-400 text-sm italic py-4 border-t border-dashed mt-auto">
                            (續後頁 / Continued on next page...)
                        </div>
                    )}

                    {isLastPage && (
                        <div className="mt-auto">
                            <div className="flex gap-4 mb-[1px] items-start">
                                <div className="flex-grow h-40">
                                    <textarea 
                                        className={`h-full w-full resize-none ${inputStyle} text-base p-2`} 
                                        placeholder="額外備註 (Optional)..."
                                        value={data.extraNote}
                                        onChange={(e) => setData({...data, extraNote: e.target.value})}
                                    ></textarea>
                                </div>
                                
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

                                <div className="min-w-[280px] w-auto shrink-0 bg-white p-3 rounded print:p-0 group">
                                    <div className="flex justify-between py-1 text-[17px] items-center relative whitespace-nowrap">
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
                                    <div className="flex justify-between py-1 text-[17px] text-red-600 items-center font-bold whitespace-nowrap">
                                        <div className="flex items-center gap-1">
                                            <span>折扣 (Discount)</span>
                                            <button onClick={() => {setShowDiscount(false); setData({...data, discount: 0});}} className="text-gray-400 hover:text-red-500 print:hidden ml-1">
                                            &times;
                                            </button>
                                        </div>
                                        <div className="flex items-center ml-4">
                                            <span className="mr-1">-</span>
                                            <span className="mr-1 text-sm">NT$</span>
                                            <input 
                                                type="number" 
                                                className={`w-24 text-right text-red-600 bg-white outline-none`} 
                                                value={data.discount} 
                                                onChange={(e) => setData({...data, discount: parseFloat(e.target.value) || 0})}
                                            />
                                        </div>
                                    </div>
                                    )}

                                    <div className="flex justify-between items-center py-1 text-[17px] whitespace-nowrap">
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
                                {/* Footer Right Column: Changed gap-6 to gap-0 */}
                                <div className="w-64 shrink-0 flex flex-col gap-0"> 
                                    <div className="flex flex-col"> 
                                        <div className="h-[52px] border-b border-black mb-1"></div>
                                        <div className="text-center text-base">客戶簽名</div>
                                    </div>
                                    <div className="mt-0">
                                        <div className="mb-1 font-bold text-xl tracking-wide text-center">
                                            <input className={`text-center ${inputStyle}`} value={data.salesPerson} onChange={(e) => setData({...data, salesPerson: e.target.value})} />
                                        </div>
                                        <div className="border-t border-black pt-2 text-center text-base">業務人員</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            );
        })}
    </div>
  );
}