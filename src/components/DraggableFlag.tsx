import { useDrag } from 'react-dnd';
import { PlacedFlag, useSignal } from '../context/SignalContext';
import { X } from 'lucide-react';
import { useRef, useEffect, useState } from 'react';

interface DraggableFlagProps {
  flag: PlacedFlag;
  isDraggingOnBoard: boolean;
}

const DraggableFlag = ({ flag, isDraggingOnBoard }: DraggableFlagProps) => {
  const { removeFlag, getPlayAreaNode, selectedFlagId, selectFlag, isTouchDevice } = useSignal();
  const flagRef = useRef<HTMLDivElement | null>(null);
  const [shouldFlip, setShouldFlip] = useState(false);
  const [isBeingDragged, setIsBeingDragged] = useState(false);
  const [isButtonPressed, setIsButtonPressed] = useState(false);
  const isSelected = selectedFlagId === flag.id;
  
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
      // Only allow dragging if not on touch device, or if selected on touch device
      if (isTouchDevice && !isSelected) {
        return null;
      }
      
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
    // Make sure the drag source can be dragged by mouse and touch
    canDrag: () => {
      // Don't drag if delete button is being pressed
      if (isButtonPressed) return false;
      
      // On touch devices, only allow dragging if the flag is selected
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
  }), [flag.id, flag.type, isDraggingOnBoard, isButtonPressed, isSelected, isTouchDevice]);

  const handleRemove = (e: React.MouseEvent | React.TouchEvent) => {
    // Ensure event doesn't propagate to parent (which would trigger drag)
    e.stopPropagation();
    e.preventDefault();
    
    // Remove the flag
    removeFlag(flag.id);
    
    // Reset button pressed state
    setIsButtonPressed(false);
  };

  // Handle touch events specifically for the delete button
  const handleButtonTouchStart = (e: React.TouchEvent) => {
    // Mark that we're interacting with the button, not dragging
    setIsButtonPressed(true);
    
    // Stop propagation to prevent dragging
    e.stopPropagation();
  };
  
  const handleButtonTouchEnd = (e: React.TouchEvent) => {
    // Handle the touch end as a click
    handleRemove(e);
    
    // Reset button state
    setIsButtonPressed(false);
  };

  // Handle flag selection on touch devices
  const handleFlagSelect = (e: React.TouchEvent | React.MouseEvent) => {
    // Only handle selection on touch devices
    if (!isTouchDevice) return;
    
    // If touching the delete button, don't handle here
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    
    e.preventDefault();
    e.stopPropagation();
    
    // Toggle selection
    if (isSelected) {
      // If already selected, keep the selection (dragging will be handled by the drag system)
      return;
    } else {
      // If not selected, select this flag
      selectFlag(flag.id);
    }
  };

  // Handle touch events for the flag
  const handleTouchStart = (e: React.TouchEvent) => {
    // If touching the delete button, don't handle here
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    
    if (isTouchDevice) {
      // Select the flag on touch
      handleFlagSelect(e);
      
      // Add a class to enable mobile-friendly styling during touch
      if (flagRef.current) {
        flagRef.current.classList.add('touch-active');
      }
    }
  }; 
  
  // Handle touch end to clean up any touch-specific styling
  const handleTouchEnd = (e: React.TouchEvent) => {
    // If touching the delete button, don't handle here
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    
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
    // If touching the delete button, don't handle here
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    
    // Only prevent default if we're actively dragging on a touch device
    if (isTouchDevice && isBeingDragged) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  // Handle mouse-specific events
  const handleMouseDown = (e: React.MouseEvent) => {
    // If clicking the delete button, don't handle here
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    
    // For mouse users, this acts as a selection too
    if (isTouchDevice) {
      handleFlagSelect(e);
    }
    
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
      className={`absolute ${isTouchDevice ? 'draggable-mobile' : 'cursor-grab'} draggable-flag
                 ${isDragging ? 'opacity-50' : 'opacity-100'} no-select 
                 ${isBeingDragged ? 'z-50' : ''}
                 ${isSelected ? 'flag-selected flag-selected-pulse' : ''}
                 ${isTouchDevice ? 'touch-action-none' : ''}`}
      style={{
        left: `${flag.left}px`,
        top: `${flag.top}px`,
        zIndex: isDragging ? 100 : (isSelected ? 30 : 10),
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
          onMouseDown={(e) => e.stopPropagation()} // Prevent drag when clicking delete button
          onClick={handleRemove}
          onTouchStart={handleButtonTouchStart}
          onTouchEnd={handleButtonTouchEnd}
          className={`absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-1.5
                     ${isTouchDevice ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} 
                     transition-opacity duration-200 no-tap-highlight`}
          style={{
            // Larger touch target for mobile
            minWidth: isTouchDevice ? '30px' : '24px',
            minHeight: isTouchDevice ? '30px' : '24px',
            // Ensure the button is always on top
            zIndex: 20,
            touchAction: 'manipulation',
          }}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};

export default DraggableFlag;
