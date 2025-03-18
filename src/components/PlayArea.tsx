import { useDrop } from 'react-dnd';
import { useSignal } from '../context/SignalContext';
import DraggableFlag from './DraggableFlag';
import { useEffect, useRef, useState } from 'react';
import { Camera, Trash2 } from 'lucide-react';

const PlayArea = () => {
  const { placedFlags, addFlag, moveFlag, updatePlayAreaRef, clearBoard, copyBoardToClipboard } = useSignal();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [containerHeight, setContainerHeight] = useState<number>(0);
  const [backgroundImageLoaded, setBackgroundImageLoaded] = useState(false);
  const [naturalAspectRatio, setNaturalAspectRatio] = useState<number>(0);
  const [isHovering, setIsHovering] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [lastTouchTime, setLastTouchTime] = useState(0);
  
  // Detect if this is a touch device
  useEffect(() => {
    const detectTouch = () => {
      setIsTouchDevice(true);
      
      // On touch devices, always show controls for better discoverability
      setIsHovering(true);
      
      // Remove the listener once we've detected touch
      window.removeEventListener('touchstart', detectTouch);
    };
    
    window.addEventListener('touchstart', detectTouch, { passive: true });
    
    return () => {
      window.removeEventListener('touchstart', detectTouch);
    };
  }, []);

  // Global event listeners to detect when dragging starts/ends
  useEffect(() => {
    // DnD library doesn't expose global drag state easily, so we add our own listeners
    const handleDragStart = () => {
      setIsDragging(true);
      document.body.classList.add('drag-in-progress');
    };

    const handleDragEnd = () => {
      setIsDragging(false);
      document.body.classList.remove('drag-in-progress');
    };

    window.addEventListener('dragstart', handleDragStart);
    window.addEventListener('dragend', handleDragEnd);
    
    // Also listen for touch events that might indicate drag
    window.addEventListener('touchmove', () => {
      if (isDragging) {
        // Prevent any default touch behaviors during drag
        document.body.classList.add('drag-in-progress');
      }
    });

    // Listen for mouse events as well
    window.addEventListener('mousedown', () => {
      document.body.classList.remove('drag-in-progress');
    });

    return () => {
      window.removeEventListener('dragstart', handleDragStart);
      window.removeEventListener('dragend', handleDragEnd);
      window.removeEventListener('mousedown', () => {});
      document.body.classList.remove('drag-in-progress');
    };
  }, [isDragging]);
  
  // Load and measure the background image to set proper dimensions
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setBackgroundImageLoaded(true);
      
      // Calculate and store the natural aspect ratio of the image
      const imgAspectRatio = img.height / img.width;
      setNaturalAspectRatio(imgAspectRatio);
      
      // If container is available, set initial dimensions
      if (containerRef.current) {
        // Get available width (constrained by parent container)
        const availableWidth = containerRef.current.parentElement?.clientWidth || containerRef.current.clientWidth;
        setContainerWidth(availableWidth);
        
        // Set height based on exact aspect ratio - this will match the image height exactly
        setContainerHeight(availableWidth * imgAspectRatio);
      }
    };
    
    // Set the image source
    img.src = 'https://raw.githubusercontent.com/albertchouforces/signalcanvas/refs/heads/main/public/images/navcommmast.png';
    
    // Clean up
    return () => {
      img.onload = null;
    };
  }, []);
  
  // Set up resize observer to handle window/container size changes
  useEffect(() => {
    if (!containerRef.current || !backgroundImageLoaded || naturalAspectRatio === 0) return;
    
    // Function to calculate dimensions based on exact image aspect ratio
    const updateContainerDimensions = () => {
      if (!containerRef.current) return;
      
      // Get the parent container width
      const parentWidth = containerRef.current.parentElement?.clientWidth || window.innerWidth;
      
      // Use the width of parent container (or a reasonable default if none)
      const availableWidth = Math.min(parentWidth, 800); // Limit max width to 800px
      
      // Set container width
      setContainerWidth(availableWidth);
      
      // Calculate height based on the measured natural aspect ratio
      setContainerHeight(availableWidth * naturalAspectRatio);
    };
    
    // Calculate initial dimensions
    updateContainerDimensions();
    
    // Create resize observer
    const resizeObserver = new ResizeObserver(() => {
      updateContainerDimensions();
    });
    
    // Observe the container and parent
    resizeObserver.observe(containerRef.current);
    if (containerRef.current.parentElement) {
      resizeObserver.observe(containerRef.current.parentElement);
    }
    
    // Also listen for window resize events
    window.addEventListener('resize', updateContainerDimensions);
    
    // Clean up
    return () => {
      if (containerRef.current) {
        resizeObserver.unobserve(containerRef.current);
        if (containerRef.current.parentElement) {
          resizeObserver.unobserve(containerRef.current.parentElement);
        }
      }
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateContainerDimensions);
    };
  }, [backgroundImageLoaded, naturalAspectRatio]);

  // Update the play area dimensions on changes
  useEffect(() => {
    if (!backgroundImageLoaded || naturalAspectRatio === 0) return;
    
    // Update play area dimensions when containerWidth or containerHeight changes
    // This ensures the drop area dimensions match the visual container exactly
    const playAreaNode = document.querySelector('.play-area-content');
    if (playAreaNode && playAreaNode instanceof HTMLElement) {
      // Set exact dimensions based on container
      playAreaNode.style.width = `${containerWidth}px`;
      playAreaNode.style.height = `${containerHeight}px`;
      
      // Calculate furthest positions of placed flags to ensure content area fits all flags
      const furthestPosition = placedFlags.reduce((max, flag) => {
        const rightEdge = flag.left + 64; 
        const bottomEdge = flag.top + 64;
        
        return {
          right: Math.max(max.right, rightEdge),
          bottom: Math.max(max.bottom, bottomEdge)
        };
      }, { right: 0, bottom: 0 });
      
      // Expand content area if needed for flags, while maintaining aspect ratio
      const minContentWidth = Math.max(containerWidth, furthestPosition.right + 50);
      const minContentHeight = Math.max(containerHeight, furthestPosition.bottom + 50);
      
      if (minContentWidth > containerWidth) {
        playAreaNode.style.minWidth = `${minContentWidth}px`;
      } else {
        playAreaNode.style.minWidth = `${containerWidth}px`;
      }
      
      if (minContentHeight > containerHeight) {
        playAreaNode.style.minHeight = `${minContentHeight}px`;
      } else {
        playAreaNode.style.minHeight = `${containerHeight}px`;
        playAreaNode.style.height = `${containerHeight}px`;
      }
    }
  }, [containerWidth, containerHeight, placedFlags, backgroundImageLoaded, naturalAspectRatio]);

  const [, drop] = useDrop(() => ({
    accept: 'FLAG',
    drop: (item: { 
      type: string; 
      id?: string; 
      isDragging?: boolean;
      flagRect?: DOMRect;
      mouseOffset?: { x: number; y: number } | null;
    }, monitor) => {
      // Get the drop target node
      const dropTargetNode = document.querySelector('.play-area-content');
      if (!dropTargetNode) return;
      
      // Get the current cursor position
      const dropClientOffset = monitor.getClientOffset();
      if (!dropClientOffset) return;
      
      // Get the play area's position and scroll
      const playAreaRect = dropTargetNode.getBoundingClientRect();
      const scrollLeft = dropTargetNode instanceof HTMLElement ? dropTargetNode.scrollLeft : 0;
      const scrollTop = dropTargetNode instanceof HTMLElement ? dropTargetNode.scrollTop : 0;
      
      // Calculate drop position with proper scroll offsets
      let left = dropClientOffset.x - playAreaRect.left + scrollLeft;
      let top = dropClientOffset.y - playAreaRect.top + scrollTop;
      
      // If we have mouse offset data, adjust the position
      if (item.mouseOffset) {
        left -= item.mouseOffset.x;
        top -= item.mouseOffset.y;
      }
      
      if (item.id && item.isDragging) {
        // Moving an existing flag
        moveFlag(item.id, left, top);
      } else {
        // Adding a new flag from inventory
        addFlag(item.type, left, top);
      }
    },
    // Ensure the dropTarget receives hover properly (important for mouse interactions)
    hover: (_, monitor) => {
      // This helps ensure the drag over events are properly processed
      return monitor.isOver();
    }
  }), [addFlag, moveFlag]);

  // Handle touch events for showing controls on mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    const now = Date.now();
    setLastTouchTime(now);
    
    // Detect touch on the background vs. on a flag
    const target = e.target as HTMLElement;
    const isTouchingFlag = !!target.closest('.draggable-flag');
    
    // If touching the background (not a flag), show controls
    if (isTouchDevice && !isTouchingFlag) {
      // Don't prevent default here to allow scrolling
      setIsHovering(true);
      
      // Hide controls after a delay, unless disabled for touch devices
      if (!isTouchDevice) {
        setTimeout(() => {
          const elapsed = Date.now() - now;
          if (elapsed > 2900) { // Only hide if no new touch has happened
            setIsHovering(false);
          }
        }, 3000);
      }
    }
  };

  // For mouse interaction
  const handleMouseEvents = {
    onMouseEnter: () => setIsHovering(true),
    onMouseLeave: () => setIsHovering(false),
  };

  // Prevent touch selection behaviors on touch devices only
  const preventTouchSelection = (e: React.TouchEvent) => {
    if (isTouchDevice) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  // Enhanced button click handler for mobile
  const handleButtonClick = (callback: () => void) => (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    callback();
  };

  // Use this callback to update the context without direct .current assignments
  const playAreaRefCallback = (node: HTMLDivElement | null) => {
    if (node) {
      drop(node);
      updatePlayAreaRef(node);
      node.classList.add('play-area-content');
    }
  };

  return (
    <div 
      className="bg-white rounded-lg shadow-md overflow-hidden"
      ref={containerRef}
      {...(isTouchDevice ? { onTouchStart: handleTouchStart } : handleMouseEvents)}
    >
      {/* Canvas container with height exactly matching the background image */}
      <div 
        className="relative" 
        style={{ 
          width: `${containerWidth}px`,
          height: `${containerHeight}px`,
          overflow: 'hidden',
        }}
      >
        {/* Background image that fills the container exactly */}
        <div 
          className="absolute top-0 left-0 w-full h-full pointer-events-none no-mobile-selection"
          style={{
            backgroundImage: 'url(https://raw.githubusercontent.com/albertchouforces/signalcanvas/refs/heads/main/public/images/navcommmast.png)',
            backgroundSize: 'contain',
            backgroundPosition: 'top center',
            backgroundRepeat: 'no-repeat',
            zIndex: 1,
          }}
          onTouchStart={isTouchDevice ? preventTouchSelection : undefined}
          onTouchMove={isTouchDevice ? preventTouchSelection : undefined}
          onTouchEnd={isTouchDevice ? preventTouchSelection : undefined}
        />
        
        {/* Scrollable content area */}
        <div
          ref={playAreaRefCallback}
          className="absolute top-0 left-0 w-full h-full bg-transparent no-mobile-selection"
          style={{
            overflowX: 'auto',
            overflowY: 'auto',
            zIndex: 2,
          }}
          onTouchStart={(e) => {
            // Only prevent default if we're on a touch device and not targeting a flag
            if (isTouchDevice && !(e.target as HTMLElement).closest('.draggable-flag')) {
              e.preventDefault();
            }
          }}
        >
          {placedFlags.map((flag) => (
            <DraggableFlag
              key={flag.id}
              flag={flag}
              isDraggingOnBoard={true}
            />
          ))}
        </div>

        {/* Canvas control buttons - visible on hover on desktop and always visible on mobile */}
        <div 
          className={`canvas-control-buttons absolute bottom-4 right-4 flex space-x-2 transition-opacity duration-300 z-10 ${
            isHovering || isTouchDevice ? 'opacity-100' : 'opacity-0'
          } no-mobile-selection`}
        >
          <button
            onClick={handleButtonClick(copyBoardToClipboard)}
            className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 
                    active:bg-blue-800 transition-all duration-200 shadow-sm hover:shadow
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
                    hover:scale-[1.02] active:scale-[0.98] no-tap-highlight"
            aria-label="Copy board to clipboard"
            style={{
              // Larger touch target for mobile
              minHeight: isTouchDevice ? '44px' : 'auto',
              touchAction: 'manipulation',
            }}
          >
            <Camera className="w-4 h-4 mr-1.5 stroke-[2.5px]" />
            <span className="text-sm font-medium">Copy</span>
          </button>
          <button
            onClick={handleButtonClick(clearBoard)}
            className="flex items-center px-3 py-2 bg-white text-red-600 border border-red-200 rounded-md 
                    hover:bg-red-50 active:bg-red-100 transition-all duration-200 shadow-sm hover:shadow
                    focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50
                    hover:scale-[1.02] active:scale-[0.98] no-tap-highlight"
            aria-label="Clear all flags from board"
            style={{
              // Larger touch target for mobile
              minHeight: isTouchDevice ? '44px' : 'auto',
              touchAction: 'manipulation',
            }}
          >
            <Trash2 className="w-4 h-4 mr-1.5 stroke-[2.5px]" />
            <span className="text-sm font-medium">Clear</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlayArea;
