import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  Award, 
  Settings as SettingsIcon, 
  Upload, 
  X, 
  Save, 
  Image as ImageIcon, 
  Search, 
  CheckCircle, 
  AlertCircle, 
  Trash2, 
  Eye, 
  Download, 
  ShieldCheck, 
  Loader2, 
  RefreshCw,
  Sliders,
  FileCheck,
  Layers,
  UserCheck
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { CertificateRenderer } from '../components/CertificateRenderer';

export function AdminCertificatesPage() {
  const { dbUser, user } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'template' | 'issued' | 'verify'>('template');

  // Template settings state
  const [certSettings, setCertSettings] = useState<any>(null);
  const [certLoading, setCertLoading] = useState(true);
  const [certSaving, setCertSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(true);

  // Issued certificates state
  const [issuedCerts, setIssuedCerts] = useState<any[]>([]);
  const [issuedLoading, setIssuedLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCert, setSelectedCert] = useState<any>(null);
  const [certPreviewData, setCertPreviewData] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Verification state
  const [verifyIdInput, setVerifyIdInput] = useState('');
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // Fetch Template Settings
  useEffect(() => {
    if (dbUser?.role === 'admin' && user) {
            user.getIdToken().then(token => {
        fetch('/api/v1/certificates/settings', {
          headers: { Authorization: `Bearer ${token}` }
        })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data) {
             setCertSettings(data);
          } else {
             // Fallback if backend still fails
             setCertSettings({
                enabled: false,
                passingPercentage: 70,
                backgroundImage: null,
                layoutConfig: {
        studentName: { x: 148.5, y: 92, fontSize: 36, color: '#000000', align: 'center', enabled: true, fontStyle: 'italic' },
        studentEmail: { x: 148.5, y: 110, fontSize: 14, color: '#666666', align: 'center', enabled: false },
        quizTitle: { x: 148.5, y: 122, fontSize: 20, color: '#000000', align: 'center', enabled: true, fontStyle: 'bold' },
        score: { x: 47.5, y: 163, fontSize: 14, color: '#000000', align: 'center', enabled: true },
        percentage: { x: 98, y: 163, fontSize: 14, color: '#000000', align: 'center', enabled: true },
        rank: { x: 148.5, y: 163, fontSize: 14, color: '#000000', align: 'center', enabled: true },
        issueDate: { x: 199, y: 163, fontSize: 14, color: '#000000', align: 'center', enabled: true },
        certificateId: { x: 249.5, y: 163, fontSize: 12, color: '#000000', align: 'center', enabled: true }
                }
             });
          }
          setCertLoading(false);
        })
        .catch(err => {
          console.error(err);
          setCertLoading(false);
        });
      });
    }
  }, [dbUser, user]);

  // Fetch Issued Certificates when switching to 'issued' tab
  const fetchIssuedCertificates = async () => {
    if (!user) return;
    setIssuedLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/v1/certificates/all-issued', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json().catch(() => []);
        setIssuedCerts(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIssuedLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'issued') {
      fetchIssuedCertificates();
    }
  }, [activeTab]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 3 * 1024 * 1024) {
        alert('File size must be less than 3MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setCertSettings({ ...certSettings, backgroundImage: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const saveCertSettings = async () => {
    if (!user) return;
    setCertSaving(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/v1/certificates/settings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(certSettings)
      });
      if (res.ok) {
        alert('Certificate template settings saved successfully!');
      } else {
        alert('Failed to save certificate settings.');
      }
    } catch (err) {
      console.error(err);
      alert('Error saving settings.');
    } finally {
      setCertSaving(false);
    }
  };

  const handlePreviewIssued = async (cert: any) => {
    setSelectedCert(cert);
    setPreviewLoading(true);
    setCertPreviewData(null);
    try {
      const token = await user?.getIdToken();
      const res = await fetch(`/api/v1/certificates/${cert.certificateId}/download-data`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (data) setCertPreviewData(data);
      } else {
        alert('Could not load certificate data.');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!certPreviewData) return;
    const element = document.getElementById('certificate-preview-node');
    if (!element) return;
    try {
      const canvas = await html2canvas(element, { scale: 2 });
      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const doc = new jsPDF('landscape', 'mm', 'a4');
      doc.addImage(imgData, 'JPEG', 0, 0, 297, 210);
      doc.save(`Certificate_${certPreviewData.data.studentName}_${certPreviewData.data.quizTitle}.pdf`);
    } catch (e) {
      console.error(e);
      alert('Error generating PDF');
    }
  };

  const handleRevokeCert = async (certId: string) => {
    if (!window.confirm(`Are you sure you want to revoke certificate ID: ${certId}? This action cannot be undone.`)) {
      return;
    }
    try {
      const token = await user?.getIdToken();
      const res = await fetch(`/api/v1/certificates/${certId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setIssuedCerts(prev => prev.filter(c => c.certificateId !== certId));
        if (selectedCert?.certificateId === certId) setSelectedCert(null);
      } else {
        alert('Failed to revoke certificate.');
      }
    } catch (e) {
      console.error(e);
      alert('Error revoking certificate.');
    }
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyIdInput.trim()) return;
    setVerifyLoading(true);
    setVerifyError(null);
    setVerifyResult(null);

    try {
      const res = await fetch('/api/v1/certificates/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ certificateId: verifyIdInput.trim() })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.valid) {
        setVerifyResult(data.certificate);
      } else {
        setVerifyError(data.message || 'Invalid or unrecognized Certificate ID.');
      }
    } catch (e) {
      console.error(e);
      setVerifyError('An error occurred while verifying the certificate.');
    } finally {
      setVerifyLoading(false);
    }
  };

  const filteredCerts = issuedCerts.filter(c => {
    const query = searchQuery.toLowerCase();
    return (
      c.certificateId.toLowerCase().includes(query) ||
      (c.studentName && c.studentName.toLowerCase().includes(query)) ||
      c.studentEmail.toLowerCase().includes(query) ||
      c.quizTitle.toLowerCase().includes(query)
    );
  });

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Certificate Management</h1>
              <p className="text-slate-500 text-sm">Design templates, set passing criteria, and manage issued student certificates.</p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="flex items-center gap-4 border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-6">
          <div className="text-center">
            <span className="block text-2xl font-black text-indigo-600">{issuedCerts.length || 0}</span>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Issued</span>
          </div>
          <div className="h-8 w-px bg-slate-200" />
          <div className="text-center">
            <span className={`block text-xs font-extrabold px-2.5 py-1 rounded-full ${certSettings?.enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
              {certSettings?.enabled ? 'Auto-Issue On' : 'Paused'}
            </span>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mt-1 block">Status</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 space-x-8">
        <button
          onClick={() => setActiveTab('template')}
          className={`pb-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'template'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sliders className="w-4 h-4" />
          Template & Design
        </button>

        <button
          onClick={() => setActiveTab('issued')}
          className={`pb-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'issued'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          Issued Certificates ({issuedCerts.length})
        </button>

        <button
          onClick={() => setActiveTab('verify')}
          className={`pb-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'verify'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          Verify Authenticity
        </button>
      </div>

      {/* TAB 1: TEMPLATE EDITOR */}
      {activeTab === 'template' && (
        <div className="space-y-8">
          {certLoading ? (
            <div className="flex items-center justify-center p-12 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
          ) : certSettings ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 md:p-8 space-y-8">
                {/* General Settings Bar */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-6 border-b border-slate-100">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">Automatic Issuance</h4>
                      <p className="text-xs text-slate-500">Generate certificates upon passing quiz</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={certSettings.enabled} 
                        onChange={e => setCertSettings({...certSettings, enabled: e.target.checked})} 
                        className="sr-only peer" 
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <label className="block font-bold text-slate-900 text-sm mb-1">Passing Threshold Score (%)</label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="number" 
                        min="0"
                        max="100"
                        value={certSettings.passingPercentage} 
                        onChange={e => setCertSettings({...certSettings, passingPercentage: parseInt(e.target.value) || 0})}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                      />
                      <span className="text-sm font-bold text-slate-500">%</span>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <label className="block font-bold text-slate-900 text-sm mb-1">Certificate Template Background</label>
                    <div className="flex items-center gap-3 mt-1">
                      {certSettings.backgroundImage ? (
                        <div className="relative w-24 h-16 rounded-lg overflow-hidden border border-slate-300 group shrink-0">
                          <img src={certSettings.backgroundImage} alt="Template" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/60 hidden group-hover:flex items-center justify-center">
                            <button onClick={() => setCertSettings({...certSettings, backgroundImage: null})} className="p-1 bg-red-500 text-white rounded-md">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <label className="flex items-center gap-2 px-3 py-2 bg-white border border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors text-xs font-semibold text-slate-600">
                          <Upload className="w-4 h-4 text-indigo-500" />
                          <span>Upload (A4 Landscape)</span>
                          <input type="file" accept="image/png, image/jpeg" className="hidden" onChange={handleImageUpload} />
                        </label>
                      )}
                    </div>
                  </div>
                </div>

                {/* Layout Field Configuration */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">Dynamic Canvas Layout Positioning</h3>
                      <p className="text-xs text-slate-500">Configure coordinates (mm) for A4 Landscape canvas (297mm x 210mm). Note: Positioning only applies when a custom background is uploaded.</p>
                    </div>
                    <button 
                      onClick={() => setShowPreview(!showPreview)}
                      className="text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
                    >
                      <ImageIcon className="w-4 h-4" /> {showPreview ? 'Hide Preview Canvas' : 'Show Preview Canvas'}
                    </button>
                  </div>

                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="py-3 px-4">Field Name</th>
                          <th className="py-3 px-4 text-center">Enable</th>
                          <th className="py-3 px-4">X (mm)</th>
                          <th className="py-3 px-4">Y (mm)</th>
                          <th className="py-3 px-4">Font Size</th>
                          <th className="py-3 px-4 text-center">Text Color</th>
                          <th className="py-3 px-4">Alignment</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {Object.keys(certSettings.layoutConfig).map(field => {
                          const conf = certSettings.layoutConfig[field];
                          const updateConf = (key: string, val: any) => {
                            setCertSettings({
                              ...certSettings,
                              layoutConfig: {
                                ...certSettings.layoutConfig,
                                [field]: { ...conf, [key]: val }
                              }
                            });
                          };
                          return (
                            <tr key={field} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-2.5 px-4 font-bold text-slate-800 capitalize">
                                {field.replace(/([A-Z])/g, ' $1').trim()}
                              </td>
                              <td className="py-2.5 px-4 text-center">
                                <input 
                                  type="checkbox" 
                                  checked={conf.enabled} 
                                  onChange={e => updateConf('enabled', e.target.checked)} 
                                  className="w-4 h-4 text-indigo-600 rounded border-slate-300" 
                                />
                              </td>
                              <td className="py-2.5 px-4">
                                <input 
                                  type="number" 
                                  value={conf.x} 
                                  onChange={e => updateConf('x', parseFloat(e.target.value) || 0)} 
                                  className="w-20 px-2 py-1 border border-slate-300 rounded font-mono text-xs" 
                                />
                              </td>
                              <td className="py-2.5 px-4">
                                <input 
                                  type="number" 
                                  value={conf.y} 
                                  onChange={e => updateConf('y', parseFloat(e.target.value) || 0)} 
                                  className="w-20 px-2 py-1 border border-slate-300 rounded font-mono text-xs" 
                                />
                              </td>
                              <td className="py-2.5 px-4">
                                <input 
                                  type="number" 
                                  value={conf.fontSize} 
                                  onChange={e => updateConf('fontSize', parseInt(e.target.value) || 12)} 
                                  className="w-20 px-2 py-1 border border-slate-300 rounded font-mono text-xs" 
                                />
                              </td>
                              <td className="py-2.5 px-4 text-center">
                                <input 
                                  type="color" 
                                  value={conf.color} 
                                  onChange={e => updateConf('color', e.target.value)} 
                                  className="w-7 h-7 rounded border border-slate-300 cursor-pointer p-0" 
                                />
                              </td>
                              <td className="py-2.5 px-4">
                                <select 
                                  value={conf.align} 
                                  onChange={e => updateConf('align', e.target.value)} 
                                  className="px-2 py-1 border border-slate-300 rounded text-xs bg-white"
                                >
                                  <option value="left">Left</option>
                                  <option value="center">Center</option>
                                  <option value="right">Right</option>
                                </select>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Live Preview Canvas */}
                {showPreview && (
                  <div className="border border-slate-200 rounded-2xl p-4 bg-slate-100 space-y-3">
                    <div className="flex items-center justify-between px-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <ImageIcon className="w-4 h-4 text-indigo-600" /> Live Certificate Preview (A4 Landscape Scale)
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">297mm x 210mm</span>
                    </div>

                    <div className="w-full flex items-center justify-center p-4 bg-slate-200/80 rounded-xl overflow-hidden relative">
                      <div 
                        className="relative bg-white shadow-lg border border-slate-300 rounded"
                        style={{
                          width: '100%',
                          maxWidth: '850px',
                          aspectRatio: '297/210',
                          backgroundImage: certSettings?.backgroundImage ? `url(${certSettings.backgroundImage})` : 'none',
                          backgroundSize: '100% 100%',
                          backgroundRepeat: 'no-repeat',
                          containerType: 'inline-size'
                        }}
                      >
                        {['studentName', 'studentEmail', 'quizTitle', 'score', 'percentage', 'rank', 'issueDate', 'certificateId'].map(field => {
                          const conf = certSettings?.layoutConfig?.[field];
                          if (conf && conf.enabled) {
                            let text = field.toUpperCase();
                            if (field === 'studentName') text = 'Muhammad Nouman';
                            if (field === 'studentEmail') text = 'nouman@example.com';
                            if (field === 'quizTitle') text = 'Full-Stack Engineering';
                            if (field === 'certificateId') text = 'CERT-DEV-984A2';
                            if (field === 'score') text = '95 pts';
                            if (field === 'percentage') text = '95%';
                            if (field === 'rank') text = '#1';
                            if (field === 'issueDate') text = '08/08/2026';

                            return (
                              <div 
                                key={field}
                                style={{
                                  position: 'absolute',
                                  left: `${(conf.x / 297) * 100}%`,
                                  top: `${(conf.y / 210) * 100}%`,
                                  transform: `translate(${conf.align === 'center' ? '-50%' : conf.align === 'right' ? '-100%' : '0'}, -100%)`,
                                  color: conf.color || '#000',
                                  fontSize: `${conf.fontSize * 0.1187}cqi`,
                                  whiteSpace: 'nowrap',
                                  fontWeight: field === 'studentName' || field === 'quizTitle' ? 'bold' : 'normal'
                                }}
                              >
                                {text}
                              </div>
                            );
                          }
                          return null;
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Bar */}
              <div className="bg-slate-50 p-6 border-t border-slate-200 flex items-center justify-between">
                <span className="text-xs text-slate-500">Ensure template parameters are verified before saving.</span>
                <button 
                  onClick={saveCertSettings} 
                  disabled={certSaving} 
                  className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50"
                >
                  {certSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Settings
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-red-50 p-6 rounded-xl border border-red-200 text-red-700 text-sm">
              Failed to load certificate settings. Please try refreshing.
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ISSUED CERTIFICATES LOG */}
      {activeTab === 'issued' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input 
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search student, email, or cert ID..."
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              />
            </div>

            <button 
              onClick={fetchIssuedCertificates}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh List
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {issuedLoading ? (
              <div className="p-12 text-center text-slate-500 flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-indigo-600" /> Loading issued certificates...
              </div>
            ) : filteredCerts.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <Award className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="font-bold text-slate-800 text-sm">No issued certificates found.</p>
                <p className="text-xs text-slate-500 mt-1">Certificates will automatically appear here once students complete quizzes.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[11px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3.5 px-6">Certificate ID</th>
                      <th className="py-3.5 px-6">Student</th>
                      <th className="py-3.5 px-6">Quiz Title</th>
                      <th className="py-3.5 px-6">Issue Date</th>
                      <th className="py-3.5 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCerts.map(cert => (
                      <tr key={cert.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-4 px-6 font-mono font-bold text-indigo-600 text-xs">
                          {cert.certificateId}
                        </td>
                        <td className="py-4 px-6">
                          <div className="font-bold text-slate-900">{cert.studentName || 'Student'}</div>
                          <div className="text-xs text-slate-500">{cert.studentEmail}</div>
                        </td>
                        <td className="py-4 px-6 font-semibold text-slate-800">
                          {cert.quizTitle}
                        </td>
                        <td className="py-4 px-6 text-xs text-slate-500">
                          {new Date(cert.issuedAt).toLocaleDateString()}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handlePreviewIssued(cert)}
                              className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Preview Certificate"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleRevokeCert(cert.certificateId)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Revoke Certificate"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: VERIFICATION TOOL */}
      {activeTab === 'verify' && (
        <div className="max-w-xl mx-auto bg-white rounded-2xl border border-slate-200 p-8 shadow-sm space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Certificate Verification Portal</h2>
            <p className="text-slate-500 text-xs">Enter a unique Certificate ID to verify recipient details and authenticity.</p>
          </div>

          <form onSubmit={handleVerifySubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Certificate ID</label>
              <input 
                type="text"
                required
                value={verifyIdInput}
                onChange={e => setVerifyIdInput(e.target.value)}
                placeholder="e.g. CERT-17234850"
                className="w-full px-4 py-3 border border-slate-300 rounded-xl font-mono text-sm uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button
              type="submit"
              disabled={verifyLoading || !verifyIdInput.trim()}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {verifyLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              Verify Certificate
            </button>
          </form>

          {verifyError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{verifyError}</span>
            </div>
          )}

          {verifyResult && (
            <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-4">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                <CheckCircle className="w-5 h-5 text-emerald-600" /> Authentic Certificate Verified
              </div>
              <div className="space-y-2 text-xs border-t border-emerald-200/60 pt-3 text-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-500">Recipient Name:</span>
                  <span className="font-bold text-slate-900">{verifyResult.studentName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Recipient Email:</span>
                  <span className="font-mono">{verifyResult.studentEmail}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Quiz / Course:</span>
                  <span className="font-semibold">{verifyResult.quizTitle}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Issue Date:</span>
                  <span>{new Date(verifyResult.issuedAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Certificate ID:</span>
                  <span className="font-mono font-bold text-indigo-700">{verifyResult.certificateId}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ISSUED PREVIEW MODAL */}
      {selectedCert && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-xl border border-slate-200 relative max-h-[85vh] flex flex-col">
            <button 
              onClick={() => { setSelectedCert(null); setCertPreviewData(null); }}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Certificate Preview</h3>
                <p className="text-xs text-slate-500">Recipient: {selectedCert.studentName || selectedCert.studentEmail}</p>
              </div>
            </div>

            {previewLoading ? (
              <div className="flex-1 flex items-center justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              </div>
            ) : certPreviewData ? (
              <div className="space-y-4">
                <div className="w-full flex items-center justify-center bg-slate-100 rounded-xl border border-slate-200 p-4 relative overflow-hidden">
                  <div id="certificate-preview-node" className="w-full relative shadow-md rounded overflow-hidden">
                  <CertificateRenderer data={certPreviewData.data} template={certPreviewData.template} />
                </div>
              </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button 
                    onClick={handleDownloadPdf}
                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 shadow-sm"
                  >
                    <Download className="w-4 h-4" /> Download PDF
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
