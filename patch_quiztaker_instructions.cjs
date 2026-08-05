const fs = require('fs');
let code = fs.readFileSync('src/pages/QuizTaker.tsx', 'utf8');

const search = `        <div className="mb-8 text-left bg-indigo-50/60 p-5 rounded-xl border border-indigo-100 max-w-md mx-auto">
          <label className="block text-sm font-bold text-slate-900 mb-1">
            Participant Full Name <span className="text-red-500">*</span>
          </label>
          <p className="text-xs text-slate-500 mb-3">
            This name will be printed on your earned certificate of completion.
          </p>
          <input
            type="text"
            required
            value={participantName}
            onChange={(e) => setParticipantName(e.target.value)}
            disabled={!!hasNotStarted || !!hasEnded}
            placeholder="e.g. John Doe"
            className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm shadow-sm disabled:opacity-50"
          />
        </div>
        
        {/* Hidden screen sharing video */}
        <video ref={screenRef} autoPlay playsInline muted className="hidden" />
        
        <button
          onClick={startQuiz}
          disabled={loading || aiLoading || !!hasNotStarted || !!hasEnded}
          className="px-8 py-3.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 mx-auto disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Start Quiz Now'}
        </button>`;

const replacement = `        <div className="mb-8 text-left bg-indigo-50/60 p-5 rounded-xl border border-indigo-100 max-w-md mx-auto">
          <label className="block text-sm font-bold text-slate-900 mb-1">
            Participant Full Name <span className="text-red-500">*</span>
          </label>
          <p className="text-xs text-slate-500 mb-3">
            This name will be printed on your earned certificate of completion.
          </p>
          <input
            type="text"
            required
            value={participantName}
            onChange={(e) => setParticipantName(e.target.value)}
            disabled={!!hasNotStarted || !!hasEnded}
            placeholder="e.g. John Doe"
            className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm shadow-sm disabled:opacity-50"
          />
        </div>

        <div className="mb-8 text-left bg-slate-50 p-6 rounded-xl border border-slate-200">
          <h3 className="font-bold text-slate-900 mb-4 text-lg">Important Instructions</h3>
          <ul className="space-y-3 mb-6">
            {quiz.securitySettings?.enableCamera && (
              <li className="flex gap-2 text-sm text-slate-700">
                <CheckCircle2 className="w-5 h-5 text-indigo-500 shrink-0" />
                <span>Camera access is required.</span>
              </li>
            )}
            {quiz.securitySettings?.enableScreenSharing && (
              <li className="flex gap-2 text-sm text-slate-700">
                <CheckCircle2 className="w-5 h-5 text-indigo-500 shrink-0" />
                <span>Share your entire screen before starting.</span>
              </li>
            )}
            {quiz.securitySettings?.enableMicrophone && (
              <li className="flex gap-2 text-sm text-slate-700">
                <CheckCircle2 className="w-5 h-5 text-indigo-500 shrink-0" />
                <span>Microphone access is required.</span>
              </li>
            )}
            {quiz.securitySettings?.fullscreen && (
              <li className="flex gap-2 text-sm text-slate-700">
                <CheckCircle2 className="w-5 h-5 text-indigo-500 shrink-0" />
                <span>You must remain in fullscreen throughout the quiz.</span>
              </li>
            )}
            {quiz.securitySettings?.tabSwitching && (
              <li className="flex gap-2 text-sm text-slate-700">
                <CheckCircle2 className="w-5 h-5 text-indigo-500 shrink-0" />
                <span>Leaving the quiz tab may result in automatic submission.</span>
              </li>
            )}
            {(quiz.securitySettings?.enableDeviceDetection || quiz.securitySettings?.enableMultiPerson || quiz.securitySettings?.enableFaceDetection) && (
              <li className="flex gap-2 text-sm text-slate-700">
                <CheckCircle2 className="w-5 h-5 text-indigo-500 shrink-0" />
                <span>The system will monitor for mobile phones, tablets, multiple people, and other unauthorized devices.</span>
              </li>
            )}
            {quiz.securitySettings?.copyPaste && (
              <li className="flex gap-2 text-sm text-slate-700">
                <CheckCircle2 className="w-5 h-5 text-indigo-500 shrink-0" />
                <span>Copy, paste, right-click, and keyboard shortcuts are disabled during the quiz.</span>
              </li>
            )}
          </ul>
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="flex-shrink-0 mt-0.5">
              <input 
                type="checkbox" 
                className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                checked={instructionsAcknowledged}
                onChange={(e) => setInstructionsAcknowledged(e.target.checked)}
              />
            </div>
            <span className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
              I have read and understood the instructions.
            </span>
          </label>
        </div>
        
        {/* Hidden screen sharing video */}
        <video ref={screenRef} autoPlay playsInline muted className="hidden" />
        
        <button
          onClick={startQuiz}
          disabled={loading || aiLoading || !!hasNotStarted || !!hasEnded || !instructionsAcknowledged}
          className="px-8 py-3.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 mx-auto disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Start Quiz Now'}
        </button>`;

code = code.replace(search, replacement);
fs.writeFileSync('src/pages/QuizTaker.tsx', code);
