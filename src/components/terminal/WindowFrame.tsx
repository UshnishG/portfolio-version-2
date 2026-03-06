import { useState } from "react";

interface WindowFrameProps {
  children: React.ReactNode;
}

export const WindowFrame = ({ children }: WindowFrameProps) => {
  const [isMaximized, setIsMaximized] = useState(true);

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-600 via-teal-700 to-teal-800 flex items-center justify-center p-4">
      <div
        className={`
          bg-background border-2 border-gray-400 shadow-2xl
          ${isMaximized ? 'w-full h-[calc(100vh-2rem)]' : 'w-[90%] h-[85vh]'}
          flex flex-col
          transition-all duration-300
        `}
        style={{
          boxShadow: '4px 4px 0px rgba(0,0,0,0.5), inset 1px 1px 0px rgba(255,255,255,0.1)'
        }}
      >
        {/* Title Bar */}
        <div
          className="bg-gradient-to-r from-blue-800 to-blue-600 px-2 py-1 flex items-center justify-between border-b-2 border-gray-400"
          style={{
            background: 'linear-gradient(to right, #000080, #1084d0)'
          }}
        >
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-300 border border-gray-600 flex items-center justify-center text-[10px]">
              💻
            </div>
            <span className="text-white font-bold text-sm tracking-wide">
              Ushnish's Portfolio Terminal - C:\PORTFOLIO\
            </span>
          </div>

          {/* Window Controls */}
          <div className="flex gap-1">
            {/* Minimize */}
            <button
              className="w-6 h-6 bg-gray-300 border-2 border-t-white border-l-white border-r-gray-600 border-b-gray-600 hover:bg-gray-200 active:border-t-gray-600 active:border-l-gray-600 active:border-r-white active:border-b-white flex items-center justify-center"
              aria-label="Minimize"
            >
              <span className="text-black font-bold text-xs mb-2">_</span>
            </button>

            {/* Maximize/Restore */}
            <button
              onClick={() => setIsMaximized(!isMaximized)}
              className="w-6 h-6 bg-gray-300 border-2 border-t-white border-l-white border-r-gray-600 border-b-gray-600 hover:bg-gray-200 active:border-t-gray-600 active:border-l-gray-600 active:border-r-white active:border-b-white flex items-center justify-center"
              aria-label={isMaximized ? "Restore" : "Maximize"}
            >
              <span className="text-black font-bold text-xs">□</span>
            </button>

            {/* Close */}
            <button
              className="w-6 h-6 bg-gray-300 border-2 border-t-white border-l-white border-r-gray-600 border-b-gray-600 hover:bg-gray-200 active:border-t-gray-600 active:border-l-gray-600 active:border-r-white active:border-b-white flex items-center justify-center"
              aria-label="Close"
            >
              <span className="text-black font-bold text-xs">×</span>
            </button>
          </div>
        </div>

        {/* Menu Bar */}
        <div className="bg-gray-200 border-b border-gray-400 px-2 py-0.5 flex gap-4 text-xs">
          <span className="text-black hover:bg-blue-600 hover:text-white px-2 py-0.5 cursor-pointer">File</span>
          <span className="text-black hover:bg-blue-600 hover:text-white px-2 py-0.5 cursor-pointer">Edit</span>
          <span className="text-black hover:bg-blue-600 hover:text-white px-2 py-0.5 cursor-pointer">View</span>
          <span className="text-black hover:bg-blue-600 hover:text-white px-2 py-0.5 cursor-pointer">Help</span>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden bg-background">
          {children}
        </div>

        {/* Status Bar */}
        <div className="bg-gray-200 border-t-2 border-gray-400 px-2 py-1 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <div className="border-2 border-t-gray-600 border-l-gray-600 border-r-white border-b-white px-2 py-0.5 bg-gray-100">
              <span className="text-black">Ready</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="border-2 border-t-gray-600 border-l-gray-600 border-r-white border-b-white px-2 py-0.5 bg-gray-100">
              <span className="text-black">{new Date().toLocaleTimeString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
