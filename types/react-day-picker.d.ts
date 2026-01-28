declare module 'react-day-picker' {
  import * as React from 'react';

  export interface DayPickerProps {
    mode?: 'single' | 'multiple' | 'range';
    selected?: Date | Date[] | { from?: Date; to?: Date };
    onSelect?: (date: Date | undefined) => void;
    disabled?: Date[] | ((date: Date) => boolean);
    showOutsideDays?: boolean;
    className?: string;
    classNames?: Record<string, string>;
    captionLayout?: 'label' | 'dropdown' | 'dropdown-months' | 'dropdown-years';
    formatters?: Record<string, (date: Date) => string>;
    components?: Record<string, React.ComponentType<any>>;
    locale?: Locale;
    initialFocus?: boolean;
    [key: string]: any;
  }

  export interface DayButtonProps {
    className?: string;
    day: { date: Date };
    modifiers: {
      focused?: boolean;
      selected?: boolean;
      range_start?: boolean;
      range_end?: boolean;
      range_middle?: boolean;
      [key: string]: boolean | undefined;
    };
    [key: string]: any;
  }

  export const DayPicker: React.FC<DayPickerProps>;
  export const DayButton: React.FC<DayButtonProps>;
  export function getDefaultClassNames(): Record<string, string>;
}
