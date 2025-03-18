import { useDrag } from 'react-dnd';
import { Flag } from '../context/SignalContext';
import { useRef, useState, useEffect } from 'react';

interface InventoryFlagProps {
  flag: Flag;
}

const InventoryFlag = ({ flag }: InventoryFlagProps) => {
  const flagRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  
  // Detect if this is a touch device
  useEffect(() => {
    const detectTouch = () => {
      setIsTouchDevice(true);
      // Remove the listener once we've detected touch
      window.removeEventListener('touchstart', detectTouch);
    };
    
    window.addEventListener('touchstart', detectTouch, { passive: true });
    
    return () => {
      window.removeEventListener('touchstart', detectTouch);
    };
  }, []);

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
    // Make sure the drag source can be dragged by mouse
    canDrag: () => true,
    // Options to ensure drag works
    options: {
      dropEffect: 'move',
    }
  }), [flag.type, flag.id]);

  // Prevent default touch behavior to avoid image selection dialog
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isTouchDevice) {
      e.preventDefault();
    }
  };

  // Handle mouse-specific events
  const handleMouseDown = (e: React.MouseEvent) => {
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
      className={`flex flex-col items-center p-2 border rounded cursor-grab transition-all duration-200 ${
        isDragging ? 'opacity-50' : 'opacity-100'
      } hover:shadow-md hover:border-gray-300 hover:bg-gray-50 hover:scale-[1.02] active:scale-[0.98] no-select`}
      style={{ 
        zIndex: isDragging ? 100 : 10,
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
