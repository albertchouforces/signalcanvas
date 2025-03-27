import { createContext, useState, useContext, useEffect, ReactNode, useCallback, useRef } from 'react';
import { nanoid } from 'nanoid';
import { getAllSignals } from '../data/signalFlags';
import html2canvas from 'html2canvas';
import { isMobileDevice } from '../utils/deviceDetection';

export interface Flag {
  id: string;
  type: string;
  image: string;
  name: string;
  category: 'flag' | 'pennant';
  keywords?: string[];
}

export interface PlacedFlag extends Flag {
  left: number;
  top: number;
}

// Grid configuration for auto-placement
interface GridConfig {
  startX: number;
  startY: number;
  itemWidth: number;
  itemHeight: number;
  horizontalSpacing: number;
  verticalSpacing: number;
  maxItemsPerColumn: number;
  columnWidth: number;
  canvasWidth: number;
  canvasHeight: number;
  safetyMargin: number;
  maxColumns: number;
  // Added to track actual visible height for flags
  usableCanvasHeight: number;
}

interface SignalContextType {
  inventory: Flag[];
  placedFlags: PlacedFlag[];
  addFlag: (flagType: string, left: number, top: number) => void;
  moveFlag: (id: string, left: number, top: number) => void;
  removeFlag: (id: string) => void;
  clearBoard: () => void;
  copyBoardToClipboard: () => Promise<void>;
  notification: { message: string, type: 'success' | 'error' | '' } | null;
  getPlayAreaNode: () => HTMLElement | null;
  updatePlayAreaRef: (node: HTMLElement | null) => void;
  autoPlaceFlag: (flagType: string) => void;
  selectedFlag: Flag | null;
  selectFlag: (flag: Flag | null) => void;
}

const SignalContext = createContext<SignalContextType | undefined>(undefined);

export const useSignal = () => {
  const context = useContext(SignalContext);
  if (!context) {
    throw new Error('useSignal must be used within a SignalProvider');
  }
  return context;
};

interface SignalProviderProps {
  children: ReactNode;
}

