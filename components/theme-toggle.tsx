'use client';

import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import SettingsBrightnessIcon from '@mui/icons-material/SettingsBrightness';
import IconButton from '@mui/material/IconButton';
import { useColorScheme } from '@mui/material/styles';
import Tooltip from '@mui/material/Tooltip';

import { HEADER_ICON_SX } from '@/lib/theme';

type Mode = 'light' | 'dark' | 'system';

const MODE_CONFIG: Record<
  Mode,
  { icon: typeof DarkModeIcon; label: string; next: Mode }
> = {
  light: {
    icon: LightModeIcon,
    label: 'Light mode',
    next: 'dark',
  },
  dark: {
    icon: DarkModeIcon,
    label: 'Dark mode',
    next: 'system',
  },
  system: {
    icon: SettingsBrightnessIcon,
    label: 'System mode',
    next: 'light',
  },
};

function isMode(value: string | undefined): value is Mode {
  return value === 'light' || value === 'dark' || value === 'system';
}

export default function ThemeToggle() {
  const { mode, setMode } = useColorScheme();

  if (!isMode(mode)) {
    return null;
  }

  const currentMode = MODE_CONFIG[mode];
  const nextMode = MODE_CONFIG[currentMode.next];
  const actionLabel = `Switch to ${nextMode.label.toLowerCase()}`;
  const Icon = currentMode.icon;

  return (
    <Tooltip title={actionLabel}>
      <IconButton
        onClick={() => setMode(currentMode.next)}
        aria-label={actionLabel}
        size="small"
        disableRipple={true}
      >
        <Icon sx={HEADER_ICON_SX} />
      </IconButton>
    </Tooltip>
  );
}
