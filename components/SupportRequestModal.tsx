'use client';

import { useState } from 'react';
import { X, Send, Mail } from 'lucide-react';

interface SupportRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  language?: 'tr' | 'en';
}

const supportTopics = [
  { id: 'general', labelTr: 'Genel Soru', labelEn: 'General Question' },
  { id: 'technical', labelTr: 'Teknik Destek', labelEn: 'Technical Support' },
  { id: 'billing', labelTr: 'Ödeme/Abonelik', labelEn: 'Billing/Subscription' },
  { id: 'feature', labelTr: 'Özellik Önerisi', labelEn: 'Feature Request' },
  { id: 'bug', labelTr: 'Hata Bildirimi', labelEn: 'Bug Report' },
  { id: 'other', labelTr: 'Diğer', labelEn: 'Other' },
];

export default function SupportRequestModal({ isOpen, onClose, language = 'tr' }: SupportRequestModalProps) {
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedTopic) {
      setError(language === 'tr' ? 'Lütfen bir konu seçin' : 'Please select a topic');
      return;
    }

    if (!message.trim()) {
      setError(language === 'tr' ? 'Lütfen mesajınızı yazın' : 'Please enter your message');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/support-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: selectedTopic,
          message: message.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSubmitSuccess(true);
        setMessage('');
        setSelectedTopic('');
        // Auto close after 3 seconds
        setTimeout(() => {
          setSubmitSuccess(false);
          onClose();
        }, 3000);
      } else {
        setError(data.error || (language === 'tr' ? 'Bir hata oluştu' : 'An error occurred'));
      }
    } catch (err) {
      setError(language === 'tr' ? 'Bağlantı hatası' : 'Connection error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setSubmitSuccess(false);
      setError('');
      setMessage('');
      setSelectedTopic('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Mail className="w-5 h-5 text-blue-400" />
            </div>
            <h2 className="text-xl font-semibold text-white">
              {language === 'tr' ? 'Destek Talebi' : 'Support Request'}
            </h2>
          </div>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="p-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {submitSuccess ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Send className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                {language === 'tr' ? 'Talebiniz Alındı!' : 'Request Received!'}
              </h3>
              <p className="text-gray-400">
                {language === 'tr' 
                  ? 'Ekiplerimiz en kısa sürede mail üzerinden sizinle iletişime geçecektir.'
                  : 'Our team will contact you via email as soon as possible.'}
              </p>
            </div>
          ) : (
            <>
              {/* Topic Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  {language === 'tr' ? 'Konu' : 'Topic'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {supportTopics.map((topic) => (
                    <button
                      key={topic.id}
                      type="button"
                      onClick={() => {
                        setSelectedTopic(topic.id);
                        setError('');
                      }}
                      className={`p-3 rounded-lg border-2 transition-all text-left ${
                        selectedTopic === topic.id
                          ? 'border-blue-500 bg-blue-500/10 text-white'
                          : 'border-gray-700 bg-gray-800/50 text-gray-300 hover:border-gray-600'
                      }`}
                    >
                      <span className="text-sm font-medium">
                        {language === 'tr' ? topic.labelTr : topic.labelEn}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  {language === 'tr' ? 'Mesajınız' : 'Your Message'}
                </label>
                <textarea
                  value={message}
                  onChange={(e) => {
                    setMessage(e.target.value);
                    setError('');
                  }}
                  placeholder={language === 'tr' 
                    ? 'Sorunuzu veya önerinizi detaylı bir şekilde yazın...'
                    : 'Please describe your question or suggestion in detail...'}
                  rows={6}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors resize-none"
                  disabled={isSubmitting}
                />
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || !selectedTopic || !message.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>{language === 'tr' ? 'Gönderiliyor...' : 'Sending...'}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    <span>{language === 'tr' ? 'Gönder' : 'Send'}</span>
                  </>
                )}
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}

