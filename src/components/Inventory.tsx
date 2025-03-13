import { useState, useEffect, useRef } from 'react';
import InventoryFlag from './InventoryFlag';
import { useSignal } from '../context/SignalContext';
import Tabs from './Tabs';
import { ChevronDown, ChevronUp, Package, Search } from 'lucide-react';

const Inventory = () => {
  const { inventory } = useSignal();
  const [activeTab, setActiveTab] = useState<'flags' | 'pennants'>('flags');
  const [searchTerm, setSearchTerm] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const touchStartYRef = useRef<number | null>(null);
  const touchStartTimestampRef = useRef<number | null>(null);
  const inventoryRef = useRef<HTMLDivElement | null>(null);

  // Check if we're on mobile when component mounts and set initial collapsed state
  useEffect(() => {
    const checkMobile = () => {
      const isMobile = window.innerWidth < 768;
      setIsCollapsed(isMobile);
    };
    
    // Check on initial load
    checkMobile();
    
    // Listen for resize events to update collapse state when rotating device or resizing window
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  const tabs = [
    { id: 'flags', label: 'Signal Flags' },
    { id: 'pennants', label: 'Pennants' }
  ];

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId as 'flags' | 'pennants');
  };

  // Toggle collapsed state - only triggered by explicit button press
  const toggleCollapse = () => {
    // Only toggle if user is not actively scrolling
    if (!isUserScrolling) {
      setIsCollapsed(!isCollapsed);
    }
  };

  // Filter inventory based on active tab and search term
  const filteredInventory = inventory.filter(flag => {
    const matchesCategory = (activeTab === 'flags' && flag.category === 'flag') || 
                           (activeTab === 'pennants' && flag.category === 'pennant');
    
    // Enhanced search to include keywords (if they exist) and name
    const matchesSearch = searchTerm === '' || 
                         flag.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (flag.keywords && flag.keywords.some(keyword => 
                           keyword.toLowerCase().includes(searchTerm.toLowerCase())
                         ));
    
    return matchesCategory && matchesSearch;
  });

  // Handle scroll start
  const handleTouchStart = (e: React.TouchEvent) => {
    // Store initial touch position and timestamp
    if (e.touches.length === 1) {
      touchStartYRef.current = e.touches[0].clientY;
      touchStartTimestampRef.current = Date.now();
    }
  };

  // Handle touch move to detect scrolling
  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartYRef.current !== null && e.touches.length === 1) {
      const touchY = e.touches[0].clientY;
      const deltaY = Math.abs(touchY - touchStartYRef.current);
      
      // If user moves finger more than 10px vertically, they're probably scrolling
      if (deltaY > 10) {
        setIsUserScrolling(true);
      }
    }
  };

  // Handle touch end to reset scrolling state
  const handleTouchEnd = () => {
    // Reset touch tracking
    touchStartYRef.current = null;
    touchStartTimestampRef.current = null;
    
    // Small delay to ensure click handlers complete before resetting scroll state
    setTimeout(() => {
      setIsUserScrolling(false);
    }, 100);
  };

  return (
    <div 
      className="bg-white rounded-lg shadow-md overflow-hidden" 
      ref={inventoryRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="p-4 bg-gray-800 text-white">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-montserrat font-bold flex items-center">
            <Package className="w-5 h-5 mr-2 stroke-[2px]" />
            <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">Signal Inventory</span>
          </h2>
          {/* Mobile collapse toggle button - only visible on mobile */}
          <button 
            onClick={toggleCollapse}
            className="md:hidden flex items-center justify-center p-1.5 rounded-md bg-gray-700 
                      hover:bg-gray-600 transition-colors text-white"
            aria-label={isCollapsed ? "Expand inventory" : "Collapse inventory"}
          >
            {isCollapsed ? (
              <ChevronDown className="w-4 h-4 stroke-[2.5px]" />
            ) : (
              <ChevronUp className="w-4 h-4 stroke-[2.5px]" />
            )}
          </button>
        </div>
        
        {/* Search box - collapses with the panel */}
        <div className={`relative mt-2 transition-all duration-300 ease-in-out
                        ${isCollapsed ? 'max-h-0 opacity-0 overflow-hidden' : 'max-h-20 opacity-100'}`}>
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="w-4 h-4 text-gray-400 stroke-[2.5px]" />
          </div>
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-700 text-white placeholder-gray-400 rounded-md 
                      focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm
                      border border-gray-600 hover:border-gray-500 transition-colors duration-200"
          />
        </div>
      </div>
      
      {/* Tabs - collapses with the panel */}
      <div className={`transition-all duration-300 ease-in-out
                     ${isCollapsed ? 'max-h-0 opacity-0 overflow-hidden' : 'max-h-14 opacity-100'}`}>
        <Tabs 
          tabs={tabs} 
          activeTab={activeTab} 
          onTabChange={handleTabChange} 
        />
      </div>
      
      {/* Grid of flags - collapses with the panel */}
      <div className={`transition-all duration-300 ease-in-out 
                     ${isCollapsed 
                       ? 'max-h-0 opacity-0 overflow-hidden' 
                       : 'p-4 grid grid-cols-2 gap-4 overflow-y-auto opacity-100 ' + 
                         /* Half the height on mobile */ 
                         'max-h-[calc(100vh-280px)] md:max-h-[calc(100vh-280px)] sm:max-h-[160px]'
                     }`}>
        {filteredInventory.length > 0 ? (
          filteredInventory.map((flag) => (
            <InventoryFlag key={flag.id} flag={flag} />
          ))
        ) : (
          <div className="col-span-2 text-center py-8 text-gray-500">
            {searchTerm ? 'No matches found' : 'No items in this category'}
          </div>
        )}
      </div>
      
      {/* Collapsed state info - only visible when collapsed on mobile */}
      {isCollapsed && (
        <div className="md:hidden px-4 py-2 text-sm text-center text-gray-500 border-t border-gray-200 cursor-pointer"
             onClick={toggleCollapse}>
          Tap to view flag inventory
        </div>
      )}
    </div>
  );
};

export default Inventory;
