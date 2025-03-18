import { useDrag } from 'react-dnd';
import { PlacedFlag, useSignal } from '../context/SignalContext';
import { X } from 'lucide-react';
import { useRef, useEffect, useState } from 'react';

interface DraggableFlagProps {
  flag: PlacedFlag;
  isDraggingOnBoard: boolean;
}

const DraggableFlag = ({ flag, isDraggingOnBoard }: DraggableFlagProps) => {
  const { removeFlag, getPlayAreaNode } = useSignal();
  const flagRef = useRef<HTMLDivElement | null>(null);
  const [shouldFlip, setShouldFlip] = useState(false);
  const [isBeingDragged, setIsBeingDragged] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  
  // Detect if this is a touch device
  useEffect(() => {
    const detectTouch = () => {
      setIsTouchDevice(true);
      // Once detected, remove the listener
      window.removeEventListener('touchstart', detectTouch);
    };
    
    window.addEventListener('touchstart', detectTouch, { passive: true });
    
    return () => {
      window.removeEventListener('touchstart', detectTouch);
    };
  }, []);
  
  // Check if the flag should be flipped based on its position
  useEffect(() => {
    const playAreaNode = getPlayAreaNode();
    if (!playAreaNode) return;
    
    // Get the canvas width to determine the midpoint
    const canvasWidth = playAreaNode.clientWidth;
    const midpoint = canvasWidth / 2;
    
    // Determine if the flag is past the midpoint
    // Don't flip the flag if it's a tackline
    const shouldFlipFlag = flag.type !== 'tackline' && flag.left > midpoint;
    setShouldFlip(shouldFlipFlag);
  }, [flag.left, flag.type, getPlayAreaNode]);

  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'FLAG',
    item: (monitor) => {
      // Get the flag element's bounding rectangle
      const flagRect = flagRef.current?.getBoundingClientRect();
      
      // Get cursor position at the start of drag
      const initialClientOffset = monitor.getClientOffset();
      
      // Set state to indicate dragging has started
      setIsBeingDragged(true);
      
      return { 
        type: flag.type, 
        id: flag.id, 
        isDragging: isDraggingOnBoard,
        // Store the flag dimensions and position info
        flagRect: flagRect,
        // Store the initial mouse position relative to the flag center
        mouseOffset: flagRect && initialClientOffset ? {
          x: initialClientOffset.x - (flagRect.left + flagRect.width / 2),
          y: initialClientOffset.y - (flagRect.top + flagRect.height / 2),
        } : null,
      };
    },
    end: () => {
      // Reset dragging state when drag ends
      setIsBeingDragged(false);
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
  }), [flag.id, flag.type, isDraggingOnBoard]);

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    removeFlag(flag.id);
  };

  // Handle touch events only on touch devices
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isTouchDevice) {
      // Only prevent default for touch devices
      e.preventDefault();
      e.stopPropagation();
      
      // Add a class to enable mobile-friendly styling during touch
      if (flagRef.current) {
        flagRef.current.classList.add('touch-active');
      }
    }
  }; 
  
  // Handle touch end to clean up any touch-specific styling
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (isTouchDevice) {
      e.preventDefault();
      e.stopPropagation();
      
      if (flagRef.current) {
        flagRef.current.classList.remove('touch-active');
      }
    }
  };
  
  // Handle touch move to prevent page scrolling while dragging
  const handleTouchMove = (e: React.TouchEvent) => {
    // Only prevent default if we're actively dragging on a touch device
    if (isTouchDevice && isBeingDragged) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  // Handle mouse-specific events
  const handleMouseDown = (e: React.MouseEvent) => {
    // Don't prevent default mouse behavior for cursor-based dragging
    // This ensures regular drag works
    e.stopPropagation();
  };

  // Determine if this is a tackline flag
  const isTackline = flag.type === 'tackline';

  // Use ref callback pattern to avoid direct .current assignment
  const flagRefCallback = (node: HTMLDivElement | null) => {
    flagRef.current = node;
    drag(node);
  };

  return (
    <div
      ref={flagRefCallback}
      className={`absolute cursor-grab draggable-flag
                 ${isDragging ? 'opacity-50' : 'opacity-100'} no-select 
                 ${isBeingDragged ? 'z-50' : ''}
                 ${isTouchDevice ? 'draggable-mobile touch-action-none' : ''}`}
      style={{
        left: `${flag.left}px`,
        top: `${flag.top}px`,
        zIndex: isDragging ? 100 : 10,
        transform: 'translate(-50%, -50%)', // Center the flag at the position
        pointerEvents: isDragging ? 'none' : 'auto',
        // Add a subtle touch feedback shadow on mobile
        boxShadow: isBeingDragged ? '0 0 0 4px rgba(59, 130, 246, 0.3)' : 'none',
        transition: isBeingDragged ? 'none' : 'box-shadow 0.2s ease',
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
      onMouseDown={handleMouseDown}
      onContextMenu={(e) => e.preventDefault()} // Prevent context menu on long press
    >
      <div className="relative group no-mobile-selection">
        <div className={`${isTouchDevice ? 'touch-target-area' : ''} no-mobile-selection`}>
          <img
            src={flag.image}
            alt={flag.name}
            className={`h-16 w-auto object-contain ${isTouchDevice ? 'no-select no-touch-action no-drag-image no-context-menu' : ''}`}
            style={{
              ...(isTackline ? {
                maxWidth: '64px',  // Match width of other flags
                height: '48px',    // Slightly smaller height
                objectFit: 'contain',
                objectPosition: 'center'
              } : {}),
              // Apply horizontal flip transform when the flag should be flipped
              transform: shouldFlip ? 'scaleX(-1)' : 'none',
              transition: 'transform 0.2s ease', // Smooth transition when flipping
              minWidth: isTackline ? '64px' : '48px', // Ensure minimum width
              minHeight: isTackline ? '48px' : '64px', // Ensure minimum height
            }}
            draggable={false}
            onDragStart={(e) => e.preventDefault()}
            onTouchStart={(e) => isTouchDevice && e.stopPropagation()}
          />
        </div>
        <button
          onClick={handleRemove}
          className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-1.5
                    opacity-0 group-hover:opacity-100 transition-opacity
                    touch-active:opacity-100 no-tap-highlight" // Show on touch devices when active
          style={{
            // Larger touch target for mobile
            minWidth: '24px',
            minHeight: '24px',
            // Ensure the button is always on top
            zIndex: 20,
          }}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};

export default DraggableFlag;
