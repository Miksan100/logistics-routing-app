'use client';
import { useEffect, useState } from 'react';
import vendorApi from '@/lib/vendorApi';
import { Mail, CheckCircle, XCircle } from 'lucide-react';

interface EmailLog {
  id: string;
  to_email: string;
  to_name: string;
  subject: string;
  company_name: string;
  email_type: string;
  status: 'sent' | 'failed';
  error_message: string | null;
  sent_at: string;
}

export default function EmailHistoryPage() {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    vendorApi.get('/email-history').then(({ data }) => setLogs(data)).finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Mail className="w-6 h-6 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Email History</h1>
          <p className="text-sm text-gray-500 mt-0.5">{logs.length} emails sent</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left font-medium text-gray-500">Recipient</th>
                  <th className="px-5 py-3 text-left font-medium text-gray-500">Company</th>
                  <th className="px-5 py-3 text-left font-medium text-gray-500">Subject</th>
                  <th className="px-5 py-3 text-left font-medium text-gray-500">Status</th>
                  <th className="px-5 py-3 text-left font-medium text-gray-500">Sent At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-900">{log.to_name || '—'}</p>
                      <p className="text-xs text-gray-400">{log.to_email}</p>
                    </td>
                    <td className="px-5 py-3 text-gray-600">{log.company_name || '—'}</td>
                    <td className="px-5 py-3 text-gray-500 max-w-xs truncate">{log.subject}</td>
                    <td className="px-5 py-3">
                      {log.status === 'sent' ? (
                        <span className="flex items-center gap-1 text-green-700">
                          <CheckCircle className="w-4 h-4" /> Sent
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-600" title={log.error_message || ''}>
                          <XCircle className="w-4 h-4" /> Failed
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-500">
                      {new Date(log.sent_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {logs.length === 0 && <p className="text-center text-gray-400 py-12">No emails sent yet</p>}
          </div>
        )}
      </div>
    </div>
  );
}
