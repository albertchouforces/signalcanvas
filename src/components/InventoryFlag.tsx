import { useDrag } from 'react-dnd';
import { Flag, useSignal } from '../context/SignalContext';
import { useRef } from 'react';

interface InventoryFlagProps {
  flag: Flag;
}

const InventoryFlag = ({ flag }: InventoryFlagProps) => {
  const { selectedFlagId, selectFlag, isTouchDevice } = useSignal();
  const flagRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const isSelected = selectedFlagId === flag.id;

  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'FLAG',
    item: (monitor) => {
      // On touch devices, don't allow dragging from inventory unless selected
      if (isTouchDevice && !isSelected) {
        return null;
      }
      
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
    // Make sure the drag source can be dragged appropriately
    canDrag: () => {
      // On touch devices, only allow dragging if selected
      if (isTouchDevice) {
        return isSelected;
      }
      
      // On desktop, always allow dragging
      return true;
    },
    // Options to ensure drag works
    options: {
      dropEffect: 'move',
    }
  }), [flag.type, flag.id, isSelected, isTouchDevice]);

  // Handle flag selection
  const handleFlagSelect = (e: React.MouseEvent | React.TouchEvent) => {
    // Only handle selection on touch devices
    if (!isTouchDevice) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    // Toggle selection for this flag
    if (isSelected) {
      selectFlag(null);
    } else {
      selectFlag(flag.id);
    }
  };

  // Prevent default touch behavior to avoid image selection dialog
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isTouchDevice) {
      e.preventDefault();
      // Select this flag
      handleFlagSelect(e);
    }
  };

  // Handle mouse-specific events
  const handleMouseDown = (e: React.MouseEvent) => {
    // For touch devices, treat mouse events the same as touch
    if (isTouchDevice) {
      handleFlagSelect(e);
    }
    
    // Don't prevent default mouse behavior for cursor-based dragging
    e.stopPropagation();
  };

  // Determine if this is a tackline flag
  const isTackline = flag.type === 'tackline';

  // Use ref callback pattern to avoid direct .current assignment
  const flagRefCallback = (node: HTMLDivElement | null) => {
    flagRef.current = node;
    drag(node);
  };

  // Image ref callback to avoid direct .current assignment
  const imageRefCallback = (node: HTMLImageElement | null) => {
    imageRef.current = node;
  };

  return (
    <div
      ref={flagRefCallback}
      className={`flex flex-col items-center p-2 border rounded 
                 ${isTouchDevice ? '' : 'cursor-grab'} transition-all duration-200 
                 ${isDragging ? 'opacity-50' : 'opacity-100'} 
                 ${isSelected ? 'inventory-flag-selected' : 'hover:shadow-md hover:border-gray-300 hover:bg-gray-50'} 
                 hover:scale-[1.02] active:scale-[0.98] no-select`}
      style={{ 
        zIndex: isDragging ? 100 : (isSelected ? 20 : 10),
        pointerEvents: isDragging ? 'none' : 'auto',
      }}
      onTouchStart={handleTouchStart}
      onMouseDown={handleMouseDown}
    >
      <img
        ref={imageRefCallback}
        src={flag.image}
        alt={flag.name}
        className={`h-16 w-auto object-contain mb-2 ${isTouchDevice ? 'no-select no-touch-action no-drag-image' : ''}`}
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
