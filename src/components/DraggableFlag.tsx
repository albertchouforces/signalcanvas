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
    options: {
      // Enable touch events for DnD to ensure mobile drag works
      enableTouchEvents: true,
      // Prevent delay on touch devices to make dragging more responsive
      delayTouchStart: 0,
      // Specify a low distance threshold to start touch drags quickly
      touchStartThreshold: 5,
    },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }), [flag.id, flag.type, isDraggingOnBoard]);

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    removeFlag(flag.id);
  };

  // Prevent default touch behavior to avoid image selection dialog on all touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    // Don't stop propagation here - we need the event to bubble up for drag
  }; 

  // Handle touch move to ensure drag works smoothly on mobile
  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault(); // Prevent scrolling while dragging
  };

  // Handle touch end to ensure clean drag completion
  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
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
      className={`absolute cursor-grab ${isDragging ? 'opacity-50' : 'opacity-100'} no-select`}
      style={{
        left: `${flag.left}px`,
        top: `${flag.top}px`,
        zIndex: isDragging ? 100 : 10,
        transform: 'translate(-50%, -50%)', // Center the flag at the position
        pointerEvents: isDragging ? 'none' : 'auto',
        touchAction: 'none', // Critical for mobile drag & drop
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="relative group touch-none">
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
            touchAction: 'none', // Prevent default touch behaviors
            WebkitUserSelect: 'none', // Prevent text selection on iOS
          }}
          draggable={false}
          onContextMenu={(e) => e.preventDefault()}
        />
        <button
          onClick={handleRemove}
          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 
                    opacity-0 group-hover:opacity-100 transition-opacity
                    md:group-hover:opacity-100 touch-none"
          style={{ touchAction: 'none' }}
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
};

export default DraggableFlag;
