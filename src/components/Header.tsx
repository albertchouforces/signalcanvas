import { Camera, Trash2 } from 'lucide-react';
import { useSignal } from '../context/SignalContext';

const Header = () => {
  const { clearBoard, copyBoardToClipboard } = useSignal();

  return (
    <header className="bg-white shadow-sm border-b border-gray-100">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-montserrat font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-blue-500 drop-shadow-sm">
          Signal Flag Canvas
        </h1>
        <div className="flex space-x-3">
          <button
            onClick={copyBoardToClipboard}
            className="flex items-center px-4 py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 
                      active:bg-blue-800 transition-all duration-200 shadow-sm hover:shadow
                      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
                      hover:scale-[1.02] active:scale-[0.98]"
            aria-label="Copy board to clipboard"
          >
            <Camera className="w-4 h-4 mr-2 stroke-[2.5px]" />
            <span className="font-medium">Copy Board</span>
          </button>
          <button
            onClick={clearBoard}
            className="flex items-center px-4 py-2.5 bg-white text-red-600 border border-red-200 rounded-md 
                      hover:bg-red-50 active:bg-red-100 transition-all duration-200 shadow-sm hover:shadow
                      focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50
                      hover:scale-[1.02] active:scale-[0.98]"
            aria-label="Clear all flags from board"
          >
            <Trash2 className="w-4 h-4 mr-2 stroke-[2.5px]" />
            <span className="font-medium">Clear Board</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
