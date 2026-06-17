'use client';

import React, { useState } from 'react';
import { X, CreditCard, Lock, Download, CheckCircle2, Loader2 } from 'lucide-react';

type Lang = 'en' | 'zh';

type DocumentType = 'title' | 'plan' | 'instrument';

type CheckoutModalProps = {
  isOpen: boolean;
  onClose: () => void;
  selectedDocuments: DocumentType[];
  totalPrice: number;
  lotPlan: string | null;
  language: Lang;
};

type CheckoutStage = 'payment' | 'processing' | 'success';

const LABELS = {
  title: { en: 'Secure Checkout', zh: '安全结账' },
  totalAmount: { en: 'Total Amount', zh: '总金额' },
  cardNumber: { en: 'Card Number', zh: '卡号' },
  expiryDate: { en: 'Expiry Date', zh: '有效期' },
  cvv: { en: 'CVV', zh: '安全码' },
  cardholderName: { en: 'Cardholder Name', zh: '持卡人姓名' },
  payNow: { en: 'Pay Now', zh: '立即支付' },
  processing: { en: 'Processing Payment...', zh: '正在处理付款...' },
  queryingSERV: { en: 'Querying SERV Digital Distribution Platform via SPI...', zh: '正在通过 SPI 查询 SERV 数字分发平台...' },
  paymentSuccessful: { en: 'Payment Successful', zh: '付款成功' },
  documentsReady: { en: 'Your documents are ready for download:', zh: '您的文档已准备好下载:' },
  downloadPDF: { en: 'Download PDF', zh: '下载 PDF' },
  securePayment: { en: '🔒 Secure payment powered by Stripe', zh: '🔒 Stripe 提供的安全支付' },
  spiRouting: { en: 'Using SPI routing to bypass index search fees', zh: '使用 SPI 路由绕过索引查询费' },
};

const DOCUMENT_NAMES: Record<DocumentType, { en: string; zh: string }> = {
  title: { en: 'Register Search Statement (Title)', zh: '产权登记查询声明' },
  plan: { en: 'Copy of Plan', zh: '地块规划副本' },
  instrument: { en: 'Instrument Search', zh: '契约文书查询' },
};

export default function CheckoutModal({
  isOpen,
  onClose,
  selectedDocuments,
  totalPrice,
  lotPlan,
  language,
}: CheckoutModalProps) {
  const [stage, setStage] = useState<CheckoutStage>('payment');
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardholderName, setCardholderName] = useState('');

  if (!isOpen) return null;

  const handlePayment = async () => {
    // Simulate payment processing
    setStage('processing');

    // Mock 2-second delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Transition to success
    setStage('success');
  };

  const handleClose = () => {
    // Reset state on close
    setStage('payment');
    setCardNumber('');
    setExpiryDate('');
    setCvv('');
    setCardholderName('');
    onClose();
  };

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    const chunks = cleaned.match(/.{1,4}/g) || [];
    return chunks.join(' ').substring(0, 19); // 16 digits + 3 spaces
  };

  const formatExpiryDate = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return `${cleaned.substring(0, 2)}/${cleaned.substring(2, 4)}`;
    }
    return cleaned;
  };

  const t = LABELS;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-md mx-4 bg-[#241F21] border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-700">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-[#E9E778]" />
            {t.title[language]}
          </h2>
          <button
            onClick={handleClose}
            className="text-zinc-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {stage === 'payment' && (
            <>
              {/* Total Amount */}
              <div className="mb-6 p-4 rounded-lg bg-zinc-800/50 border border-zinc-700">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-400">{t.totalAmount[language]}</span>
                  <span className="text-2xl font-bold text-[#E9E778]">
                    ${totalPrice.toFixed(2)}
                  </span>
                </div>
                {lotPlan && (
                  <p className="text-xs text-zinc-500 mt-2">
                    SPI: <span className="font-mono text-zinc-400">{lotPlan}</span>
                  </p>
                )}
              </div>

              {/* Payment Form */}
              <div className="space-y-4">
                {/* Card Number */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">
                    {t.cardNumber[language]}
                  </label>
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                    placeholder="4242 4242 4242 4242"
                    className="w-full px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-[#E9E778] transition-all"
                    maxLength={19}
                  />
                </div>

                {/* Expiry & CVV */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">
                      {t.expiryDate[language]}
                    </label>
                    <input
                      type="text"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(formatExpiryDate(e.target.value))}
                      placeholder="MM/YY"
                      className="w-full px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-[#E9E778] transition-all"
                      maxLength={5}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">
                      {t.cvv[language]}
                    </label>
                    <input
                      type="text"
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').substring(0, 3))}
                      placeholder="123"
                      className="w-full px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-[#E9E778] transition-all"
                      maxLength={3}
                    />
                  </div>
                </div>

                {/* Cardholder Name */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">
                    {t.cardholderName[language]}
                  </label>
                  <input
                    type="text"
                    value={cardholderName}
                    onChange={(e) => setCardholderName(e.target.value)}
                    placeholder="John Smith"
                    className="w-full px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-[#E9E778] transition-all"
                  />
                </div>
              </div>

              {/* Security Notice */}
              <div className="mt-6 p-3 rounded-lg bg-zinc-800/30 border border-zinc-700/50">
                <p className="text-xs text-zinc-400 flex items-center gap-2">
                  <Lock className="w-3 h-3" />
                  {t.securePayment[language]}
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  {t.spiRouting[language]}
                </p>
              </div>

              {/* Pay Button */}
              <button
                onClick={handlePayment}
                className="w-full mt-6 py-3 rounded-full bg-[#E9E778] hover:bg-[#d4d262] text-[#241F21] font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
              >
                <Lock className="w-4 h-4" />
                {t.payNow[language]}
              </button>
            </>
          )}

          {stage === 'processing' && (
            <div className="py-12 flex flex-col items-center justify-center">
              <Loader2 className="w-12 h-12 text-[#E9E778] animate-spin mb-4" />
              <p className="text-lg font-bold text-white mb-2">{t.processing[language]}</p>
              <p className="text-sm text-zinc-400 text-center max-w-xs">
                {t.queryingSERV[language]}
              </p>
            </div>
          )}

          {stage === 'success' && (
            <div className="py-8">
              {/* Success Icon */}
              <div className="flex flex-col items-center mb-6">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  {t.paymentSuccessful[language]}
                </h3>
                <p className="text-sm text-zinc-400 text-center">
                  {t.documentsReady[language]}
                </p>
              </div>

              {/* Document Download Buttons */}
              <div className="space-y-3">
                {selectedDocuments.map((docType) => (
                  <button
                    key={docType}
                    onClick={() => {
                      // Mock download action
                      console.log(`Downloading ${docType} document`);
                    }}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 hover:border-[#E9E778] transition-colors group"
                  >
                    <span className="text-sm font-medium text-white">
                      {DOCUMENT_NAMES[docType][language]}
                    </span>
                    <Download className="w-4 h-4 text-zinc-400 group-hover:text-[#E9E778] transition-colors" />
                  </button>
                ))}
              </div>

              {/* Close Button */}
              <button
                onClick={handleClose}
                className="w-full mt-6 py-3 rounded-full border border-zinc-700 text-zinc-300 hover:bg-zinc-800 font-bold uppercase tracking-wider transition-colors"
              >
                {language === 'en' ? 'Close' : '关闭'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
