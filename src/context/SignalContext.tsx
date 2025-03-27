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
  maxColumns: number; // Added to explicitly track how many columns can fit
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
  
  // Flag to track if we're currently transitioning to a new column
  // This prevents double flag placement during column transitions
  const isTransitioningColumnRef = useRef<boolean>(false);

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
    
    // Reset column transition flag
    isTransitioningColumnRef.current = false;
  };

  // Get grid configuration based on current play area size
  // Modified to include columnWidth for better overflow handling and canvas boundaries
  const getGridConfig = useCallback((): GridConfig => {
    const playAreaNode = playAreaRef.current;
    const isMobile = isMobileDevice();
    
    // Flag dimensions - smaller on mobile
    const itemWidth = isMobile ? 42 : 64;
    const itemHeight = isMobile ? 42 : 64;
    
    // Spacing - tighter on mobile
    const horizontalSpacing = isMobile ? 16 : 24; // Reduced for more compact mobile layout
    const verticalSpacing = isMobile ? 10 : 20;   // Reduced vertical spacing on mobile to fit more flags
    
    // Calculate actual column width including spacing
    const columnWidth = itemWidth + horizontalSpacing;
    
    // Safety margin to ensure flags aren't placed too close to the edge
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
        canvasWidth: 320, // Fallback canvas width
        canvasHeight: 480, // Fallback canvas height
        safetyMargin,
        maxColumns: 4 // Default max columns
      };
    }

    // Get play area dimensions
    const areaRect = playAreaNode.getBoundingClientRect();
    const areaWidth = areaRect.width;
    const areaHeight = areaRect.height;
    
    // Calculate max items per column with proper spacing
    const bottomSafetyBuffer = isMobile ? 60 : 100;
    const heightBuffer = isMobile ? 40 : 100;
    
    const maxItemsPerColumn = Math.max(1, Math.floor(
      (areaHeight - heightBuffer - bottomSafetyBuffer) / (itemHeight + verticalSpacing)
    ));
    
    // Calculate start position - ensure fixed and consistent starting point
    const startX = isMobile 
      ? Math.max(itemWidth/2 + safetyMargin, 30) // Fixed starting point for mobile
      : (areaWidth - (3 * columnWidth - horizontalSpacing)) / 2;
    
    // Ensure startY leaves enough vertical space
    const startY = isMobile ? Math.max(itemHeight/2 + safetyMargin, 45) : 55;

    // Calculate maximum number of columns that can fit
    // This is critical for consistent column spacing
    const usableWidth = areaWidth - (2 * safetyMargin);
    
    // Calculate max columns with proper spacing AND ensure we don't overflow
    // Use ceil to calculate max possible columns including full width of each
    const maxColumns = Math.floor((usableWidth - itemWidth) / columnWidth) + 1;
    
    return {
      startX,
      startY,
      itemWidth,
      itemHeight,
      horizontalSpacing,
      verticalSpacing,
      maxItemsPerColumn: isMobile ? Math.max(maxItemsPerColumn, 8) : maxItemsPerColumn,
      columnWidth,
      canvasWidth: areaWidth,
      canvasHeight: areaHeight,
      safetyMargin,
      maxColumns: Math.max(1, maxColumns) // Ensure at least 1 column
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
    // Don't place a flag if we're in the middle of transitioning columns
    // This prevents the bug of extra flags being added during column transitions
    if (isTransitioningColumnRef.current) {
      isTransitioningColumnRef.current = false;
      return;
    }
    
    const flagToAdd = inventory.find((f) => f.type === flagType);
    if (!flagToAdd) return;

    // Get current grid configuration
    const gridConfig = getGridConfig();
    
    // Get current column and row position
    let { col, row } = gridPositionRef.current;
    
    // Ensure column is within bounds of maxColumns
    if (col >= gridConfig.maxColumns) {
      col = 0;
      row = 0;
    }
    
    // Calculate the exact position for the flag with fixed column widths
    // This ensures consistent column spacing regardless of how many columns we have
    const left = gridConfig.startX + (col * gridConfig.columnWidth);
    let top = gridConfig.startY + row * (gridConfig.itemHeight + gridConfig.verticalSpacing) + gridConfig.itemHeight / 2;
    
    // Calculate the maximum right position (right boundary)
    const maxRightPosition = gridConfig.canvasWidth - gridConfig.safetyMargin - gridConfig.itemWidth/2;
    
    // Check if this position would cause flag to exceed any canvas boundary
    let boundaryExceeded = wouldExceedCanvasBoundary(left, top, gridConfig);
    
    // Additional strict check for right boundary with precise calculation
    if (left > maxRightPosition) {
      boundaryExceeded = true;
    }
    
    // Try to find a valid position that doesn't exceed boundaries
    let attempts = 0;
    const maxAttempts = 20; // Prevent infinite loops
    
    while (boundaryExceeded && attempts < maxAttempts) {
      attempts++;
      
      // If right boundary is exceeded, move to first column of next row
      if (left > maxRightPosition) {
        // Set the column transition flag to true to prevent double placement
        isTransitioningColumnRef.current = true;
        
        col = 0;
        row++;
        
        // If we've reached max rows in first column, try to find a valid column
        if (row >= gridConfig.maxItemsPerColumn) {
          // Reset to first row
          row = 0;
          
          // Reset to first column when we exceed right boundary
          col = 0;
        }
      } 
      // If bottom boundary is exceeded, start a new column
      else if (top + (gridConfig.itemHeight / 2) + gridConfig.safetyMargin > gridConfig.canvasHeight) {
        // Set the column transition flag to true to prevent double placement
        isTransitioningColumnRef.current = true;
        
        col++;
        row = 0;
        
        // If new column would exceed max columns, reset to first column
        if (col >= gridConfig.maxColumns) {
          col = 0;
        }
      } 
      // Otherwise just increment row in current column
      else {
        row++;
      }
      
      // Recalculate position with new column/row using fixed column width
      // This ensures consistent spacing between columns
      const newLeft = gridConfig.startX + (col * gridConfig.columnWidth);
      const newTop = gridConfig.startY + row * (gridConfig.itemHeight + gridConfig.verticalSpacing) + gridConfig.itemHeight / 2;
      
      // Check if the calculated position would exceed the right boundary
      if (newLeft > maxRightPosition) {
        // If it would, try the first column instead
        col = 0;
        const resetLeft = gridConfig.startX + (col * gridConfig.columnWidth);
        
        // If we're already at the first column and still exceeding, we might need to adjust margins
        if (resetLeft > maxRightPosition) {
          // As a last resort, place at the leftmost position with safety margin
          isTransitioningColumnRef.current = true;
          col = 0;
          row = 0;
          break;
        }
      }
      
      // Update position for next check
      top = newTop;
      
      // Final boundary check after position adjustment
      boundaryExceeded = wouldExceedCanvasBoundary(newLeft, newTop, gridConfig) || newLeft > maxRightPosition;
      
      // If we can't find a valid position after several attempts, reset to beginning
      if (attempts >= maxAttempts - 1 && boundaryExceeded) {
        // Last resort - place at the initial starting position
        col = 0;
        row = 0;
        break;
      }
    }
    
    // Calculate final position for the flag using fixed column width formula
    const finalLeft = gridConfig.startX + (col * gridConfig.columnWidth);
    const finalTop = gridConfig.startY + row * (gridConfig.itemHeight + gridConfig.verticalSpacing) + gridConfig.itemHeight / 2;
    
    // Create new flag with calculated position
    const newFlag: PlacedFlag = {
      ...flagToAdd,
      id: nanoid(),
      left: finalLeft,
      top: finalTop,
    };
    
    // Add flag to board
    setPlacedFlags(prev => [...prev, newFlag]);
    
    // Update column height tracker for the current column
    const currentColHeight = finalTop + (gridConfig.itemHeight / 2);
    columnHeightsRef.current[col] = Math.max(columnHeightsRef.current[col] || 0, currentColHeight);
    
    // Update grid position for next flag
    if (row + 1 >= gridConfig.maxItemsPerColumn || 
        wouldExceedCanvasBoundary(
          finalLeft, 
          finalTop + gridConfig.itemHeight + gridConfig.verticalSpacing, 
          gridConfig
        )) {
      // Move to next column if current column is full or next position would exceed bottom boundary
      const nextCol = col + 1;
      
      // Mark that we're transitioning columns to prevent double flag placement
      isTransitioningColumnRef.current = true;
      
      // Check if the next column would exceed max columns
      if (nextCol >= gridConfig.maxColumns) {
        // Reset to first column, first row if we've reached max columns
        gridPositionRef.current = { col: 0, row: 0 };
      } else {
        // Move to next column, first row
        gridPositionRef.current = { col: nextCol, row: 0 };
        
        // Calculate next column position and verify it won't exceed canvas boundaries
        const nextColLeft = gridConfig.startX + (nextCol * gridConfig.columnWidth);
        if (nextColLeft > maxRightPosition) {
          // If next column would exceed right boundary, reset to first column
          gridPositionRef.current = { col: 0, row: 0 };
        }
      }
    } else {
      // Move down in the same column
      gridPositionRef.current = { col, row: row + 1 };
      // Reset the transition flag since we're staying in the same column
      isTransitioningColumnRef.current = false;
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
    isTransitioningColumnRef.current = false;
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
