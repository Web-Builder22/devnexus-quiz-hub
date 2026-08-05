import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Download, Trophy, Clock, CheckCircle2, XCircle, Award } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { CertificateRenderer } from '../components/CertificateRenderer';
import autoTable from 'jspdf-autotable';

export function QuizResults() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  useEffect(() => {
    if (!token || !id) return;
    fetch(`/api/v1/analytics/quizzes/${id}/export`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => {
      if (!res.ok) throw new Error('Failed to fetch results');
      return res.json().catch(() => null);
    })
    .then(data => {
      if (data) {
        setData(data);
      } else {
        setError('Could not load quiz results.');
      }
      setLoading(false);
    })
    .catch(err => {
      console.error(err);
      setError('Could not load quiz results.');
      setLoading(false);
    });
  }, [id, token]);

  
  const downloadCertificate = async (participant: any) => {
    if (!participant.certificateId) return;
    try {
      const res = await fetch(`/api/v1/certificates/${participant.certificateId}/download-data`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const { template, data } = await res.json();
        
        // We need to render it temporarily to generate PDF.
        // We can create an invisible container for html2canvas
        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.top = '-9999px';
        container.style.width = '1000px'; 
        document.body.appendChild(container);
        
        // Render with standard ReactDOM client
        const { createRoot } = await import('react-dom/client');
        const root = createRoot(container);
        
        // Wrap in a promise to wait for render
        await new Promise(resolve => {
            root.render(<div id="pdf-cert-temp"><CertificateRenderer data={data} template={template} /></div>);
            setTimeout(resolve, 500); // give it time to render images/fonts
        });
        
        const element = document.getElementById('pdf-cert-temp');
        if (element) {
           const canvas = await html2canvas(element, { scale: 2 });
           const imgData = canvas.toDataURL('image/jpeg', 1.0);
           const doc = new jsPDF('landscape', 'mm', 'a4');
           doc.addImage(imgData, 'JPEG', 0, 0, 297, 210);
           doc.save(`Certificate_${data.studentName}_${data.quizTitle}.pdf`);
        }
        
        root.unmount();
        document.body.removeChild(container);
      } else {
        alert('Could not download certificate');
      }
    } catch (e) {
      console.error(e);
      alert('Could not download certificate');
    }
  };

  const generatePDF = (participant: any) => {
    setDownloadingId(participant.id);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      
      // Header Background
      doc.setFillColor(79, 70, 229); // Indigo 600
      doc.rect(0, 0, pageWidth, 40, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.text('Participant Performance Report', pageWidth / 2, 25, { align: 'center' });
      
      // Quiz Info
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Quiz Details', 20, 55);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Title: ${data.quiz.title}`, 20, 65);
      doc.text(`Code: ${data.quiz.code}`, 20, 72);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 79);
      
      // Participant Info
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Participant Details', 120, 55);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Name: ${participant.studentName || 'Unknown'}`, 120, 65);
      doc.text(`Email: ${participant.studentEmail || 'N/A'}`, 120, 72);
      doc.text(`Status: ${participant.status === 'auto_submitted' ? 'Auto Submitted' : 'Completed'}`, 120, 79);
      doc.text(`Submitted: ${new Date(participant.completedAt || participant.startedAt).toLocaleString()}`, 120, 86);
      
      // Divider
      doc.setDrawColor(226, 232, 240);
      doc.line(20, 95, pageWidth - 20, 95);

      // Performance Summary
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Performance Summary', 20, 110);
      
      const p = participant.percentage;
      let msg = "";
      let overall = "";
      if (p >= 90) {
        overall = "Excellent";
        msg = "Outstanding Performance! Keep up the excellent work and continue striving for excellence.";
      } else if (p >= 75) {
        overall = "Good";
        msg = "Great Job! You performed very well. Keep practicing to reach the top.";
      } else if (p >= 50) {
        overall = "Average";
        msg = "Good Effort! With a little more practice, you can achieve even better results.";
      } else {
        overall = "Needs Improvement";
        msg = "Don't be discouraged. Every attempt is a learning opportunity. Keep practicing and you'll improve with time.";
      }

      autoTable(doc, {
        startY: 120,
        head: [['Metric', 'Result']],
        body: [
          ['Overall Performance', overall],
          ['Rank', `#${participant.rank} of ${data.results.length}`],
          ['Final Score', `${participant.score} points`],
          ['Accuracy Percentage', `${participant.percentage}%`],
          ['Correct Answers', `${participant.correctAnswersCount}`],
          ['Incorrect Answers', `${participant.incorrectAnswersCount}`],
          ['Time Taken', `${Math.floor(participant.timeTakenMs / 60000)}m ${Math.floor((participant.timeTakenMs % 60000)/1000)}s`]
        ],
        theme: 'grid',
        headStyles: { fillColor: [248, 250, 252], textColor: [71, 85, 105], fontStyle: 'bold' },
        styles: { fontSize: 11, cellPadding: 6 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 80 } }
      });
      
      const finalY = (doc as any).lastAutoTable.finalY || 160;
      
      // Motivational Message Box
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(20, finalY + 15, pageWidth - 40, 35, 3, 3, 'F');
      
      doc.setTextColor(71, 85, 105);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'italic');
      
      const splitMsg = doc.splitTextToSize(`"${msg}"`, pageWidth - 60);
      doc.text(splitMsg, pageWidth / 2, finalY + 30, { align: 'center' });
      
      // Footer
      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184);
      doc.text('Generated by Quiz Platform', pageWidth / 2, doc.internal.pageSize.height - 15, { align: 'center' });
      
      doc.save(`Performance_Report_${participant.studentEmail.split('@')[0]}.pdf`);
    } catch (e) {
      console.error(e);
      alert('Failed to generate PDF');
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-slate-500">Loading results...</div>;
  }

  if (error || !data) {
    return <div className="p-12 text-center text-red-500">{error || 'Results not found.'}</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-4">
        <Link to="/analytics" className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{data.quiz.title} - Results</h1>
          <p className="text-slate-500 text-sm mt-1">Detailed participant performance</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50">
                <th className="py-4 px-6">Rank</th>
                <th className="py-4 px-6">Participant</th>
                <th className="py-4 px-6 text-center">Score</th>
                <th className="py-4 px-6 text-center">Accuracy</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {data.results.map((participant: any) => (
                <tr key={participant.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2 font-bold text-slate-700">
                      {participant.rank === 1 && <Trophy className="w-4 h-4 text-amber-500" />}
                      #{participant.rank}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <p className="font-semibold text-slate-900">{participant.studentEmail}</p>
                    <p className="text-xs text-slate-500">{participant.studentName || 'Student'}</p>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <span className="font-bold text-indigo-600">{participant.score} pts</span>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      participant.percentage >= 90 ? 'bg-emerald-100 text-emerald-700' :
                      participant.percentage >= 75 ? 'bg-blue-100 text-blue-700' :
                      participant.percentage >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {participant.percentage}%
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button
                      onClick={() => generatePDF(participant)}
                      disabled={downloadingId === participant.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download PDF
                    </button>
                    {participant.certificateId && (
                      <button
                        onClick={() => downloadCertificate(participant)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 text-xs font-semibold rounded-lg transition-colors ml-2"
                      >
                        <Award className="w-3.5 h-3.5" />
                        Certificate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {data.results.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    No participants have submitted this quiz yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
