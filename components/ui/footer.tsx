import GitHubIcon from '@mui/icons-material/GitHub';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import { SITE_CREATOR, SITE_REPOSITORY_URL } from '@/lib/site';
import { sx } from '@/lib/theme';

export default function Footer() {
  return (
    <Box
      component="footer"
      sx={{
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        py: 1,
        gap: 2,
        marginTop: 'auto',
        width: '100%',
        opacity: 0.7,
      }}
    >
      <Typography variant="caption" textAlign="center">
        &copy; 2026{' '}
        <Link
          href={`https://github.com/${SITE_CREATOR}`}
          target="_blank"
          rel="noopener noreferrer"
          color="inherit"
          underline="hover"
        >
          {SITE_CREATOR}
        </Link>
      </Typography>

      <Box>
        <Tooltip title="View Source on GitHub">
          <IconButton
            component="a"
            href={SITE_REPOSITORY_URL}
            target="_blank"
            size="small"
            disableRipple={true}
            rel="noopener noreferrer"
            aria-label="View Source on GitHub"
            sx={{ color: 'text.secondary' }}
          >
            <GitHubIcon sx={sx.headerIcon} />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
}
