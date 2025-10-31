import { Dimensions, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Based on standard iPhone 6/7/8 dimensions
const scale = SCREEN_WIDTH / 375;

export const normalize = (size: number): number => {
  const newSize = size * scale;
  if (PixelRatio.get() >= 2 && PixelRatio.get() < 3) {
    // iPhone 6/7/8
    return newSize;
  }
  if (PixelRatio.get() >= 3) {
    // iPhone 6+/7+/8+
    return newSize;
  }
  return newSize;
};

// Width percentage based on screen width
export const widthPercentageToDP = (widthPercent: number): number => {
  return PixelRatio.roundToNearestPixel((SCREEN_WIDTH * widthPercent) / 100);
};

// Height percentage based on screen height
export const heightPercentageToDP = (heightPercent: number): number => {
  return PixelRatio.roundToNearestPixel((SCREEN_HEIGHT * heightPercent) / 100);
};

// Responsive font size
export const responsiveFontSize = (size: number): number => {
  return normalize(size);
};

// Responsive spacing
export const responsiveSpacing = (size: number): number => {
  return normalize(size);
};

// Screen dimensions
export const screenData = {
  width: SCREEN_WIDTH,
  height: SCREEN_HEIGHT,
};

// Device type detection
export const isTablet = (): boolean => {
  return SCREEN_WIDTH >= 768;
};

export const isSmallDevice = (): boolean => {
  return SCREEN_WIDTH < 375;
};

// Shorthand functions
export const wp = widthPercentageToDP;
export const hp = heightPercentageToDP;
export const rf = responsiveFontSize;
export const rs = responsiveSpacing;