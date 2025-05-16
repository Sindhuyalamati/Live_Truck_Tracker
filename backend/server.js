require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cron = require('node-cron');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Supabase configuration
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Helper function for reverse geocoding
async function getAddressFromLatLng(lat, lng) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
    const response = await axios.get(url, { headers: { 'User-Agent': 'LiveTruckTracker/1.0' } });
    return response.data.display_name || `${lat},${lng}`;
  } catch (error) {
    console.error('Reverse geocoding failed:', error.message);
    return `${lat},${lng}`;
  }
}

// Function to fetch data from Optimus API
async function fetchOptimusData() {
  try {
    let response;
    try {
      // Use Bearer token from .env
      response = await axios.get(process.env.OPTIMUS_API_URL, {
        headers: {
          'Authorization': `Bearer ${process.env.OPTIMUS_BEARER_TOKEN}`
        }
      });
    } catch (err1) {
      if (err1.response) console.error('Bearer token:', err1.response.data);
      throw err1;
    }
    // Log the full response for debugging
    console.log('Optimus API response:', JSON.stringify(response.data, null, 2));
    // The response is an array of truck objects
    const data = Array.isArray(response.data) ? response.data : response.data.data || response.data;
    for (const truck of data) {
      const tracker_id = truck.id || truck.deviceId || truck.tracker_id || null;
      const latitude = truck.latitude;
      const longitude = truck.longitude;
      let location = null;
      if (latitude && longitude) {
        location = await getAddressFromLatLng(latitude, longitude);
      }
      const speed = truck.speed || null;
      const status = truck.status || truck.state || null;
      const last_update = truck.utcDate || truck.last_update || truck.lastUpdate || new Date().toISOString();
      const description = truck.description || null;
      if (!tracker_id) {
        console.error('Skipping insert: tracker_id is null. Truck:', truck);
        continue;
      }
      if (!location) {
        console.error('Skipping insert: location is null. Truck:', truck);
        continue;
      }
      const { error } = await supabase
        .from('tracker_data')
        .insert([
          {
            tracker_id,
            location,
            latitude,
            longitude,
            speed,
            status,
            last_update,
            description
          }
        ]);
      if (error) {
        console.error('Error inserting data:', error);
      }
    }
    return data;
  } catch (error) {
    console.error('Error fetching data from Optimus API:', error);
    throw error;
  }
}

// API Endpoints
app.get('/api/trackers', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('tracker_data')
      .select('*')
      .order('last_update', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching tracker data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// New endpoint to trigger refresh from Optimus API
app.post('/api/refresh', async (req, res) => {
  try {
    const data = await fetchOptimusData();
    res.json({ success: true, message: 'Data refreshed from Optimus API', data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to refresh data', error: error.message });
  }
});

// Schedule data refresh every 10 minutes
cron.schedule('*/10 * * * *', async () => {
  try {
    await fetchOptimusData();
    console.log('Data refreshed successfully');
  } catch (error) {
    console.error('Error in scheduled refresh:', error);
  }
});

// Initial data fetch
fetchOptimusData().catch(console.error);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
}); 