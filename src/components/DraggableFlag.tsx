import { useDrag } from 'react-dnd';
import { PlacedFlag, useSignal } from '../context/SignalContext';
import { X } from 'lucide-react';
import { useRef, useEffect, useState } from 'react';

interface DraggableFlagProps {
  flag: PlacedFlag;
  isDraggingOnBoard: boolean;
}

const DraggableFlag = ({ flag, isDraggingOnBoard }: DraggableFlagProps) => {
  const { removeFlag, playAreaRef } = useSignal();
  const flagRef = useRef<HTMLDivElement>(null);
  const [shouldFlip, setShouldFlip] = useState(false);
  
  // Check if the flag should be flipped based on its position
  useEffect(() => {
    if (!playAreaRef.current) return;
    
    // Get the canvas width to determine the midpoint
    const canvasWidth = playAreaRef.current.clientWidth;
    const midpoint = canvasWidth / 2;
    
    // Determine if the flag is past the midpoint
    // Don't flip the flag if it's a tackline
    const shouldFlipFlag = flag.type !== 'tackline' && flag.left > midpoint;
    setShouldFlip(shouldFlipFlag);
  }, [flag.left, flag.type, playAreaRef]);

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

  // Determine if this is a tackline flag
  const isTackline = flag.type === 'tackline';

  return (
    <div
      ref={(node) => {
        // This ensures we get both the drag behavior and keep our measurement ref
        drag(node);
        // We don't manually assign flagRef.current as that's read-only
        // Instead we use the ref callback pattern properly
        if (node) {
          // The ref callback gives us the node directly
          // We don't need to assign to .current
          flagRef.current = node;
        }
      }}
      className={`absolute cursor-grab ${isDragging ? 'opacity-50' : 'opacity-100'}`}
      style={{
        left: `${flag.left}px`,
        top: `${flag.top}px`,
        zIndex: isDragging ? 100 : 10,
        transform: 'translate(-50%, -50%)', // Center the flag at the position
        pointerEvents: isDragging ? 'none' : 'auto',
      }}
    >
      <div className="relative group">
        <img
          src={flag.image}
          alt={flag.name}
          className="h-16 w-auto object-contain"
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
        <button
          onClick={handleRemove}
          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 
                    opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
};

export default DraggableFlag;
