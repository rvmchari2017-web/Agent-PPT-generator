// Enum for the different views/pages in the application
export enum View {
  Login,
  SignUp,
  Dashboard,
  Create,
  Editor,
}

// Interface for a User object
export interface User {
  id: string;
  name: string;
  email: string;
}

// Type definitions for different background types
export type ColorBackground = {
  type: 'color';
  value: string; 
};

export type ImageBackground = {
  type: 'image';
  value: string;
  opacity?: number; // Opacity from 0 to 1
  blur?: number; // Blur in pixels
};

export type GradientBackground = {
  type: 'gradient';
  color1: string;
  color2: string;
  angle: number; // Angle in degrees
};


// Union type for all possible slide backgrounds
export type Background = ColorBackground | ImageBackground | GradientBackground;

// Interface for text styling options
export interface TextStyle {
  fontSize: string;
  fontFamily: string;
  color: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  // FIX: Add optional textShadow property to support text shadows on slides with image backgrounds.
  textShadow?: string;
}

// Interface for a single Slide object
export interface Slide {
  id: string;
  title: string;
  content: string[]; // Array of strings for bullet points
  background: Background;
  titleStyle: TextStyle;
  contentStyle: TextStyle;
}

// Interface for a Presentation object
export interface Presentation {
  id: string;
  userId: string;
  title: string;
  slides: Slide[];
  theme: string;
  createdAt: string;
}

// A lightweight version of Presentation for dashboard lists to improve performance
export interface PresentationMeta {
  id: string;
  title: string;
  slideCount: number;
  createdAt: string;
}