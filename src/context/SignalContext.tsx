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
  maxItemsPerRow: number;
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
  const gridPositionRef = useRef<{ row: number; col: number }>({ row: 0, col: 0 });

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
        setPlacedFlags(JSON.parse(savedFlags));
        // Update grid position based on existing flags when loading from storage
        updateGridPositionFromExistingFlags(JSON.parse(savedFlags));
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
  const updateGridPositionFromExistingFlags = (flags: PlacedFlag[]) => {
    if (!flags.length) {
      gridPositionRef.current = { row: 0, col: 0 };
      return;
    }

    // Get grid configuration
    const gridConfig = getGridConfig();
    
    // Find the maximum row and column based on existing flags' positions
    let maxRow = 0;
    let maxCol = 0;
    
    flags.forEach(flag => {
      const row = Math.floor((flag.top - gridConfig.startY) / (gridConfig.itemHeight + gridConfig.verticalSpacing));
      const col = Math.floor((flag.left - gridConfig.startX) / (gridConfig.itemWidth + gridConfig.horizontalSpacing));
      
      if (row >= 0 && col >= 0) {
        maxRow = Math.max(maxRow, row);
        maxCol = Math.max(maxCol, col);
      }
    });
    
    // Set the next position for new flags
    if (maxCol >= gridConfig.maxItemsPerRow - 1) {
      gridPositionRef.current = { row: maxRow + 1, col: 0 };
    } else {
      gridPositionRef.current = { row: maxRow, col: maxCol + 1 };
    }
  };

  // Get grid configuration based on current play area size
  const getGridConfig = useCallback((): GridConfig => {
    const playAreaNode = playAreaRef.current;
    if (!playAreaNode) {
      // Default values if play area is not available
      return {
        startX: 80, // Default starting X position with padding from left
        startY: 120, // Default starting Y position with padding from top for title
        itemWidth: 64, // Default flag width
        itemHeight: 64, // Default flag height
        horizontalSpacing: 20, // Default horizontal spacing between flags
        verticalSpacing: 20, // Default vertical spacing between flags
        maxItemsPerRow: 3, // Default maximum items per row for mobile
      };
    }

    // Get play area dimensions
    const areaRect = playAreaNode.getBoundingClientRect();
    const areaWidth = areaRect.width;
    
    // Flag dimensions
    const itemWidth = 64; // Flag width
    const itemHeight = 64; // Flag height
    
    // Spacing
    const horizontalSpacing = 20;
    const verticalSpacing = 20;
    
    // Calculate how many flags can fit in a row with proper spacing
    const maxItemsPerRow = Math.max(1, Math.floor((areaWidth - 40) / (itemWidth + horizontalSpacing)));
    
    // Start position - centered horizontally and with top padding
    const startX = (areaWidth - (maxItemsPerRow * (itemWidth + horizontalSpacing) - horizontalSpacing)) / 2;
    
    return {
      startX,
      startY: 120, // Top padding for title
      itemWidth,
      itemHeight,
      horizontalSpacing,
      verticalSpacing,
      maxItemsPerRow: isMobileDevice() ? Math.min(maxItemsPerRow, 3) : maxItemsPerRow, // Limit to 3 items per row on mobile
    };
  }, []);

  // Automatically place a flag on the canvas based on grid position
  const autoPlaceFlag = useCallback((flagType: string) => {
    const flagToAdd = inventory.find((f) => f.type === flagType);
    if (!flagToAdd) return;

    // Get current grid configuration
    const gridConfig = getGridConfig();
    
    // Calculate position based on current grid position
    const { row, col } = gridPositionRef.current;
    
    const left = gridConfig.startX + col * (gridConfig.itemWidth + gridConfig.horizontalSpacing) + gridConfig.itemWidth / 2;
    const top = gridConfig.startY + row * (gridConfig.itemHeight + gridConfig.verticalSpacing) + gridConfig.itemHeight / 2;
    
    // Create new flag with calculated position
    const newFlag: PlacedFlag = {
      ...flagToAdd,
      id: nanoid(),
      left,
      top,
    };
    
    // Add flag to board
    setPlacedFlags(prev => [...prev, newFlag]);
    
    // Update grid position for next flag
    if (col + 1 >= gridConfig.maxItemsPerRow) {
      // Move to next row if we've reached the end of the current row
      gridPositionRef.current = { row: row + 1, col: 0 };
    } else {
      // Otherwise move to next column
      gridPositionRef.current = { row, col: col + 1 };
    }
    
    // Clear selected flag after placement
    setSelectedFlag(null);
    
    // Show success notification
    setNotification({ message: `${flagToAdd.name} placed on canvas`, type: 'success' });
  }, [inventory, getGridConfig]);

  const addFlag = useCallback((flagType: string, left: number, top: number) => {
    const flagToAdd = inventory.find((f) => f.type === flagType);
    if (!flagToAdd) return;

    const newFlag: PlacedFlag = {
      ...flagToAdd,
      id: nanoid(),
      left,
      top,
    };

    setPlacedFlags(prev => [...prev, newFlag]);
    
    // Update grid position after manual placement to prevent auto-placing flags on top of manually placed ones
    updateGridPositionFromExistingFlags([...placedFlags, newFlag]);
  }, [inventory, placedFlags]);

  const moveFlag = useCallback((id: string, left: number, top: number) => {
    setPlacedFlags(prev => {
      const updatedFlags = prev.map((flag) => (flag.id === id ? { ...flag, left, top } : flag));
      // Update grid position after flag is moved
      updateGridPositionFromExistingFlags(updatedFlags);
      return updatedFlags;
    });
  }, []);

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
    gridPositionRef.current = { row: 0, col: 0 };
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
