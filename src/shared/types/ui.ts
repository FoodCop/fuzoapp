import type React from 'react';

export type IconComponent = React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;

export interface SettingsItemProps {
  icon: IconComponent;
  label: string;
  value: string;
  onClick: () => void;
  color?: 'stone' | 'blue' | 'emerald' | 'indigo' | 'orange' | 'red' | 'yellow';
  action?: React.ReactNode;
}

export interface NavIconProps {
  icon: IconComponent;
  active: boolean;
  onClick: () => void;
  label?: string;
}
