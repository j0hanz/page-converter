import type { ReactNode } from 'react';

import BlockIcon from '@mui/icons-material/Block';
import CancelIcon from '@mui/icons-material/Cancel';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import Alert from '@mui/material/Alert';
import type { AlertColor } from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Box from '@mui/material/Box';

import type { TransformErrorCode } from '@/lib/api';

interface ErrorAlertConfig {
  icon: ReactNode;
  severity: AlertColor;
  title: string;
}

const ERROR_ALERT_MAP: Record<TransformErrorCode, ErrorAlertConfig> = {
  VALIDATION_ERROR: {
    icon: <WarningAmberIcon />,
    severity: 'warning',
    title: 'Invalid Input',
  },
  FETCH_ERROR: {
    icon: <WifiOffIcon />,
    severity: 'error',
    title: 'Connection Error',
  },
  HTTP_ERROR: {
    icon: <ErrorOutlineIcon />,
    severity: 'error',
    title: 'HTTP Error',
  },
  ABORTED: {
    icon: <CancelIcon />,
    severity: 'info',
    title: 'Cancelled',
  },
  QUEUE_FULL: {
    icon: <HourglassTopIcon />,
    severity: 'warning',
    title: 'Server Busy',
  },
  INTERNAL_ERROR: {
    icon: <ErrorOutlineIcon />,
    severity: 'error',
    title: 'Internal Error',
  },
};

const HTTP_STATUS_OVERRIDES: Record<number, ErrorAlertConfig> = {
  403: {
    icon: <BlockIcon />,
    severity: 'error',
    title: 'Forbidden',
  },
  404: {
    icon: <LinkOffIcon />,
    severity: 'error',
    title: 'Not Found',
  },
  429: {
    icon: <HourglassTopIcon />,
    severity: 'warning',
    title: 'Rate Limited',
  },
};

function resolveHttpErrorAlert(statusCode?: number): ErrorAlertConfig {
  if (statusCode !== undefined) {
    const override = HTTP_STATUS_OVERRIDES[statusCode];
    if (override) return override;

    if (statusCode >= 500) {
      return {
        icon: <CloudOffIcon />,
        severity: 'error',
        title: 'Server Error',
      };
    }
  }

  return ERROR_ALERT_MAP.HTTP_ERROR;
}

export function resolveErrorAlert(
  code: TransformErrorCode,
  statusCode?: number
): ErrorAlertConfig {
  if (code === 'HTTP_ERROR') {
    return resolveHttpErrorAlert(statusCode);
  }

  return ERROR_ALERT_MAP[code];
}

interface TransformAlertProps {
  code: TransformErrorCode;
  message: ReactNode;
  statusCode?: number;
}

export default function TransformAlert({
  code,
  message,
  statusCode,
}: TransformAlertProps) {
  const { icon, severity, title } = resolveErrorAlert(code, statusCode);

  return (
    <Alert
      variant="standard"
      icon={icon}
      severity={severity}
      sx={{
        bgcolor: 'unset',
        backgroundImage: 'none',
        boxShadow: 'none',
        maxWidth: 'min(100%, 70ch)',
        mx: 'auto',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          pb: 2,
          fontWeight: 500,
        }}
      >
        <AlertTitle>{title}</AlertTitle>

        {statusCode !== undefined && <>{statusCode}</>}
      </Box>

      {message}
    </Alert>
  );
}
