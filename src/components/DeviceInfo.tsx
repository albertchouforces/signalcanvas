import { useState, useEffect } from 'react';
import { isMobileDevice } from '../utils/deviceDetection';
import { Info } from 'lucide-react';

// This component displays device mode information and usage hints
const DeviceInfo = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [showInfo, setShowInfo] = useState(true);
  
  // Check if this is a mobile device on mount and window resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(isMobileDevice());
    };
    
    // Initial check
    checkMobile();
    
    // Re-check on window resize
    window.addEventListener('resize', checkMobile);
    
    // Auto-hide info after 10 seconds
    const timer = setTimeout(() => {
      setShowInfo(false);
    }, 10000);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
      clearTimeout(timer);
    };
  }, []);
  
  // Only show on mobile devices and when showInfo is true
  if (!isMobile || !showInfo) {
    return null;
  }
  
  return (
    <div className="fixed bottom-16 left-0 right-0 mx-auto w-5/6 max-w-sm bg-blue-50 rounded-lg border border-blue-200 shadow-lg p-3 z-50">
      <div className="flex items-start">
        <div className="bg-blue-100 rounded-full p-1.5 mr-3">
          <Info className="h-5 w-5 text-blue-700" />
        </div>
        <div className="flex-1">
          <h3 className="font-medium text-blue-800 mb-1 font-montserrat">Mobile Mode Detected</h3>
          <p className="text-sm text-blue-700 mb-2">
            Tap on any flag in the inventory to automatically place it on the canvas in an organized pattern.
          </p>
          <button 
            onClick={() => setShowInfo(false)}
            className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeviceInfo;
