import { useDrop } from 'react-dnd';
import { useSignal } from '../context/SignalContext';
import DraggableFlag from './DraggableFlag';
import { useEffect, useRef, useState } from 'react';

const PlayArea = () => {
  const { placedFlags, addFlag, moveFlag, playAreaRef } = useSignal();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [containerHeight, setContainerHeight] = useState<number>(0);
  const [backgroundImageLoaded, setBackgroundImageLoaded] = useState(false);
  const [naturalAspectRatio, setNaturalAspectRatio] = useState<number>(0);
  
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
      
      // Update the play area dimensions to match exactly
      if (playAreaRef.current) {
        playAreaRef.current.style.width = `${availableWidth}px`;
        playAreaRef.current.style.height = `${availableWidth * naturalAspectRatio}px`;
      }
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

  // Update content area if flags exceed canvas bounds
  useEffect(() => {
    if (!playAreaRef.current || naturalAspectRatio === 0) return;
    
    // Calculate furthest positions of placed flags
    const furthestPosition = placedFlags.reduce((max, flag) => {
      const rightEdge = flag.left + 64; 
      const bottomEdge = flag.top + 64;
      
      return {
        right: Math.max(max.right, rightEdge),
        bottom: Math.max(max.bottom, bottomEdge)
      };
    }, { right: 0, bottom: 0 });
    
    // Ensure the content area can accommodate all flags
    const minContentWidth = Math.max(containerWidth, furthestPosition.right + 50);
    
    // Only expand width if needed for flags, maintain exact height based on image
    const minContentHeight = Math.max(containerHeight, furthestPosition.bottom + 50);
    
    // Only update if flags extend beyond the container
    if (minContentWidth > containerWidth) {
      playAreaRef.current.style.minWidth = `${minContentWidth}px`;
    } else {
      playAreaRef.current.style.minWidth = `${containerWidth}px`;
    }
    
    if (minContentHeight > containerHeight) {
      playAreaRef.current.style.minHeight = `${minContentHeight}px`;
    } else {
      // This is the key fix - match exactly to the container height which is based on image dimensions
      playAreaRef.current.style.minHeight = `${containerHeight}px`;
      playAreaRef.current.style.height = `${containerHeight}px`;
    }
  }, [placedFlags, containerWidth, containerHeight, naturalAspectRatio]);

  const [, drop] = useDrop(() => ({
    accept: 'FLAG',
    drop: (item: { 
      type: string; 
      id?: string; 
      isDragging?: boolean;
      flagRect?: DOMRect;
      mouseOffset?: { x: number; y: number } | null;
    }, monitor) => {
      if (!playAreaRef.current) return;
      
      // Get the current cursor position
      const dropClientOffset = monitor.getClientOffset();
      if (!dropClientOffset) return;
      
      // Get the play area's position and scroll
      const playAreaRect = playAreaRef.current.getBoundingClientRect();
      const scrollLeft = playAreaRef.current.scrollLeft;
      const scrollTop = playAreaRef.current.scrollTop;
      
      // Calculate drop position
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
    }
  }), [addFlag, moveFlag]);

  return (
    <div 
      className="bg-white rounded-lg shadow-md overflow-hidden"
      ref={containerRef}
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
          className="absolute top-0 left-0 w-full h-full pointer-events-none"
          style={{
            backgroundImage: 'url(https://raw.githubusercontent.com/albertchouforces/signalcanvas/refs/heads/main/public/images/navcommmast.png)',
            backgroundSize: 'contain',
            backgroundPosition: 'top center',
            backgroundRepeat: 'no-repeat',
            zIndex: 1,
          }}
        />
        
        {/* Scrollable content area */}
        <div
          ref={(node) => {
            drop(node);
            if (node) {
              playAreaRef.current = node;
            }
          }}
          className="absolute top-0 left-0 w-full h-full bg-transparent"
          style={{
            overflowX: 'auto',
            overflowY: 'auto',
            zIndex: 2,
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
      </div>
    </div>
  );
};

export default PlayArea;
