import React from 'react';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        src?: string;
        'ios-src'?: string;
        alt?: string;
        ar?: boolean;
        'ar-modes'?: string;
        'camera-controls'?: boolean;
        poster?: string;
        'shadow-intensity'?: string;
        'auto-rotate'?: boolean;
        loading?: 'auto' | 'lazy' | 'eager';
        reveal?: 'auto' | 'manual' | 'interaction';
        style?: React.CSSProperties;
      };
    }
  }
}
