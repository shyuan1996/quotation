export interface CompanyInfo {
  name: string;
  address: string;
  phone: string;
  fax: string;
  email: string;
  taxId: string;
}

export interface ClientInfo {
  name: string;
  contact: string;
  address: string;
  phone: string;
}

export interface QuoteDetails {
  number: string;
  date: string;
  taxRate: number;
}

export interface QuoteItem {
  id: number;
  name: string;
  spec: string;
  description: string | null;
  quantity: number;
  price: number;
}

export interface QuotationData {
  id?: string; // Firebase Document ID
  fileName: string;
  companyInfo: CompanyInfo;
  clientInfo: ClientInfo;
  quoteDetails: QuoteDetails;
  items: QuoteItem[];
  themeColor: string;
  logo: string | null; // Base64 string
  seal: string | null; // Base64 string
  salesPerson: string;
  notes: string;
  extraNote: string;
  discount: number;
  isTaxInclusive: boolean;
  updatedAt?: number;
}

export const DEFAULT_COMPANY_INFO: CompanyInfo = {
  name: '祥鉞餐飲設備股份有限公司',
  address: '406台中市北屯區水景街8號',
  phone: '04-2436-5774',
  fax: '04-2437-4738',
  email: 'sy.shyuan950101@shyuan.com.tw',
  taxId: '89872485',
};

export const DEFAULT_NOTES = "1. 本報價單有效期限為 14 天，確定訂購請簽名回傳。\n2. 付款方式：現金(首次交易) / 30天票期。保固範圍：1年\n3. 以上報價送貨位置為指定地點一樓，樓層搬運費用另計。\n4. 本報價單金額不含各項水、電、瓦斯之來源及配件、開關等；由業\n　主提供至設備定點。";
