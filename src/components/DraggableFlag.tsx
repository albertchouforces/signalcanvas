import { useDrag } from 'react-dnd';
import { PlacedFlag, useSignal } from '../context/SignalContext';
import { X } from 'lucide-react';
import { useRef, useEffect, useState } from 'react';
import { isMobileDevice } from '../utils/deviceDetection';

interface DraggableFlagProps {
  flag: PlacedFlag;
  isDraggingOnBoard: boolean;
}

const DraggableFlag = ({ flag, isDraggingOnBoard }: DraggableFlagProps) => {
  const { removeFlag, getPlayAreaNode } = useSignal();
  const flagRef = useRef<HTMLDivElement | null>(null);
  const [shouldFlip, setShouldFlip] = useState(false);
  const isMobile = isMobileDevice();
  
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
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }), [flag.id, flag.type, isDraggingOnBoard]);

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    removeFlag(flag.id);
  };

  // Prevent default touch behavior to avoid image selection dialog
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
  }; 

  // Determine if this is a tackline flag
  const isTackline = flag.type === 'tackline';

  // Determine flag size based on device type
  const flagHeight = isMobile ? 
    (isTackline ? '38px' : '48px') : // Smaller on mobile
    (isTackline ? '48px' : '64px');  // Regular size on desktop
  
  const flagWidth = isMobile ?
    (isTackline ? '48px' : '36px') : // Smaller on mobile
    (isTackline ? '64px' : '48px');  // Regular size on desktop
  
  const flagMinWidth = isMobile ? 
    (isTackline ? '48px' : '36px') : // Smaller on mobile
    (isTackline ? '64px' : '48px');  // Regular size on desktop
  
  const flagMinHeight = isMobile ? 
    (isTackline ? '38px' : '48px') : // Smaller on mobile
    (isTackline ? '48px' : '64px');  // Regular size on desktop

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
      }}
      onTouchStart={handleTouchStart}
    >
      <div className="relative group">
        <img
          src={flag.image}
          alt={flag.name}
          className="object-contain no-select no-touch-action no-drag-image"
          style={{
            height: flagHeight,
            width: 'auto',
            maxWidth: isTackline ? (isMobile ? '48px' : '64px') : 'none',
            // Apply horizontal flip transform when the flag should be flipped
            transform: shouldFlip ? 'scaleX(-1)' : 'none',
            transition: 'transform 0.2s ease', // Smooth transition when flipping
            minWidth: flagMinWidth,
            minHeight: flagMinHeight,
          }}
          draggable={false}
          onContextMenu={(e) => e.preventDefault()}
        />
        <button
          onClick={handleRemove}
          className={`absolute -top-2 ${isMobile ? '-right-1' : '-right-2'} bg-red-500 text-white rounded-full 
                    ${isMobile ? 'p-0.5' : 'p-1'} opacity-0 group-hover:opacity-100 transition-opacity`}
        >
          <X className={`${isMobile ? 'h-2.5 w-2.5' : 'h-3 w-3'}`} />
        </button>
      </div>
    </div>
  );
};

export default DraggableFlag;
