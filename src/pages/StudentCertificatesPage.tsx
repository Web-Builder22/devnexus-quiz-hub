import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  Award, 
  Download, 
  Eye, 
  Printer, 
  Share2, 
  ShieldCheck, 
  Loader2, 
  CheckCircle, 
  X, 
  Copy, 
  Check, 
  Sparkles,
  Search,
  ExternalLink,
  BookOpen
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { CertificateRenderer } from '../components/CertificateRenderer';

export function StudentCertificatesPage() {
  const { user, dbUser } = useAuth();
  const navigate = useNavigate();

  const [certificates, setCertificates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal / Preview state
  const [selectedCert, setSelectedCert] = useState<any | null>(null);
  const [certData, setCertData] = useState<{template: any, data: any} | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Verification state
  const [verifyInput, setVerifyInput] = useState('');
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const fetchCertificates = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/v1/certificates/my-certificates', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json().catch(() => []);
        setCertificates(Array.isArray(data) ? data : []);
      } else {
        throw new Error('Failed to load certificates');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Unable to connect to server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCertificates();
  }, [user]);

  const loadCertificatePreview = async (certId: string) => {
    setPreviewLoading(true);
    setCertData(null);
    try {
      const token = await user?.getIdToken();
      const res = await fetch(`/api/v1/certificates/${certId}/download-data`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch certificate data');
      const data = await res.json().catch(() => null);
      if (!data) throw new Error('Invalid JSON data received');
      setCertData(data);
    } catch (e) {
      console.error(e);
      alert('Could not load certificate preview');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!certData) return;
    const element = document.getElementById('certificate-preview-node-student');
    if (!element) return;
    try {
      const canvas = await html2canvas(element, { scale: 2 });
      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const doc = new jsPDF('landscape', 'mm', 'a4');
      doc.addImage(imgData, 'JPEG', 0, 0, 297, 210);
      doc.save(`Certificate_${certData.data.studentName}_${certData.data.quizTitle}.pdf`);
    } catch (e) {
      console.error(e);
      alert('Error generating PDF');
    }
  };

  const handleCopyId = (certId: string) => {
    navigator.clipboard.writeText(certId);
    setCopiedId(certId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyInput.trim()) return;
    setVerifyLoading(true);
    setVerifyError(null);
    setVerifyResult(null);

    try {
      const res = await fetch('/api/v1/certificates/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ certificateId: verifyInput.trim() })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.valid) {
        setVerifyResult(data.certificate);
      } else {
        setVerifyError(data.message || 'Invalid Certificate ID');
      }
    } catch (e) {
      console.error(e);
      setVerifyError('Error verifying certificate');
    } finally {
      setVerifyLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-900 rounded-2xl p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/4" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl">
              <Award className="w-8 h-8 text-amber-300" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">My Earned Certificates</h1>
              <p className="text-indigo-200 text-sm mt-1">
                View, download high-resolution PDF credentials, and verify your official course achievements.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white/10 border border-white/20 backdrop-blur-md px-5 py-3 rounded-xl text-center">
            <div>
              <span className="block text-2xl font-black text-amber-300">{certificates.length}</span>
              <span className="text-[11px] font-bold text-indigo-100 uppercase tracking-wider">Certificates</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid md:grid-cols-3 gap-8">
        {/* Certificates Grid (Left 2 Columns) */}
        <div className="md:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Award className="w-5 h-5 text-indigo-600" /> Official Certificates
            </h2>
            <span className="text-xs font-semibold text-slate-500">{certificates.length} Total</span>
          </div>

          {loading ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-2" />
              Loading your certificates...
            </div>
          ) : certificates.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4">
              <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mx-auto">
                <Award className="w-8 h-8" />
              </div>
              <div className="max-w-sm mx-auto">
                <h3 className="font-bold text-slate-900 text-base">No Certificates Earned Yet</h3>
                <p className="text-slate-500 text-xs mt-1">
                  Complete available quizzes with passing scores to earn official certificates automatically.
                </p>
              </div>
              <button
                onClick={() => navigate('/student/dashboard')}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-colors"
              >
                <BookOpen className="w-4 h-4" /> Browse Available Quizzes
              </button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {certificates.map(cert => (
                <div 
                  key={cert.id} 
                  className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-indigo-300 hover:shadow-md transition-all flex flex-col justify-between space-y-4 group"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">
                        Verified Certificate
                      </span>
                      <Award className="w-5 h-5 text-amber-500 group-hover:scale-110 transition-transform" />
                    </div>

                    <h3 className="font-bold text-slate-900 text-base group-hover:text-indigo-600 transition-colors">
                      {cert.quizTitle}
                    </h3>

                    <div className="text-xs text-slate-500 space-y-1 pt-1">
                      <div className="flex items-center justify-between">
                        <span>Issued On:</span>
                        <span className="font-semibold text-slate-700">{new Date(cert.issuedAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>ID:</span>
                        <span className="font-mono font-bold text-slate-900">{cert.certificateId}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleCopyId(cert.certificateId)}
                      className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors text-xs font-semibold flex items-center gap-1"
                      title="Copy Certificate ID"
                    >
                      {copiedId === cert.certificateId ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>

                    <button
                      onClick={() => {
                        setSelectedCert(cert);
                        loadCertificatePreview(cert.certificateId);
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
                    >
                      <Eye className="w-3.5 h-3.5" /> View Certificate
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Verification Widget Sidebar (Right 1 Column) */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Certificate Verifier</h3>
            </div>
            <p className="text-xs text-slate-500">
              Verify the validity of any Certificate ID issued by our examination platform.
            </p>

            <form onSubmit={handleVerify} className="space-y-3">
              <input 
                type="text"
                required
                value={verifyInput}
                onChange={e => setVerifyInput(e.target.value)}
                placeholder="Enter Certificate ID"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-mono text-xs uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="submit"
                disabled={verifyLoading || !verifyInput.trim()}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {verifyLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                Verify Credential
              </button>
            </form>

            {verifyError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold">
                {verifyError}
              </div>
            )}

            {verifyResult && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 text-xs">
                <div className="font-bold text-emerald-800 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600" /> Authentic Credential
                </div>
                <div className="space-y-1 text-slate-700 pt-1 border-t border-emerald-200/60">
                  <div><strong>Recipient:</strong> {verifyResult.studentName}</div>
                  <div><strong>Course:</strong> {verifyResult.quizTitle}</div>
                  <div><strong>Date:</strong> {new Date(verifyResult.issuedAt).toLocaleDateString()}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PREVIEW & DOWNLOAD MODAL */}
      {selectedCert && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-xl border border-slate-200 relative max-h-[85vh] flex flex-col">
            <button 
              onClick={() => { setSelectedCert(null); setCertData(null); }}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">{selectedCert.quizTitle}</h3>
                <p className="text-xs text-slate-500">Official Credential: {selectedCert.certificateId}</p>
              </div>
            </div>

            {previewLoading ? (
              <div className="flex-1 flex items-center justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              </div>
            ) : certData ? (
              <div className="space-y-4">
                <div className="w-full flex items-center justify-center bg-slate-100 rounded-xl border border-slate-200 p-4 relative overflow-hidden">
                  <div id="certificate-preview-node-student" className="w-full relative shadow-md rounded overflow-hidden">
                  <CertificateRenderer data={certData.data} template={certData.template} />
                </div>

                </div>
                <div className="flex justify-between items-center pt-2">
                  <button
                    onClick={() => handleCopyId(selectedCert.certificateId)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                  >
                    {copiedId === selectedCert.certificateId ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    {copiedId === selectedCert.certificateId ? 'Copied ID' : 'Copy Cert ID'}
                  </button>

                  <button 
                    onClick={handleDownloadPdf}
                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 shadow-sm"
                  >
                    <Download className="w-4 h-4" /> Download High-Res PDF
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500 text-sm">Could not load certificate preview.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
