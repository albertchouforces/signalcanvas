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
  }), [flag.id, flag.type, isDraggingOnBoard]);

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    removeFlag(flag.id);
  };

  // Prevent default touch behavior to avoid image selection dialog and other mobile behaviors
  const handleTouchStart = (e: React.TouchEvent) => {
    // This prevents the default touch behaviors like long-press context menus
    e.preventDefault();
    
    // Add a class to enable mobile-friendly styling during touch
    if (flagRef.current) {
      flagRef.current.classList.add('touch-active');
    }
  }; 
  
  // Handle touch end to clean up any touch-specific styling
  const handleTouchEnd = () => {
    if (flagRef.current) {
      flagRef.current.classList.remove('touch-active');
    }
  };
  
  // Handle touch move to prevent page scrolling while dragging
  const handleTouchMove = (e: React.TouchEvent) => {
    // Prevent scrolling while dragging
    if (isBeingDragged) {
      e.preventDefault();
    }
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
      className={`absolute cursor-grab ${isDragging ? 'opacity-50' : 'opacity-100'} no-select
                 ${isBeingDragged ? 'z-50' : ''} touch-action-none`}
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
      onContextMenu={(e) => e.preventDefault()} // Prevent context menu on long press
    >
      <div className="relative group">
        <div className="touch-target-area">
          <img
            src={flag.image}
            alt={flag.name}
            className="h-16 w-auto object-contain no-select no-touch-action no-drag-image"
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
          />
        </div>
        <button
          onClick={handleRemove}
          className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-1.5
                    opacity-0 group-hover:opacity-100 transition-opacity
                    touch-active:opacity-100" // Show on touch devices when active
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
