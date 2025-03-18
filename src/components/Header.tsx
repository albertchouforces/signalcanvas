import { useState, useRef, useEffect } from 'react';
import { Info } from 'lucide-react';

const Header = () => {
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLButtonElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Check if we're on mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    // Check initially
    checkMobile();
    
    // Listen for window resize
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close tooltip when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        tooltipRef.current && 
        !tooltipRef.current.contains(event.target as Node) &&
        iconRef.current && 
        !iconRef.current.contains(event.target as Node)
      ) {
        setShowTooltip(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleTooltip = () => {
    setShowTooltip(!showTooltip);
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-100">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center">
          <h1 className="text-2xl font-montserrat font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-blue-500 drop-shadow-sm">
            Signal Flag Canvas
          </h1>
          <div className="relative ml-2">
            <button
              ref={iconRef}
              onClick={toggleTooltip}
              className="w-6 h-6 flex items-center justify-center text-blue-500 hover:text-blue-700 
                        hover:bg-blue-50 rounded-full transition-colors duration-200"
              aria-label="Information about this application"
            >
              <Info className="w-5 h-5" />
            </button>
            
            {showTooltip && (
              <div 
                ref={tooltipRef}
                className={`absolute p-3 bg-yellow-50 border border-yellow-200 
                          rounded-md shadow-md z-50 text-sm text-gray-700 animate-fade-in
                          ${isMobile 
                            ? 'left-1/2 -translate-x-1/2 top-7 w-[250px] max-w-[90vw]' 
                            : 'left-7 top-0 w-72'}`}
                style={{
                  animationDuration: '0.2s',
                }}
              >
                <div className="font-medium mb-1">(Version 1.0)</div>
                <p>
                  This is a professional development learning project. For more information 
                  please contact the Learning Support Centre Product Development Lead (Pacific) at{' '}
                  <a 
                    href="mailto:joshua.hawthorne@ecn.forces.gc.ca"
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    joshua.hawthorne@ecn.forces.gc.ca
                  </a>
                </p>
                
                {/* Different arrow position based on device */}
                {isMobile ? (
                  <div className="absolute left-1/2 -top-2 -translate-x-1/2">
                    <div className="border-8 border-transparent border-b-yellow-50"></div>
                  </div>
                ) : (
                  <div className="absolute left-0 top-1/2 transform -translate-x-1/2 -translate-y-1/2 rotate-90">
                    <div className="border-4 border-transparent border-r-yellow-50 
                                 filter drop-shadow-sm"></div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
