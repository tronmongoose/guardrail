export function ContentLegalNotice() {
  return (
    <details className="group">
      <summary className="flex items-center gap-2 cursor-pointer list-none text-gray-500 hover:text-gray-400 transition">
        <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        <span className="text-xs font-medium">Your content, your rights</span>
        <svg className="w-3 h-3 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </summary>
      <div className="mt-2 pl-6 text-[11px] leading-relaxed text-gray-500 space-y-1">
        <p>By uploading, connecting, or using content within Journeyline, you agree that:</p>
        <ul className="list-disc pl-4 space-y-0.5">
          <li>You own the uploaded content or have all necessary rights and permissions to use it.</li>
          <li>You have the legal right to upload, structure, publish, distribute, and monetize the content.</li>
          <li>Your content does not infringe on any third-party rights.</li>
          <li>You retain full ownership of all uploaded or connected content.</li>
          <li>Skill Guide LLC does not own, co-own, or claim any derivative or ongoing rights to your content. Your content remains yours now and forever.</li>
        </ul>
      </div>
    </details>
  );
}
