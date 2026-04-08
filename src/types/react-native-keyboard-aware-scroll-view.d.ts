declare module 'react-native-keyboard-aware-scroll-view' {
  import * as React from 'react';
  import { ScrollViewProps, ViewStyle } from 'react-native';

  export interface KeyboardAwareScrollViewProps extends ScrollViewProps {
    innerRef?: (ref: React.Component) => void;
    viewIsInsideTabBar?: boolean;
    resetScrollToCoords?: {
      x: number;
      y: number;
    };
    enableOnAndroid?: boolean;
    enableAutomaticScroll?: boolean;
    extraHeight?: number;
    extraScrollHeight?: number;
    enableResetScrollToCoords?: boolean;
    keyboardOpeningTime?: number;
    viewIsInsideTabBar?: boolean;
    contentContainerStyle?: ViewStyle;
    bounces?: boolean;
  }

  export class KeyboardAwareScrollView extends React.Component<KeyboardAwareScrollViewProps> {
    scrollToPosition(x: number, y: number, animated?: boolean): void;
    scrollToEnd(animated?: boolean): void;
    scrollForExtraHeightOnAndroid(extraHeight: number): void;
  }
}
