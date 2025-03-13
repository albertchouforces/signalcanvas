import { useDrag } from 'react-dnd';
import { Flag } from '../context/SignalContext';
import { useRef } from 'react';

interface InventoryFlagProps {
  flag: Flag;
}

const InventoryFlag = ({ flag }: InventoryFlagProps) => {
  const flagRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

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
  }), [flag.type, flag.id]);

  // Determine if this is a tackline flag
  const isTackline = flag.type === 'tackline';

  return (
    <div
      ref={drag}
      className={`flex flex-col items-center p-2 border rounded cursor-grab transition-all duration-200 ${
        isDragging ? 'opacity-50' : 'opacity-100'
      } hover:shadow-md hover:border-gray-300 hover:bg-gray-50 hover:scale-[1.02] active:scale-[0.98]`}
      style={{ 
        zIndex: isDragging ? 100 : 10,
        pointerEvents: isDragging ? 'none' : 'auto',
      }}
    >
      <img
        ref={imageRef}
        src={flag.image}
        alt={flag.name}
        className="h-16 w-auto object-contain mb-2"
        style={isTackline ? {
          maxWidth: '64px',  // Match width in inventory
          height: '48px',    // Slightly smaller height
          objectFit: 'contain',
          objectPosition: 'center'
        } : undefined}
        draggable={false}
      />
      <span className="text-sm text-center">{flag.name}</span>
    </div>
  );
};

export default InventoryFlag;
