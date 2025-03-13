import React from 'react';

interface Tab {
  id: string;
  label: string;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onTabChange }) => {
  return (
    <div className="border-b border-gray-200">
      <nav className="flex -mb-px">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`px-4 py-3 text-sm font-medium transition-all duration-200 
                      ${
                        activeTab === tab.id
                          ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50/50'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50/80 hover:border-gray-300 hover:border-b'
                      } 
                      flex-1 text-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 
                      hover:scale-[1.01] active:scale-[0.99]`}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
};

export default Tabs;
