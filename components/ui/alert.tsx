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
    icon: <WarningAmberIcon fontSize="inherit" />,
    severity: 'warning',
    title: 'Invalid Input',
  },
  FETCH_ERROR: {
    icon: <WifiOffIcon fontSize="inherit" />,
    severity: 'error',
    title: 'Connection Error',
  },
  HTTP_ERROR: {
    icon: <ErrorOutlineIcon fontSize="inherit" />,
    severity: 'error',
    title: 'HTTP Error',
  },
  ABORTED: {
    icon: <CancelIcon fontSize="inherit" />,
    severity: 'info',
    title: 'Cancelled',
  },
  QUEUE_FULL: {
    icon: <HourglassTopIcon fontSize="inherit" />,
    severity: 'warning',
    title: 'Server Busy',
  },
  INTERNAL_ERROR: {
    icon: <ErrorOutlineIcon fontSize="inherit" />,
    severity: 'error',
    title: 'Internal Error',
  },
};

const HTTP_STATUS_OVERRIDES: Record<number, ErrorAlertConfig> = {
  403: {
    icon: <BlockIcon fontSize="inherit" />,
    severity: 'error',
    title: 'Forbidden',
  },
  404: {
    icon: <LinkOffIcon fontSize="inherit" />,
    severity: 'error',
    title: 'Not Found',
  },
  429: {
    icon: <HourglassTopIcon fontSize="inherit" />,
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
        icon: <CloudOffIcon fontSize="inherit" />,
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
      }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          pb: 3,
        }}
      >
        <AlertTitle>{title}</AlertTitle>

        {statusCode !== undefined && <>{statusCode}</>}
      </Box>

      {message}
    </Alert>
  );
}
