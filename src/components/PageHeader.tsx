interface Props {
  title: string;
  onBack: () => void;
  right?: React.ReactNode;
}

export default function PageHeader({ title, onBack, right }: Props) {
  return (
    <header className="bg-white border-b border-gray-100 px-3 py-3 flex items-center justify-between shrink-0">
      <button
        onClick={onBack}
        className="w-9 h-9 flex items-center justify-center text-gray-600 hover:text-gray-800 active:scale-95"
        aria-label="返回"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
      <h1 className="text-base font-semibold text-gray-800">{title}</h1>
      <div className="w-9 flex items-center justify-end">{right}</div>
    </header>
  );
}