export const SignalProvider = ({ children }: SignalProviderProps) => {
  const [inventory, setInventory] = useState<Flag[]>([]);
  const [placedFlags, setPlacedFlags] = useState<PlacedFlag[]>([]);
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' | '' } | null>(null);
  const [selectedFlag, setSelectedFlag] = useState<Flag | null>(null);
  const playAreaRef = useRef<HTMLElement | null>(null);
  
  // Simplified grid position tracking - just track current column and row
  const gridPositionRef = useRef<{ col: number; row: number }>({ col: 0, row: 0 });
  
  // Store current grid config to ensure consistent placement
  const currentGridConfigRef = useRef<GridConfig | null>(null);
  
  // Flag to prevent double placement during column transitions
  const isProcessingPlacementRef = useRef<boolean>(false);

  // Initialize inventory with signal flags and pennants
  useEffect(() => {
    setInventory(getAllSignals() as Flag[]);
  }, []);

  // Load placed flags from localStorage
  useEffect(() => {
    const savedFlags = localStorage.getItem('placedFlags');
    if (savedFlags) {
      try {
        const parsedFlags = JSON.parse(savedFlags);
        setPlacedFlags(parsedFlags);
        
        // Initialize grid position for existing flags
        initializeGridPosition();
      } catch (e) {
        console.error('Error loading saved flags', e);
      }
    }
  }, []);

  // Clear notification after 3 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Save placed flags to localStorage
  useEffect(() => {
    localStorage.setItem('placedFlags', JSON.stringify(placedFlags));
  }, [placedFlags]);

  // Initialize grid position based on window size and existing flags
  const initializeGridPosition = useCallback(() => {
    // Generate a fresh grid config
    const gridConfig = getGridConfig();
    currentGridConfigRef.current = gridConfig;
    
    // Start with empty grid
    gridPositionRef.current = { col: 0, row: 0 };
    
    // If we have flags, find the suitable next position
    if (placedFlags.length > 0) {
      // Find the flag with the highest position
      let highestCol = 0;
      let highestRow = 0;
      
      placedFlags.forEach(flag => {
        // Convert position to column and row
        const col = Math.floor((flag.left - gridConfig.startX) / gridConfig.columnWidth);
        const row = Math.floor((flag.top - gridConfig.startY) / (gridConfig.itemHeight + gridConfig.verticalSpacing));
        
        // Update highest position
        if (col > highestCol || (col === highestCol && row > highestRow)) {
          highestCol = col;
          highestRow = row;
        }
      });
      
      // Set to next position
      highestRow++;
      if (highestRow >= gridConfig.maxItemsPerColumn) {
        highestRow = 0;
        highestCol++;
      }
      
      // Check if we need to reset to first column
      if (highestCol >= gridConfig.maxColumns) {
        highestCol = 0;
        highestRow = 0;
      }
      
      gridPositionRef.current = { col: highestCol, row: highestRow };
    }
  }, [placedFlags]);

  // Get grid configuration - completely revamped for mobile
  const getGridConfig = useCallback((): GridConfig => {
    const playAreaNode = playAreaRef.current;
    const isMobile = isMobileDevice();
    
    // Flag dimensions - smaller on mobile
    const itemWidth = isMobile ? 42 : 64;
    const itemHeight = isMobile ? 42 : 64;
    
    // Spacing - tighter on mobile
    const horizontalSpacing = isMobile ? 16 : 24;
    const verticalSpacing = isMobile ? 10 : 20;
    
    // Calculate actual column width including spacing
    const columnWidth = itemWidth + horizontalSpacing;
    
    // Safety margin to prevent flags from touching the edge
    const safetyMargin = isMobile ? 20 : 16;
    
    if (!playAreaNode) {
      // Default values if play area is not available
      return {
        startX: isMobile ? 40 : 80,
        startY: isMobile ? 45 : 55,
        itemWidth,
        itemHeight,
        horizontalSpacing,
        verticalSpacing,
        maxItemsPerColumn: isMobile ? 8 : 5,
        columnWidth,
        canvasWidth: 320,
        canvasHeight: 480,
        safetyMargin,
        maxColumns: 4,
        usableCanvasHeight: 400
      };
    }

    // Get accurate play area dimensions
    const areaRect = playAreaNode.getBoundingClientRect();
    const areaWidth = areaRect.width;
    const areaHeight = areaRect.height;
    
    // Calculate usable canvas height (accounting for UI elements)
    const topBuffer = isMobile ? 55 : 65;
    const bottomBuffer = isMobile ? 60 : 80;
    const usableCanvasHeight = areaHeight - topBuffer - bottomBuffer;
    
    // Calculate max items per column based on available height
    // This is the key change - we calculate exactly how many flags can fit
    const itemSpacing = itemHeight + verticalSpacing;
    const maxItemsPerColumn = Math.max(1, Math.floor(usableCanvasHeight / itemSpacing));
    
    // Calculate start position
    const startX = isMobile 
      ? Math.max(itemWidth/2 + safetyMargin, 40)
      : Math.max(80, (areaWidth - (3 * columnWidth - horizontalSpacing)) / 2);
    
    const startY = topBuffer;
    
    // Calculate maximum number of columns
    const usableWidth = areaWidth - (2 * safetyMargin);
    const maxColumns = Math.floor((usableWidth - itemWidth) / columnWidth) + 1;
    
    return {
      startX,
      startY,
      itemWidth,
      itemHeight,
      horizontalSpacing,
      verticalSpacing,
      maxItemsPerColumn,
      columnWidth,
      canvasWidth: areaWidth,
      canvasHeight: areaHeight,
      safetyMargin,
      maxColumns: Math.max(1, maxColumns),
      usableCanvasHeight
    };
  }, []);

  // Check if a position would exceed canvas boundaries
  const wouldExceedBoundary = useCallback((left: number, top: number, gridConfig: GridConfig): boolean => {
    const halfWidth = gridConfig.itemWidth / 2;
    const halfHeight = gridConfig.itemHeight / 2;
    const margin = gridConfig.safetyMargin;
    
    // Calculate flag edges
    const flagLeftEdge = left - halfWidth;
    const flagRightEdge = left + halfWidth;
    const flagTopEdge = top - halfHeight;
    const flagBottomEdge = top + halfHeight;
    
    // Check all boundaries
    return (
      flagLeftEdge < margin ||
      flagRightEdge > gridConfig.canvasWidth - margin ||
      flagTopEdge < margin ||
      flagBottomEdge > gridConfig.canvasHeight - margin
    );
  }, []);

  // Completely revised auto-placement logic for mobile
  const autoPlaceFlag = useCallback((flagType: string) => {
    // Prevent duplicate placements
    if (isProcessingPlacementRef.current) {
      return;
    }
    
    isProcessingPlacementRef.current = true;
    
    try {
      const flagToAdd = inventory.find((f) => f.type === flagType);
      if (!flagToAdd) {
        isProcessingPlacementRef.current = false;
        return;
      }
      
      // Get fresh grid config or use cached one
      const gridConfig = currentGridConfigRef.current || getGridConfig();
      currentGridConfigRef.current = gridConfig;
      
      // Get current position
      let { col, row } = gridPositionRef.current;
      
      // Ensure column is within bounds
      if (col >= gridConfig.maxColumns) {
        col = 0;
        row = 0;
      }
      
      // Calculate exact position for this flag
      const left = gridConfig.startX + (col * gridConfig.columnWidth);
      const top = gridConfig.startY + row * (gridConfig.itemHeight + gridConfig.verticalSpacing) + (gridConfig.itemHeight / 2);
      
      // Verify this position is within bounds
      if (wouldExceedBoundary(left, top, gridConfig) || 
          left > (gridConfig.canvasWidth - gridConfig.safetyMargin - gridConfig.itemWidth/2)) {
        // Reset to first column if out of bounds
        col = 0;
        row = 0;
        
        // Recalculate position
        const newLeft = gridConfig.startX + (col * gridConfig.columnWidth);
        const newTop = gridConfig.startY + row * (gridConfig.itemHeight + gridConfig.verticalSpacing) + (gridConfig.itemHeight / 2);
        
        // Create the flag with adjusted position
        const newFlag: PlacedFlag = {
          ...flagToAdd,
          id: nanoid(),
          left: newLeft,
          top: newTop,
        };
        
        // Add flag to board
        setPlacedFlags(prev => [...prev, newFlag]);
      } else {
        // Create the flag at calculated position
        const newFlag: PlacedFlag = {
          ...flagToAdd,
          id: nanoid(),
          left,
          top,
        };
        
        // Add flag to board
        setPlacedFlags(prev => [...prev, newFlag]);
      }
      
      // Update grid position for next flag
      row++;
      if (row >= gridConfig.maxItemsPerColumn) {
        // Start a new column when this one is full
        row = 0;
        col++;
        
        // Reset to first column if we're past the last column
        if (col >= gridConfig.maxColumns) {
          col = 0;
        }
      }
      
      // Store updated position
      gridPositionRef.current = { col, row };
      
      // Clear selected flag and show success notification
      setSelectedFlag(null);
      setNotification({ message: `${flagToAdd.name} placed on canvas`, type: 'success' });
    } finally {
      // Always reset processing flag
      isProcessingPlacementRef.current = false;
    }
  }, [inventory, getGridConfig, wouldExceedBoundary]);

  const addFlag = useCallback((flagType: string, left: number, top: number) => {
    const flagToAdd = inventory.find((f) => f.type === flagType);
    if (!flagToAdd) return;

    // Get grid configuration for boundary checking
    const gridConfig = getGridConfig();
    
    // Adjust position if it would exceed boundaries
    if (isMobileDevice()) {
      // Check if flag would exceed boundaries and adjust if needed
      const halfWidth = gridConfig.itemWidth / 2;
      const halfHeight = gridConfig.itemHeight / 2;
      const margin = gridConfig.safetyMargin;
      
      // Ensure flag stays within boundaries
      if (left - halfWidth < margin) {
        left = halfWidth + margin;
      } else if (left + halfWidth > gridConfig.canvasWidth - margin) {
        left = gridConfig.canvasWidth - halfWidth - margin;
      }
      
      if (top - halfHeight < margin) {
        top = halfHeight + margin;
      } else if (top + halfHeight > gridConfig.canvasHeight - margin) {
        top = gridConfig.canvasHeight - halfHeight - margin;
      }
    }
    
    const newFlag: PlacedFlag = {
      ...flagToAdd,
      id: nanoid(),
      left,
      top,
    };

    setPlacedFlags(prev => [...prev, newFlag]);
    
    // Update grid position after manual placement
    initializeGridPosition();
  }, [inventory, getGridConfig, initializeGridPosition]);

  const moveFlag = useCallback((id: string, left: number, top: number) => {
    // Get grid configuration for boundary checking
    const gridConfig = getGridConfig();
    
    // For mobile devices, perform boundary checks when moving flags
    if (isMobileDevice()) {
      // Calculate flag dimensions and boundaries
      const halfWidth = gridConfig.itemWidth / 2;
      const halfHeight = gridConfig.itemHeight / 2;
      const margin = gridConfig.safetyMargin;
      
      // Ensure flag stays within boundaries
      if (left - halfWidth < margin) {
        left = halfWidth + margin;
      } else if (left + halfWidth > gridConfig.canvasWidth - margin) {
        left = gridConfig.canvasWidth - halfWidth - margin;
      }
      
      if (top - halfHeight < margin) {
        top = halfHeight + margin;
      } else if (top + halfHeight > gridConfig.canvasHeight - margin) {
        top = gridConfig.canvasHeight - halfHeight - margin;
      }
    }
    
    setPlacedFlags(prev => {
      const updatedFlags = prev.map((flag) => (flag.id === id ? { ...flag, left, top } : flag));
      return updatedFlags;
    });
    
    // Re-initialize grid position after moving a flag
    initializeGridPosition();
  }, [getGridConfig, initializeGridPosition]);

  const removeFlag = useCallback((id: string) => {
    setPlacedFlags(prev => {
      const updatedFlags = prev.filter((flag) => flag.id !== id);
      return updatedFlags;
    });
    
    // Re-initialize grid position after removing a flag
    initializeGridPosition();
  }, [initializeGridPosition]);

  const clearBoard = useCallback(() => {
    setPlacedFlags([]);
    
    // Reset grid position and clear cached grid config
    gridPositionRef.current = { col: 0, row: 0 };
    currentGridConfigRef.current = null;
    isProcessingPlacementRef.current = false;
    
    setNotification({ message: 'Board cleared', type: 'success' });
  }, []);

  const selectFlag = useCallback((flag: Flag | null) => {
    setSelectedFlag(flag);
    
    // If on mobile and a flag is selected, automatically place it
    if (flag && isMobileDevice()) {
      autoPlaceFlag(flag.type);
    }
  }, [autoPlaceFlag]);

  // Safe way to update the play area ref
  const updatePlayAreaRef = useCallback((node: HTMLElement | null) => {
    playAreaRef.current = node;
    
    // Update grid config when play area changes
    if (node) {
      currentGridConfigRef.current = getGridConfig();
      initializeGridPosition();
    }
  }, [getGridConfig, initializeGridPosition]);

  // Safe way to get the play area node
  const getPlayAreaNode = useCallback(() => {
    return playAreaRef.current;
  }, []);

  const copyBoardToClipboard = useCallback(async () => {
    const playAreaNode = playAreaRef.current;
    if (!playAreaNode) {
      setNotification({ message: 'Could not find play area to copy', type: 'error' });
      return;
    }

    try {
      // Find the parent container that contains both the background and the flags
      const playAreaContainer = playAreaNode.parentElement;
      if (!playAreaContainer) {
        throw new Error("Could not find play area container");
      }

      // Create a clone of the play area container to capture
      const captureEl = playAreaContainer.cloneNode(true) as HTMLElement;
      
      // Remove scrollbars for clean capture
      if (captureEl instanceof HTMLElement) {
        captureEl.style.overflow = 'hidden';
        
        // Ensure the background image is visible in the clone
        const backgroundDiv = captureEl.querySelector(':first-child') as HTMLElement;
        if (backgroundDiv) {
          backgroundDiv.style.backgroundImage = 'url(https://raw.githubusercontent.com/albertchouforces/signalcanvas/refs/heads/main/public/images/navcommmast.png)';
          backgroundDiv.style.backgroundSize = 'contain';
          backgroundDiv.style.backgroundPosition = 'top center';
          backgroundDiv.style.backgroundRepeat = 'no-repeat';
          backgroundDiv.style.width = '100%';
          backgroundDiv.style.height = '100%';
          backgroundDiv.style.position = 'absolute';
          backgroundDiv.style.top = '0';
          backgroundDiv.style.left = '0';
          backgroundDiv.style.zIndex = '1';
        }
        
        // Find and remove the canvas control buttons from the clone
        const buttonContainer = captureEl.querySelector('.canvas-control-buttons');
        if (buttonContainer && buttonContainer instanceof HTMLElement) {
          buttonContainer.style.display = 'none';
        }
      }
      
      // Temporarily add to document for capture
      document.body.appendChild(captureEl);
      
      // Use html2canvas with settings to capture background images
      const canvas = await html2canvas(captureEl, {
        allowTaint: true,
        useCORS: true,
        backgroundColor: null,
        logging: false,
        scale: 2, // Higher quality
        onclone: (doc) => {
          // Further ensure background is visible in the cloned document
          const clonedEl = doc.body.lastChild as HTMLElement;
          if (clonedEl) {
            const bgDiv = clonedEl.querySelector(':first-child') as HTMLElement;
            if (bgDiv) {
              bgDiv.style.backgroundImage = 'url(https://raw.githubusercontent.com/albertchouforces/signalcanvas/refs/heads/main/public/images/navcommmast.png)';
              bgDiv.style.display = 'block';
              bgDiv.style.opacity = '1';
              bgDiv.style.visibility = 'visible';
            }
            
            // Hide canvas control buttons in the cloned document
            const buttons = clonedEl.querySelector('.canvas-control-buttons');
            if (buttons instanceof HTMLElement) {
              buttons.style.display = 'none';
            }
          }
        }
      });
      
      // Remove temporary element
      document.body.removeChild(captureEl);
      
      canvas.toBlob(async (blob) => {
        if (!blob) {
          setNotification({ message: 'Failed to generate image', type: 'error' });
          return;
        }

        try {
          // Create a ClipboardItem and write to clipboard
          const item = new ClipboardItem({ 'image/png': blob });
          await navigator.clipboard.write([item]);
          setNotification({ message: 'Board copied to clipboard!', type: 'success' });
        } catch (err) {
          console.error('Clipboard error:', err);
          
          // Fallback: create a download link if clipboard API fails
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'signal-board.png';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setNotification({ message: 'Image downloaded (clipboard access denied)', type: 'success' });
        }
      }, 'image/png');
    } catch (error) {
      console.error('Error capturing board:', error);
      setNotification({ message: 'Failed to capture board', type: 'error' });
    }
  }, []);

  const value = {
    inventory,
    placedFlags,
    addFlag,
    moveFlag,
    removeFlag,
    clearBoard,
    copyBoardToClipboard,
    notification,
    getPlayAreaNode,
    updatePlayAreaRef,
    autoPlaceFlag,
    selectedFlag,
    selectFlag,
  };

  return <SignalContext.Provider value={value}>{children}</SignalContext.Provider>;
};
