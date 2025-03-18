import { useDrag } from 'react-dnd';
import { Flag, useSignal } from '../context/SignalContext';
import { useRef } from 'react';
import { isMobileDevice } from '../utils/deviceDetection';

interface InventoryFlagProps {
  flag: Flag;
}

const InventoryFlag = ({ flag }: InventoryFlagProps) => {
  const flagRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const { selectFlag, selectedFlag } = useSignal();
  
  // Check if this flag is currently selected
  const isSelected = selectedFlag?.id === flag.id;
  
  // Determine if we're on a mobile device
  const isMobile = isMobileDevice();

  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'FLAG',
    item: (monitor) => {
      // Get the image element's bounding rectangle
      const imageRect = imageRef.current?.getBoundingClientRect();
      
      // Get cursor position at the start of drag
      const initialClientOffset = monitor.getClientOffset();
      
      return { 
        type: flag.type,
        id: flag.id,
        isDragging: false,
        // Store the flag image dimensions and position info
        flagRect: imageRect,
        // Store the initial mouse position relative to the image center
        mouseOffset: imageRect && initialClientOffset ? {
          x: initialClientOffset.x - (imageRect.left + imageRect.width / 2),
          y: initialClientOffset.y - (imageRect.top + imageRect.height / 2),
        } : null,
      };
    },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }), [flag.type, flag.id]);

  // Handle click/tap on inventory flag
  const handleTap = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    
    // For mobile: select the flag for auto-placement
    if (isMobile) {
      selectFlag(flag);
    }
  };

  // Prevent default touch behavior to avoid image selection dialog
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    
    // Don't start drag operation on mobile, just select the flag
    if (isMobile) {
      e.stopPropagation();
    }
  };

  // Determine if this is a tackline flag
  const isTackline = flag.type === 'tackline';

  // Use ref callback pattern to avoid direct .current assignment
  const flagRefCallback = (node: HTMLDivElement | null) => {
    flagRef.current = node;
    
    // Only enable drag on desktop
    if (!isMobile) {
      drag(node);
    }
  };

  // Image ref callback to avoid direct .current assignment
  const imageRefCallback = (node: HTMLImageElement | null) => {
    imageRef.current = node;
  };

  return (
    <div
      ref={flagRefCallback}
      className={`flex flex-col items-center p-2 border rounded transition-all duration-200 
        ${isDragging ? 'opacity-50' : 'opacity-100'}
        ${isSelected ? 'border-blue-500 bg-blue-50 shadow-md scale-[1.05]' : 'hover:shadow-md hover:border-gray-300 hover:bg-gray-50 hover:scale-[1.02] active:scale-[0.98]'}
        ${isMobile ? 'cursor-pointer' : 'cursor-grab'} 
        no-select`}
      style={{ 
        zIndex: isDragging ? 100 : (isSelected ? 50 : 10),
        pointerEvents: isDragging ? 'none' : 'auto',
      }}
      onClick={handleTap}
      onTouchStart={handleTouchStart}
    >
      <img
        ref={imageRefCallback}
        src={flag.image}
        alt={flag.name}
        className="h-16 w-auto object-contain mb-2 no-select no-touch-action no-drag-image"
        style={isTackline ? {
          maxWidth: '64px',  // Match width in inventory
          height: '48px',    // Slightly smaller height
          objectFit: 'contain',
          objectPosition: 'center'
        } : undefined}
        draggable={false}
        onContextMenu={(e) => e.preventDefault()}
      />
      <span className="text-sm text-center">{flag.name}</span>
    </div>
  );
};

export default InventoryFlag;
