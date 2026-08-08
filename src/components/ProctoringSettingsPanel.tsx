import React from 'react';
import { Shield, Camera, Users, Sliders, AlertTriangle, Monitor, Mic, Eye, Zap, RefreshCw } from 'lucide-react';

export interface ProctoringSettings {
  fullscreen?: boolean;
  tabBlur?: boolean;
  copyPaste?: boolean;
  randomizeQuestions?: boolean;
  randomizeOptions?: boolean;
  showCorrectAnswersAfterSubmit?: boolean;
  enableScreenSharing?: boolean;
  enableMicrophone?: boolean;
  enableCamera?: boolean;
  enableFaceDetection?: boolean;
  enableMultiPerson?: boolean;
  enableDeviceDetection?: boolean;
  maxViolations?: number;
  minFaceConfidence?: number;          // 0.3 to 0.95, default 0.5
  multipleFacesBufferSec?: number;     // 0 to 10s, default 3
  noFaceBufferSec?: number;            // 0 to 10s, default 4
  gazeSensitivity?: 'low' | 'medium' | 'high';
}

interface ProctoringSettingsPanelProps {
  settings: ProctoringSettings;
  onChange: (updated: Partial<ProctoringSettings>) => void;
  onSaveLive?: () => void;
  isSaving?: boolean;
  showSaveButton?: boolean;
  compact?: boolean;
}

