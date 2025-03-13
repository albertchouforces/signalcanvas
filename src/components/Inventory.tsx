import { useState } from 'react';
import InventoryFlag from './InventoryFlag';
import { useSignal } from '../context/SignalContext';
import Tabs from './Tabs';
import { Package, Search } from 'lucide-react';

const Inventory = () => {
  const { inventory } = useSignal();
  const [activeTab, setActiveTab] = useState<'flags' | 'pennants'>('flags');
  const [searchTerm, setSearchTerm] = useState('');

  const tabs = [
    { id: 'flags', label: 'Signal Flags' },
    { id: 'pennants', label: 'Pennants' }
  ];

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId as 'flags' | 'pennants');
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

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-4 bg-gray-800 text-white">
        <h2 className="text-lg font-montserrat font-bold flex items-center">
          <Package className="w-5 h-5 mr-2 stroke-[2px]" />
          <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">Signal Inventory</span>
        </h2>
        <div className="relative mt-2">
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
      <Tabs 
        tabs={tabs} 
        activeTab={activeTab} 
        onTabChange={handleTabChange} 
      />
      <div className="p-4 grid grid-cols-2 gap-4 max-h-[calc(100vh-280px)] overflow-y-auto">
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
    </div>
  );
};

export default Inventory;
