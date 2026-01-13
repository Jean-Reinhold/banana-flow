'use client';

import React from 'react';
import type { HistoryItem, Theme } from '../types';
import { DownloadIcon, UploadIcon, ChevronLeftIcon, ChevronRightIcon } from './icons';

interface HistorySidebarProps {
  history: HistoryItem[];
  onUseAsInput: (dataUrl: string) => void;
  onClearHistory: () => void;
  onDeleteItem: (id: string) => void;
  isCollapsed: boolean;
  onToggle: () => void;
  theme: Theme;
}

const HistorySidebar: React.FC<HistorySidebarProps> = ({
  history,
  onUseAsInput,
  onClearHistory,
  onDeleteItem,
  isCollapsed,
  onToggle,
  theme,
}) => {
  const handleDownload = (dataUrl: string) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `history-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      className={`relative z-10 flex flex-col flex-shrink-0 h-full bg-black/30 backdrop-blur-2xl border-l border-white/10 transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-0' : 'w-80 p-4'
      }`}
    >
      <button
        onClick={onToggle}
        className="absolute top-1/2 -left-[1px] transform -translate-y-1/2 -translate-x-full w-5 h-20 bg-neutral-800/90 hover:bg-indigo-600 border border-white/10 rounded-l-lg flex items-center justify-center text-white/70 hover:text-white transition-colors"
        aria-label={isCollapsed ? 'Expand History sidebar' : 'Collapse History sidebar'}
      >
        {isCollapsed ? (
          <ChevronLeftIcon className="w-4 h-4" />
        ) : (
          <ChevronRightIcon className="w-4 h-4" />
        )}
      </button>

      <div
        className={`flex flex-col h-full overflow-hidden transition-opacity duration-200 ${
          isCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        style={{ transitionDelay: isCollapsed ? '0ms' : '150ms' }}
      >
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <h2 className="text-xl font-bold text-white">Generation History</h2>
          {history.length > 0 && (
            <button
              onClick={onClearHistory}
              className="text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              Clear All
            </button>
          )}
        </div>
        {history.length === 0 ? (
          <div className="flex-grow flex items-center justify-center text-center">
            <p className="text-gray-500">Generated images will appear here.</p>
          </div>
        ) : (
          <div className="flex-grow overflow-y-auto pr-2 space-y-4">
            {history.map((item) => (
              <div key={item.id} className="bg-white/5 p-3 rounded-lg relative group/item">
                <button
                  onClick={() => onDeleteItem(item.id)}
                  className="absolute top-4 right-4 p-1 bg-black/50 backdrop-blur-md rounded-full text-white opacity-0 group-hover/item:opacity-100 transition-opacity z-10 hover:bg-red-500/50"
                  aria-label="Delete history item"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-3 h-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.dataUrl} alt="Generated asset" className="w-full rounded-md mb-3" />
                <p className="text-xs text-gray-400 mb-3 line-clamp-3" title={item.prompt}>
                  {item.prompt}
                </p>
                <div className="flex items-center justify-end space-x-2">
                  <button
                    onClick={() => onUseAsInput(item.dataUrl)}
                    className="flex items-center px-3 py-1 text-xs text-white rounded-md"
                    style={{ backgroundColor: theme.buttonColor }}
                    title="Use as Input Node"
                  >
                    <UploadIcon className="w-4 h-4 mr-1.5" />
                    Use
                  </button>
                  <button
                    onClick={() => handleDownload(item.dataUrl)}
                    className="flex items-center p-2 text-xs text-gray-300 bg-gray-700/50 rounded-md hover:bg-gray-600"
                    title="Download Image"
                  >
                    <DownloadIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HistorySidebar;