export function ProctoringSettingsPanel({
  settings,
  onChange,
  onSaveLive,
  isSaving = false,
  showSaveButton = false,
  compact = false
}: ProctoringSettingsPanelProps) {
  const minConfidence = settings.minFaceConfidence ?? 0.5;
  const multiFacesBuffer = settings.multipleFacesBufferSec ?? 3;
  const noFaceBuffer = settings.noFaceBufferSec ?? 4;
  const gazeSensitivity = settings.gazeSensitivity ?? 'medium';
  const maxViolations = settings.maxViolations ?? 2;

  const handleResetDefaults = () => {
    onChange({
      enableCamera: true,
      enableFaceDetection: true,
      enableMultiPerson: true,
      enableDeviceDetection: true,
      enableScreenSharing: false,
      enableMicrophone: false,
      minFaceConfidence: 0.5,
      multipleFacesBufferSec: 3,
      noFaceBufferSec: 4,
      gazeSensitivity: 'medium',
      maxViolations: 2,
    });
  };

  return (
    <div className="space-y-6 bg-slate-50/60 p-5 rounded-2xl border border-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">AI Proctoring & Sensitivity Controls</h3>
            <p className="text-xs text-slate-500">Fine-tune face detection, confidence scores, and violation tolerance thresholds.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleResetDefaults}
          className="text-xs font-semibold text-slate-500 hover:text-indigo-600 flex items-center gap-1 transition-colors px-2.5 py-1 rounded-lg border border-slate-200 bg-white"
        >
          <RefreshCw className="w-3 h-3" /> Reset Defaults
        </button>
      </div>

      {/* Feature Toggles */}
      <div className="space-y-3">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Monitoring Modules</span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 cursor-pointer hover:border-indigo-200 transition-colors">
            <div className="flex items-center gap-2.5">
              <Camera className="w-4 h-4 text-indigo-600 shrink-0" />
              <div>
                <span className="text-xs font-bold text-slate-900 block">Webcam Feed</span>
                <span className="text-[11px] text-slate-500">Continuous video stream</span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.enableCamera ?? true}
              onChange={(e) => onChange({ enableCamera: e.target.checked })}
              className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
            />
          </label>

          <label className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 cursor-pointer hover:border-indigo-200 transition-colors">
            <div className="flex items-center gap-2.5">
              <Eye className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <span className="text-xs font-bold text-slate-900 block">Face Absence Detection</span>
                <span className="text-[11px] text-slate-500">Flag when student leaves frame</span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.enableFaceDetection ?? true}
              onChange={(e) => onChange({ enableFaceDetection: e.target.checked })}
              className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
            />
          </label>

          <label className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 cursor-pointer hover:border-indigo-200 transition-colors">
            <div className="flex items-center gap-2.5">
              <Users className="w-4 h-4 text-amber-600 shrink-0" />
              <div>
                <span className="text-xs font-bold text-slate-900 block">Multiple Person Detection</span>
                <span className="text-[11px] text-slate-500">Detect secondary people</span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.enableMultiPerson ?? true}
              onChange={(e) => onChange({ enableMultiPerson: e.target.checked })}
              className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
            />
          </label>

          <label className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 cursor-pointer hover:border-indigo-200 transition-colors">
            <div className="flex items-center gap-2.5">
              <Sliders className="w-4 h-4 text-red-500 shrink-0" />
              <div>
                <span className="text-xs font-bold text-slate-900 block">Device & Object Detection</span>
                <span className="text-[11px] text-slate-500">Detect phones, laptops, notes</span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.enableDeviceDetection ?? true}
              onChange={(e) => onChange({ enableDeviceDetection: e.target.checked })}
              className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
            />
          </label>

          <label className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 cursor-pointer hover:border-indigo-200 transition-colors">
            <div className="flex items-center gap-2.5">
              <Monitor className="w-4 h-4 text-blue-600 shrink-0" />
              <div>
                <span className="text-xs font-bold text-slate-900 block">Screen Sharing</span>
                <span className="text-[11px] text-slate-500">Require full display share</span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.enableScreenSharing ?? false}
              onChange={(e) => onChange({ enableScreenSharing: e.target.checked })}
              className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
            />
          </label>

          <label className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 cursor-pointer hover:border-indigo-200 transition-colors">
            <div className="flex items-center gap-2.5">
              <Mic className="w-4 h-4 text-purple-600 shrink-0" />
              <div>
                <span className="text-xs font-bold text-slate-900 block">Microphone Stream</span>
                <span className="text-[11px] text-slate-500">Audio feed monitoring</span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.enableMicrophone ?? false}
              onChange={(e) => onChange({ enableMicrophone: e.target.checked })}
              className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
            />
          </label>
        </div>
      </div>

      {/* Sensitivity Threshold Sliders */}
      <div className="space-y-4 pt-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">MediaPipe & Vision Thresholds</span>

        {/* Minimum Face Confidence */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              Minimum Face Detection Confidence
            </label>
            <span className="text-xs font-extrabold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
              {Math.round(minConfidence * 100)}%
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            Detections below this confidence score are ignored. Higher values reduce false positives in low light.
          </p>
          <input
            type="range"
            min="0.30"
            max="0.95"
            step="0.05"
            value={minConfidence}
            onChange={(e) => onChange({ minFaceConfidence: parseFloat(e.target.value) })}
            className="w-full accent-indigo-600 h-2 bg-slate-100 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-400 font-medium">
            <span>30% (Forgiving)</span>
            <span>50% (Recommended)</span>
            <span>95% (Strict)</span>
          </div>
        </div>

        {/* Multiple Faces Allowed Buffer */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-amber-600" />
              Multiple Faces Buffer (Tolerance Time)
            </label>
            <span className="text-xs font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100">
              {multiFacesBuffer} seconds
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            Time delay before raising a violation when extra faces appear in frame (prevents accidental flags from background passersby).
          </p>
          <input
            type="range"
            min="0"
            max="10"
            step="1"
            value={multiFacesBuffer}
            onChange={(e) => onChange({ multipleFacesBufferSec: parseInt(e.target.value, 10) })}
            className="w-full accent-amber-600 h-2 bg-slate-100 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-400 font-medium">
            <span>0s (Instant flag)</span>
            <span>3s (Standard)</span>
            <span>10s (High tolerance)</span>
          </div>
        </div>

        {/* No Face Grace Period */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-emerald-600" />
              Face Absence Grace Period
            </label>
            <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
              {noFaceBuffer} seconds
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            Grace period allowed when student temporarily moves out of frame or looks down before logging a violation.
          </p>
          <input
            type="range"
            min="0"
            max="10"
            step="1"
            value={noFaceBuffer}
            onChange={(e) => onChange({ noFaceBufferSec: parseInt(e.target.value, 10) })}
            className="w-full accent-emerald-600 h-2 bg-slate-100 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-400 font-medium">
            <span>0s (Strict)</span>
            <span>4s (Recommended)</span>
            <span>10s (Lenient)</span>
          </div>
        </div>

        {/* Gaze & Head Pose Sensitivity */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
          <label className="text-xs font-bold text-slate-900 block">Head Pose & Gaze Sensitivity</label>
          <p className="text-[11px] text-slate-500">Controls tolerance for head turns and looking away from screen.</p>
          <div className="grid grid-cols-3 gap-2 pt-1">
            {(['low', 'medium', 'high'] as const).map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => onChange({ gazeSensitivity: level })}
                className={`py-2 px-3 text-xs font-bold rounded-lg border capitalize transition-all ${
                  gazeSensitivity === level
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {level} Sensitivity
              </button>
            ))}
          </div>
        </div>

        {/* Max Violations Before Action */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between gap-4">
          <div>
            <label className="text-xs font-bold text-slate-900 block">Maximum Allowed Violations</label>
            <p className="text-[11px] text-slate-500">Quiz is automatically submitted or flagged after exceeding this limit.</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              max="10"
              value={maxViolations}
              onChange={(e) => onChange({ maxViolations: Math.max(1, parseInt(e.target.value, 10) || 1) })}
              className="w-16 px-2.5 py-1.5 border border-slate-300 rounded-lg text-sm font-bold text-center focus:ring-indigo-500 focus:border-indigo-500"
            />
            <span className="text-xs text-slate-500 font-semibold">warnings</span>
          </div>
        </div>
      </div>

      {showSaveButton && onSaveLive && (
        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onSaveLive}
            disabled={isSaving}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {isSaving ? 'Applying Settings...' : 'Save & Apply Settings Live'}
          </button>
        </div>
      )}
    </div>
  );
}
