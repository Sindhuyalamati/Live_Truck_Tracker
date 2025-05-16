import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  CircularProgress,
  Box,
  AppBar,
  Toolbar,
  Button,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Paper
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import { BrowserRouter as Router, Routes, Route, useNavigate, useParams } from 'react-router-dom';

function useTrackers() {
  const [trackers, setTrackers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/trackers');
      const data = await response.json();
      setTrackers(data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch tracker data');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      await fetch('http://localhost:5000/api/refresh', { method: 'POST' });
      await fetchData();
    } catch (err) {
      setError('Failed to refresh data');
      console.error('Error refreshing data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return { trackers, loading, error, handleRefresh };
}

function MainPage() {
  const { trackers, loading, error, handleRefresh } = useTrackers();
  const navigate = useNavigate();

  // Group records by tracker_id
  const grouped = trackers.reduce((acc, rec) => {
    if (!acc[rec.tracker_id]) acc[rec.tracker_id] = [];
    acc[rec.tracker_id].push(rec);
    return acc;
  }, {});

  // Get the latest record for each truck for the card summary
  const latestByTracker = Object.values(grouped).map(records =>
    records.reduce((latest, rec) =>
      new Date(rec.last_update) > new Date(latest.last_update) ? rec : latest
    , records[0])
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ backgroundColor: '#f5f6fa', minHeight: '100vh' }}>
      <AppBar position="static" color="primary" sx={{ mb: 4 }}>
        <Toolbar>
          <Typography variant="h5" component="div" sx={{ flexGrow: 1, fontWeight: 600 }}>
            Live Truck Tracker
          </Typography>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            sx={{ fontWeight: 600 }}
          >
            Refresh Data
          </Button>
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg">
        <Grid container spacing={3}>
          {latestByTracker.map((tracker) => (
            <Grid item xs={12} sm={6} md={4} key={tracker.tracker_id}>
              <Card elevation={4} sx={{ borderRadius: 3, cursor: 'pointer', transition: '0.2s', '&:hover': { boxShadow: 8 } }}
                onClick={() => navigate(`/truck/${tracker.tracker_id}`)}>
                <CardHeader
                  avatar={<LocalShippingIcon color="primary" fontSize="large" />}
                  title={tracker.description || 'Unnamed Truck'}
                  subheader={`Tracker ID: ${tracker.tracker_id}`}
                  titleTypographyProps={{ fontWeight: 700, fontSize: 20 }}
                />
                <Divider />
                <CardContent>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    <strong>Location:</strong> {tracker.location}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    <strong>Speed:</strong> {tracker.speed} km/h
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Last Update:</strong> {new Date(tracker.last_update).toLocaleString()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}

function TruckDetailsPage() {
  const { tracker_id } = useParams();
  const { trackers, loading, error, handleRefresh } = useTrackers();
  const navigate = useNavigate();

  const records = trackers.filter((rec) => String(rec.tracker_id) === tracker_id);
  const truckName = records[0]?.description || 'Unnamed Truck';

  return (
    <Box sx={{ backgroundColor: '#f5f6fa', minHeight: '100vh' }}>
      <AppBar position="static" color="primary" sx={{ mb: 4 }}>
        <Toolbar>
          <Typography variant="h5" component="div" sx={{ flexGrow: 1, fontWeight: 600 }}>
            {truckName} (Tracker ID: {tracker_id})
          </Typography>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            sx={{ fontWeight: 600, mr: 2 }}
          >
            Refresh Data
          </Button>
          <Button variant="outlined" color="inherit" onClick={() => navigate('/')}>Back</Button>
        </Toolbar>
      </AppBar>
      <Container maxWidth="md">
        <Paper elevation={4} sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            All Records for {truckName}
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Location</TableCell>
                  <TableCell>Speed (km/h)</TableCell>
                  <TableCell>Last Update</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {records.map((rec, idx) => (
                  <TableRow key={rec.id || rec.last_update || idx}>
                    <TableCell>{rec.location}</TableCell>
                    <TableCell>{rec.speed}</TableCell>
                    <TableCell>{new Date(rec.last_update).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Container>
    </Box>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/truck/:tracker_id" element={<TruckDetailsPage />} />
      </Routes>
    </Router>
  );
} 