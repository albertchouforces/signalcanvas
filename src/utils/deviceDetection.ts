/**
 * Utility functions for detecting device type.
 */

/**
 * Detects if the current device is a mobile/touch device.
 * Uses a combination of user agent detection and feature detection.
 * 
 * @returns {boolean} True if the device is a mobile/touch device, false otherwise.
 */
export const isMobileDevice = (): boolean => {
  // Check for touch capability
  const hasTouchCapability = 'ontouchstart' in window || 
                             navigator.maxTouchPoints > 0 || 
                             (navigator as any).msMaxTouchPoints > 0;
  
  // Check user agent for mobile devices
  const userAgent = navigator.userAgent.toLowerCase();
  const isMobileUserAgent = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|tablet/i.test(userAgent);
  
  // Also consider window width for responsive design breakpoints
  const hasSmallScreen = window.innerWidth <= 768;
  
  // Consider it a mobile device if it has touch capabilities AND either has a mobile user agent or small screen
  return hasTouchCapability && (isMobileUserAgent || hasSmallScreen);
};

/**
 * Gets the current viewport width.
 * 
 * @returns {number} The current viewport width in pixels.
 */
export const getViewportWidth = (): number => {
  return window.innerWidth;
};

/**
 * Gets the current viewport height.
 * 
 * @returns {number} The current viewport height in pixels.
 */
export const getViewportHeight = (): number => {
  return window.innerHeight;
};

/**
 * Detects if the device is in portrait orientation.
 * 
 * @returns {boolean} True if the device is in portrait orientation, false otherwise.
 */
export const isPortraitOrientation = (): boolean => {
  return window.innerHeight > window.innerWidth;
};

/**
 * Detects if the device has a very small screen (less than 360px wide).
 * 
 * @returns {boolean} True if the device has a very small screen, false otherwise.
 */
export const isVerySmallScreen = (): boolean => {
  return window.innerWidth < 360;
};
