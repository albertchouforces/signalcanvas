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
  maxItemsPerColumn: number; // Changed from maxItemsPerRow to maxItemsPerColumn
  columnWidth: number; // Added to track actual column width for better overflow handling
  canvasWidth: number; // Added to track the canvas width for boundary checking
  canvasHeight: number; // Added to track the canvas height for boundary checking
  safetyMargin: number; // Added to provide a safety margin at canvas edges
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
  
  // Keep track of the current grid position for auto-placement
  // Changed to track column and row positions for vertical filling
  const gridPositionRef = useRef<{ col: number; row: number }>({ col: 0, row: 0 });
  
  // Keep track of column heights to ensure proper column transitions
  const columnHeightsRef = useRef<Record<number, number>>({});

  // Initialize inventory with signal flags and pennants
  useEffect(() => {
    // Type assertion to ensure getAllSignals() matches the Flag[] type
    setInventory(getAllSignals() as Flag[]);
  }, []);

  // Load placed flags from localStorage
  useEffect(() => {
    const savedFlags = localStorage.getItem('placedFlags');
    if (savedFlags) {
      try {
        const parsedFlags = JSON.parse(savedFlags);
        setPlacedFlags(parsedFlags);
        // Update grid position based on existing flags when loading from storage
        updateGridPositionFromExistingFlags(parsedFlags);
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

  // Update grid position based on existing flags to avoid overlaps
  // Modified to track columns and rows for vertical filling and calculate column heights
  const updateGridPositionFromExistingFlags = (flags: PlacedFlag[]) => {
    if (!flags.length) {
      gridPositionRef.current = { col: 0, row: 0 };
      columnHeightsRef.current = {};
      return;
    }

    // Get grid configuration
    const gridConfig = getGridConfig();
    
    // Reset column heights
    columnHeightsRef.current = {};
    
    // Calculate column heights based on flag positions
    flags.forEach(flag => {
      const col = Math.floor((flag.left - gridConfig.startX) / gridConfig.columnWidth);
      const rowBottom = flag.top + (gridConfig.itemHeight / 2);
      
      if (col >= 0) {
        // Update the height of this column
        columnHeightsRef.current[col] = Math.max(columnHeightsRef.current[col] || 0, rowBottom);
      }
    });
    
    // Find the column with the smallest height
    let minHeightCol = 0;
    let minHeight = Infinity;
    
    Object.entries(columnHeightsRef.current).forEach(([colStr, height]) => {
      const col = parseInt(colStr, 10);
      if (height < minHeight) {
        minHeight = height;
        minHeightCol = col;
      }
    });
    
    // Calculate row based on column height
    const minHeightRow = columnHeightsRef.current[minHeightCol] ? 
      Math.ceil((columnHeightsRef.current[minHeightCol] - gridConfig.startY) / (gridConfig.itemHeight + gridConfig.verticalSpacing)) : 0;
    
    // Set the next position
    if (minHeightRow >= gridConfig.maxItemsPerColumn) {
      // Find the next available column
      let nextCol = 0;
      while (columnHeightsRef.current[nextCol] && 
             columnHeightsRef.current[nextCol] > gridConfig.startY + gridConfig.itemHeight) {
        nextCol++;
      }
      gridPositionRef.current = { col: nextCol, row: 0 };
    } else {
      gridPositionRef.current = { col: minHeightCol, row: minHeightRow };
    }
  };

  // Get grid configuration based on current play area size
  // Modified to include columnWidth for better overflow handling and canvas boundaries
  const getGridConfig = useCallback((): GridConfig => {
    const playAreaNode = playAreaRef.current;
    const isMobile = isMobileDevice();
    
    // Flag dimensions - smaller on mobile
    const itemWidth = isMobile ? 42 : 64;
    const itemHeight = isMobile ? 42 : 64;
    
    // Spacing - use reduced spacing on mobile to maximize flag count
    const horizontalSpacing = isMobile ? 20 : 24; // Increased horizontal spacing on mobile for better column separation
    const verticalSpacing = isMobile ? 10 : 20;   // Reduced vertical spacing on mobile to fit more flags
    
    // Calculate column width including spacing to prevent overflow
    const columnWidth = itemWidth + horizontalSpacing;
    
    // Safety margin to ensure flags aren't placed too close to the edge
    // Increased margin on mobile to prevent any chance of flags being cut off
    const safetyMargin = isMobile ? 16 : 16;
    
    if (!playAreaNode) {
      // Default values if play area is not available
      return {
        startX: isMobile ? 40 : 80,
        startY: isMobile ? 45 : 55,
        itemWidth,
        itemHeight,
        horizontalSpacing,
        verticalSpacing,
        maxItemsPerColumn: isMobile ? 8 : 5, // Increased max items per column on mobile
        columnWidth,
        canvasWidth: 320, // Fallback canvas width
        canvasHeight: 480, // Fallback canvas height
        safetyMargin
      };
    }

    // Get play area dimensions
    const areaRect = playAreaNode.getBoundingClientRect();
    const areaWidth = areaRect.width;
    const areaHeight = areaRect.height;
    
    // Calculate how many flags can fit in a column with proper spacing
    // Use a higher safety buffer for the bottom edge
    const bottomSafetyBuffer = isMobile ? 60 : 100; // Increased buffer on mobile to prevent bottom overflow
    const heightBuffer = isMobile ? 40 : 100; // Reduced buffer on mobile to allow for more flags
    
    // Calculate maximum items per column ensuring flags don't exceed the bottom boundary
    const maxItemsPerColumn = Math.max(1, Math.floor(
      (areaHeight - heightBuffer - bottomSafetyBuffer) / (itemHeight + verticalSpacing)
    ));
    
    // Calculate start position
    let startX;
    if (isMobile) {
      // For mobile, use a fixed smaller indentation from the left
      // Ensure there's enough space from the left edge with the safety margin
      startX = Math.max(itemWidth/2 + safetyMargin, Math.min(36, areaWidth * 0.1));
    } else {
      // For desktop, center the grid as before
      startX = (areaWidth - (3 * columnWidth - horizontalSpacing)) / 2;
    }
    
    // Ensure startY leaves enough vertical space
    const startY = isMobile ? Math.max(itemHeight/2 + safetyMargin, 45) : 55;
    
    return {
      startX,
      startY,
      itemWidth,
      itemHeight,
      horizontalSpacing,
      verticalSpacing,
      maxItemsPerColumn: isMobile ? Math.max(maxItemsPerColumn, 8) : maxItemsPerColumn,
      columnWidth,
      canvasWidth: areaWidth, // Store the canvas width for boundary checks
      canvasHeight: areaHeight, // Store the canvas height for boundary checks
      safetyMargin
    };
  }, []);

  // Enhanced boundary check - now checks all edges of the canvas
  const wouldExceedCanvasBoundary = useCallback((left: number, top: number, gridConfig: GridConfig): boolean => {
    const halfWidth = gridConfig.itemWidth / 2;
    const halfHeight = gridConfig.itemHeight / 2;
    const margin = gridConfig.safetyMargin;
    
    // Calculate all edges of the flag
    const flagLeftEdge = left - halfWidth;
    const flagRightEdge = left + halfWidth;
    const flagTopEdge = top - halfHeight;
    const flagBottomEdge = top + halfHeight;
    
    // Check if any edge would exceed canvas boundaries with safety margin
    const exceedsLeft = flagLeftEdge < margin;
    const exceedsRight = flagRightEdge > gridConfig.canvasWidth - margin;
    const exceedsTop = flagTopEdge < margin;
    const exceedsBottom = flagBottomEdge > gridConfig.canvasHeight - margin;
    
    // Return true if any boundary would be exceeded
    return exceedsLeft || exceedsRight || exceedsTop || exceedsBottom;
  }, []);

  // Automatically place a flag on the canvas based on grid position
  // Updated to properly handle columns and prevent overflow beyond canvas boundaries
  const autoPlaceFlag = useCallback((flagType: string) => {
    const flagToAdd = inventory.find((f) => f.type === flagType);
    if (!flagToAdd) return;

    // Get current grid configuration
    const gridConfig = getGridConfig();
    
    // Get current column and row position
    let { col, row } = gridPositionRef.current;
    
    // Calculate initial position for the flag
    let left = gridConfig.startX + col * gridConfig.columnWidth + gridConfig.itemWidth / 2;
    let top = gridConfig.startY + row * (gridConfig.itemHeight + gridConfig.verticalSpacing) + gridConfig.itemHeight / 2;
    
    // Strict check for right boundary using flag width and safety margin
    const maxRightPosition = gridConfig.canvasWidth - gridConfig.itemWidth/2 - gridConfig.safetyMargin;
    
    // Check if this position would cause flag to exceed any canvas boundary
    let boundaryExceeded = wouldExceedCanvasBoundary(left, top, gridConfig);
    
    // Additional explicit check for right boundary
    if (left > maxRightPosition) {
      boundaryExceeded = true;
    }
    
    // Try to find a valid position that doesn't exceed boundaries
    let attempts = 0;
    const maxAttempts = 20; // Prevent infinite loops
    
    while (boundaryExceeded && attempts < maxAttempts) {
      attempts++;
      
      // If right boundary is exceeded, move to first column of next row
      if (left + (gridConfig.itemWidth / 2) + gridConfig.safetyMargin > gridConfig.canvasWidth) {
        col = 0;
        row++;
      } 
      // If bottom boundary is exceeded, start a new column
      else if (top + (gridConfig.itemHeight / 2) + gridConfig.safetyMargin > gridConfig.canvasHeight) {
        col++;
        row = 0;
        
        // Recalculate the new left position
        left = gridConfig.startX + col * gridConfig.columnWidth + gridConfig.itemWidth / 2;
        
        // Check if new column position exceeds right boundary
        if (left + (gridConfig.itemWidth / 2) + gridConfig.safetyMargin > gridConfig.canvasWidth) {
          // Reset to first column with new row if column exceeds width
          col = 0;
          // Try to find a row with space
          let foundRow = false;
          for (let r = 0; r < gridConfig.maxItemsPerColumn; r++) {
            top = gridConfig.startY + r * (gridConfig.itemHeight + gridConfig.verticalSpacing) + gridConfig.itemHeight / 2;
            if (!wouldExceedCanvasBoundary(
                gridConfig.startX + gridConfig.itemWidth / 2, 
                top, 
                gridConfig)) {
              row = r;
              foundRow = true;
              break;
            }
          }
          
          if (!foundRow) {
            // If all rows are full, place at a safe default position
            row = 0;
            top = gridConfig.startY + gridConfig.itemHeight / 2;
          }
          
          left = gridConfig.startX + gridConfig.itemWidth / 2;
        }
      } 
      // Otherwise just increment row in current column
      else {
        row++;
      }
      
      // Recalculate position with new column/row
      left = gridConfig.startX + col * gridConfig.columnWidth + gridConfig.itemWidth / 2;
      top = gridConfig.startY + row * (gridConfig.itemHeight + gridConfig.verticalSpacing) + gridConfig.itemHeight / 2;
      
      // Enhanced check for right boundary with exact values
      if (left + (gridConfig.itemWidth / 2) + gridConfig.safetyMargin > gridConfig.canvasWidth) {
        // If still outside boundaries, reset to first column
        col = 0;
        left = gridConfig.startX + gridConfig.itemWidth / 2;
      }
      
      // Check if new position exceeds boundaries - add strict right boundary check
      boundaryExceeded = wouldExceedCanvasBoundary(left, top, gridConfig) || left > maxRightPosition;
      
      // If we can't find a valid position after several attempts, reset to beginning
      if (attempts >= maxAttempts - 1 && boundaryExceeded) {
        // Last resort - just place at the initial position with adjusted coordinates
        left = gridConfig.startX + gridConfig.itemWidth/2 + gridConfig.safetyMargin;
        top = gridConfig.startY + gridConfig.itemHeight/2 + gridConfig.safetyMargin;
        col = 0;
        row = 0;
        break;
      }
    }
    
    // Create new flag with calculated position
    const newFlag: PlacedFlag = {
      ...flagToAdd,
      id: nanoid(),
      left,
      top,
    };
    
    // Add flag to board
    setPlacedFlags(prev => [...prev, newFlag]);
    
    // Update column height tracker
    const currentColHeight = top + (gridConfig.itemHeight / 2);
    columnHeightsRef.current[col] = Math.max(columnHeightsRef.current[col] || 0, currentColHeight);
    
    // Update grid position for next flag
    if (row + 1 >= gridConfig.maxItemsPerColumn || 
        wouldExceedCanvasBoundary(
          left, 
          top + gridConfig.itemHeight + gridConfig.verticalSpacing, 
          gridConfig
        )) {
      // Move to next column if current column is full or next position would exceed bottom boundary
      gridPositionRef.current = { col: col + 1, row: 0 };
      
      // Check if the next column would exceed canvas boundaries
      const nextColLeft = gridConfig.startX + (col + 1) * gridConfig.columnWidth + gridConfig.itemWidth / 2;
      if (nextColLeft + gridConfig.itemWidth/2 + gridConfig.safetyMargin > gridConfig.canvasWidth) {
        // If next column would exceed boundary, find an available position in existing columns
        let foundPlacement = false;
        
        // Find the column with the least height that still has room
        let shortestCol = 0;
        let shortestHeight = Infinity;
        
        Object.entries(columnHeightsRef.current).forEach(([colStr, height]) => {
          const colNum = parseInt(colStr, 10);
          // Only consider columns that are within boundaries
          const colLeft = gridConfig.startX + colNum * gridConfig.columnWidth + gridConfig.itemWidth / 2;
          
          // Added strict right boundary check
          if (height < shortestHeight && 
              !wouldExceedCanvasBoundary(colLeft, height + gridConfig.itemHeight, gridConfig) &&
              colLeft <= maxRightPosition) {
            shortestHeight = height;
            shortestCol = colNum;
            foundPlacement = true;
          }
        });
        
        if (foundPlacement) {
          // Use the identified shortest column
          gridPositionRef.current = { col: shortestCol, row: 0 };
        } else {
          // If no suitable column found, reset to first column at a higher row
          gridPositionRef.current = { col: 0, row: 0 };
        }
      }
    } else {
      // Move down in the same column
      gridPositionRef.current = { col, row: row + 1 };
    }
    
    // Clear selected flag after placement
    setSelectedFlag(null);
    
    // Show success notification
    setNotification({ message: `${flagToAdd.name} placed on canvas`, type: 'success' });
  }, [inventory, getGridConfig, wouldExceedCanvasBoundary]);

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
    updateGridPositionFromExistingFlags([...placedFlags, newFlag]);
  }, [inventory, placedFlags, getGridConfig]);

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
      // Update grid position after flag is moved
      updateGridPositionFromExistingFlags(updatedFlags);
      return updatedFlags;
    });
  }, [getGridConfig]);

  const removeFlag = useCallback((id: string) => {
    setPlacedFlags(prev => {
      const updatedFlags = prev.filter((flag) => flag.id !== id);
      // Update grid position after flag is removed
      updateGridPositionFromExistingFlags(updatedFlags);
      return updatedFlags;
    });
  }, []);

  const clearBoard = useCallback(() => {
    setPlacedFlags([]);
    // Reset grid position when board is cleared
    gridPositionRef.current = { col: 0, row: 0 };
    columnHeightsRef.current = {};
    setNotification({ message: 'Board cleared', type: 'success' });
  }, []);

  const selectFlag = useCallback((flag: Flag | null) => {
    setSelectedFlag(flag);
    
    // If on mobile and a flag is selected, automatically place it
    if (flag && isMobileDevice()) {
      autoPlaceFlag(flag.type);
    }
  }, [autoPlaceFlag]);

  // Safe way to update the play area ref without direct .current assignment
  const updatePlayAreaRef = useCallback((node: HTMLElement | null) => {
    playAreaRef.current = node;
  }, []);

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
