const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'utm_remerit',
    charset: 'utf8mb4',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};


const pool = mysql.createPool(dbConfig);


pool.getConnection((err, connection) => {
    if (err) {
        console.error('❌ MySQL Connection Error:', err.message);
        return;
    }
    console.log('✅ Connected to MySQL Database');
    connection.release();
});

app.get('/', (req, res) => {
    res.json({ 
        message: 'EcoMap Backend API is running!',
        database_schema: 'Updated with STATIONS table',
        endpoints: {
            getAllBins: 'GET /api/bins',
            getBinDetails: 'GET /api/bins/:id',
            getNearbyBins: 'GET /api/bins/nearby?lat=1.5585&lng=103.6378&radius=2',
            updateBinStatus: 'PUT /api/bins/:id/status',
            getBinTypes: 'GET /api/bins/types',
            
            getAllStations: 'GET /api/stations',
            getStationDetails: 'GET /api/stations/:id',
            getStationBins: 'GET /api/stations/:id/bins',
            addStation: 'POST /api/stations',
            addBinToStation: 'POST /api/stations/:id/bins',
            findStationsWithTypes: 'POST /api/stations/find',
            
            reportIssue: 'POST /api/issues/report',
            getRecentIssues: 'GET /api/issues/recent',
            
            getStatistics: 'GET /api/statistics',
            
            testProcedure: 'GET /api/test/procedure'
        }
    });
});

app.get('/api/bins', (req, res) => {
    const query = `
        SELECT 
            rb.bin_id,
            rb.bin_name,
            bt.type_name,
            s.station_name,
            s.latitude,
            s.longitude,
            s.description as station_description,
            rb.status,
            rb.created_at,
            rb.updated_at
        FROM Recycling_Bins rb
        JOIN Bin_Types bt ON rb.bin_type_id = bt.bin_type_id
        JOIN STATIONS s ON rb.station_id = s.station_id
        ORDER BY rb.bin_id
    `;
    
    pool.query(query, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error', details: err.message });
        }
        res.json(results);
    });
});

app.get('/api/bins/:id', (req, res) => {
    const { id } = req.params;
    
    const query = `
        SELECT 
            rb.bin_id,
            rb.bin_name,
            bt.type_name,
            bt.description AS bin_type_description,
            s.latitude,          
            s.longitude,         
            s.description as station_description,
            rb.status,
            rb.created_at,
            rb.updated_at
        FROM Recycling_Bins rb
        JOIN Bin_Types bt ON rb.bin_type_id = bt.bin_type_id
        JOIN STATIONS s ON rb.station_id = s.station_id
        WHERE rb.bin_id = ?
    `;
    
    pool.query(query, [id], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error', details: err.message });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ message: 'Bin not found' });
        }
        
        res.json(results[0]);
    });
});

app.get('/api/bins/nearby', (req, res) => {
    const { lat, lng, radius = 2 } = req.query;
    
    if (!lat || !lng) {
        return res.status(400).json({ 
            error: 'Missing parameters', 
            message: 'Please provide latitude and longitude' 
        });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const searchRadius = parseFloat(radius);

    const query = `
        SELECT 
            s.station_id,
            s.station_name,
            rb.bin_id,
            rb.bin_name,
            bt.type_name,
            s.latitude,
            s.longitude,
            s.description as station_description,
            rb.status,
            (
                6371 * acos(
                    cos(radians(?)) * cos(radians(s.latitude)) * 
                    cos(radians(s.longitude) - radians(?)) + 
                    sin(radians(?)) * sin(radians(s.latitude))
                )
            ) AS distance_km
        FROM STATIONS s
        JOIN Recycling_Bins rb ON s.station_id = rb.station_id
        JOIN Bin_Types bt ON rb.bin_type_id = bt.bin_type_id
        HAVING distance_km <= ?
        ORDER BY distance_km, s.station_name, bt.type_name
        LIMIT 50
    `;
    
    pool.query(query, [latitude, longitude, latitude, searchRadius], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error', details: err.message });
        }
        
        const formattedResults = results.map(bin => ({
            ...bin,
            distance_km: parseFloat(bin.distance_km).toFixed(2),
            latitude: parseFloat(bin.latitude),
            longitude: parseFloat(bin.longitude)
        }));
        
        res.json(formattedResults);
    });
});


app.get('/api/bins/types', (req, res) => {
    const query = 'SELECT * FROM Bin_Types ORDER BY type_name';
    
    pool.query(query, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error', details: err.message });
        }
        res.json(results);
    });
});


app.put('/api/bins/:id/status', async (req, res) => {
    const binId = req.params.id;
    const { status } = req.body;
    
    if (!status) {
        return res.status(400).json({ 
            success: false,
            error: 'Missing status field'
        });
    }
    
    const validStatuses = ['Active', 'Full', 'Under Maintenance'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ 
            success: false,
            error: 'Invalid status',
            valid_statuses: validStatuses
        });
    }
    
    try {
        await pool.promise().query(
            'CALL UpdateBinStatus(?, ?, @message)',
            [binId, status]
        );
        
        const [output] = await pool.promise().query('SELECT @message as message');
        const { message } = output[0];
        
        if (message.startsWith('Error:')) {
            return res.status(400).json({
                success: false,
                error: message
            });
        }
        
        const success = message.startsWith('Success:');
        
        res.json({
            success: success,
            message: message,
            status: status,
            updated_at: new Date().toISOString()
        });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ 
            success: false,
            error: 'Database error', 
            details: err.message 
        });
    }
});


app.post('/api/stations/find', (req, res) => {
    const { latitude, longitude, binTypes, radius = 1.0 } = req.body;
    
    if (!latitude || !longitude || !binTypes) {
        return res.status(400).json({ 
            error: 'Missing parameters', 
            message: 'Please provide latitude, longitude, and binTypes' 
        });
    }
    
    const typesString = Array.isArray(binTypes) ? binTypes.join(',') : binTypes;
    
    console.log(`Finding stations with types: ${typesString} at (${latitude}, ${longitude}) within ${radius}km`);
    
    const procedureQuery = 'CALL FindStationsWithBinTypes(?, ?, ?, ?)';
    
    pool.query(procedureQuery, [latitude, longitude, typesString, radius], (err, results) => {
        if (err) {
            console.error('Stored procedure error:', err);
            return res.status(500).json({ 
                error: 'Database error', 
                details: err.message 
            });
        }
        
        const stations = results[0] || [];
        
        console.log(`Found ${stations.length} stations`);
        
        if (stations.length === 0) {
            return res.json([]);
        }
        
        const formattedStations = stations.map(station => ({
            station_id: station.station_id,
            station_name: station.station_name,
            latitude: parseFloat(station.latitude || 0),
            longitude: parseFloat(station.longitude || 0),
            station_description: station.station_description || station.location_description || 'Recycling Station',
            total_bins: parseInt(station.total_bins_at_station || 0),
            available_types: station.available_bin_types || '',
            distance_km: parseFloat(station.distance_km || 0),
            bin_details: station.bin_details || '',
            status_summary: station.status_summary || ''
        }));
        
        res.json(formattedStations);
    });
});

app.get('/api/stations', (req, res) => {
    const query = `
        SELECT 
            station_id,
            station_name,
            latitude,
            longitude,
            description,
            total_bins,
            available_types,
            active_bins,
            full_bins,
            maintenance_bins
        FROM Station_Details
        ORDER BY station_name
    `;
    
    pool.query(query, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error', details: err.message });
        }
        
        const formattedStations = results.map(station => ({
            station_id: station.station_id,
            station_name: station.station_name,
            latitude: parseFloat(station.latitude),
            longitude: parseFloat(station.longitude),
            description: station.description,
            total_bins: parseInt(station.total_bins || 0),
            available_types: station.available_types || '',
            active_bins: parseInt(station.active_bins || 0),
            full_bins: parseInt(station.full_bins || 0),
            maintenance_bins: parseInt(station.maintenance_bins || 0)
        }));
        
        res.json(formattedStations);
    });
});

app.get('/api/stations/:id', (req, res) => {
    const { id } = req.params;
    
    const query = `
        SELECT 
            s.*,
            GROUP_CONCAT(DISTINCT CONCAT(rb.bin_name, ' (', bt.type_name, ')') SEPARATOR '; ') as bins
        FROM STATIONS s
        LEFT JOIN Recycling_Bins rb ON s.station_id = rb.station_id
        LEFT JOIN Bin_Types bt ON rb.bin_type_id = bt.bin_type_id
        WHERE s.station_id = ?
        GROUP BY s.station_id
    `;
    
    pool.query(query, [id], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error', details: err.message });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ message: 'Station not found' });
        }
        
        res.json(results[0]);
    });
});


app.get('/api/stations/:id/bins', (req, res) => {
    const { id } = req.params;
    
    const query = `
        SELECT 
            rb.bin_id,
            rb.bin_name,
            bt.type_name,
            bt.description as type_description,
            rb.status,
            rb.created_at,
            rb.updated_at
        FROM Recycling_Bins rb
        JOIN Bin_Types bt ON rb.bin_type_id = bt.bin_type_id
        WHERE rb.station_id = ?
        ORDER BY bt.type_name
    `;
    
    pool.query(query, [id], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error', details: err.message });
        }
        
        res.json(results);
    });
});


app.post('/api/stations', async (req, res) => {
    const { station_name, latitude, longitude, description } = req.body;
    
    if (!station_name || !latitude || !longitude) {
        return res.status(400).json({ 
            success: false,
            error: 'Missing required fields',
            required: ['station_name', 'latitude', 'longitude']
        });
    }
    
    try {
        const [result] = await pool.promise().query(
            'CALL AddNewStation(?, ?, ?, ?, @station_id, @message)',
            [station_name, latitude, longitude, description || null]
        );
        
        const [output] = await pool.promise().query('SELECT @station_id as station_id, @message as message');
        const { station_id, message } = output[0];
        
        if (message.startsWith('Error:')) {
            return res.status(400).json({
                success: false,
                error: message
            });
        }
        
        res.json({
            success: true,
            message: message,
            station_id: station_id
        });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ 
            success: false,
            error: 'Database error', 
            details: err.message 
        });
    }
});


app.post('/api/stations/:id/bins', async (req, res) => {
    const stationId = req.params.id;
    const { bin_type_id, bin_name, status = 'Active' } = req.body;
    
    if (!bin_type_id || !bin_name) {
        return res.status(400).json({ 
            success: false,
            error: 'Missing required fields',
            required: ['bin_type_id', 'bin_name']
        });
    }
    
    try {
        await pool.promise().query(
            'CALL AddBinToStation(?, ?, ?, ?, @bin_id, @message)',
            [stationId, bin_type_id, bin_name, status]
        );
        
        const [output] = await pool.promise().query('SELECT @bin_id as bin_id, @message as message');
        const { bin_id, message } = output[0];
        
        if (message.startsWith('Error:')) {
            return res.status(400).json({
                success: false,
                error: message
            });
        }
        
        res.json({
            success: true,
            message: message,
            bin_id: bin_id
        });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ 
            success: false,
            error: 'Database error', 
            details: err.message 
        });
    }
});

app.post('/api/issues/report', (req, res) => {
    const { bin_id, user_id, issue_type, description, photo_url } = req.body;
    
    console.log('🔵 Received report request:', { 
        bin_id, 
        user_id, 
        issue_type, 
        description, 
        photo_url,
    });
    
    if (!user_id || !issue_type) {
        console.log('❌ Missing required fields');
        return res.status(400).json({ 
            success: false,
            error: 'Missing required fields',
            required: ['user_id', 'issue_type']
        });
    }
    
    const validIssueTypes = ['Full', 'Damaged', 'Misplaced', 'Inaccessible', 'Other'];
    if (!validIssueTypes.includes(issue_type)) {
        console.log('❌ Invalid issue type:', issue_type);
        return res.status(400).json({ 
            success: false,
            error: 'Invalid issue type',
            valid_types: validIssueTypes 
        });
    }
    
    if (bin_id && bin_id !== 0) {
        let actualBinId;
        
        if (typeof bin_id === 'string' && bin_id.includes('station')) {
            console.log('❌ Cannot report station bin without valid bin_id');
            return res.status(400).json({ 
                success: false,
                error: 'Cannot report station bin issue',
                message: 'Please select a specific bin at the station to report'
            });
        } else {
            actualBinId = parseInt(bin_id);
            if (isNaN(actualBinId) || actualBinId <= 0) {
                console.log('❌ Invalid bin_id format:', bin_id);
                return res.status(400).json({ 
                    success: false,
                    error: 'Invalid bin ID format',
                    message: 'Bin ID must be a valid positive number'
                });
            }
        }
        
        const query = `
            INSERT INTO Bin_Issues 
            (bin_id, user_id, issue_type, description, photo_url, status, reported_at)
            VALUES (?, ?, ?, ?, ?, 'Pending', NOW())
        `;
        
        console.log('📝 Executing query for bin report:', {
            bin_id: actualBinId,
            user_id,
            issue_type,
            description: description ? 'Provided' : 'None',
            photo_url: photo_url ? 'Provided' : 'None'
        });
        
        pool.query(query, [
            actualBinId, 
            user_id, 
            issue_type, 
            description || null, 
            photo_url || null
        ], (err, result) => {
            if (err) {
                console.error('❌ Database error:', err.message);
                console.error('❌ SQL Error:', err.sql);
                return res.status(500).json({ 
                    success: false,
                    error: 'Database error',
                    details: err.message,
                    sql: err.sql
                });
            }
            
            console.log('✅ Report submitted successfully. Issue ID:', result.insertId);
            
            res.json({ 
                success: true, 
                message: 'Bin issue reported successfully!',
                data: {
                    issue_id: result.insertId,
                    bin_id: actualBinId,
                    issue_type,
                    status: 'Pending',
                    reported_at: new Date().toISOString()
                }
            });
        });
    } else {
        console.log('❌ No valid bin_id provided');
        return res.status(400).json({ 
            success: false,
            error: 'No bin selected',
            message: 'Please select a specific bin to report an issue'
        });
    }
});

app.get('/api/issues/recent', (req, res) => {
    const query = `
        SELECT 
            bi.*,
            rb.bin_name,
            bt.type_name,
            s.station_name,
            s.latitude,
            s.longitude
        FROM Bin_Issues bi
        JOIN Recycling_Bins rb ON bi.bin_id = rb.bin_id
        JOIN Bin_Types bt ON rb.bin_type_id = bt.bin_type_id
        JOIN STATIONS s ON rb.station_id = s.station_id
        WHERE bi.reported_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        ORDER BY bi.reported_at DESC
        LIMIT 20
    `;
    
    pool.query(query, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error', details: err.message });
        }
        res.json(results);
    });
});


app.get('/api/statistics', (req, res) => {
    const procedureQuery = 'CALL GetBinStatistics()';
    
    pool.query(procedureQuery, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error', details: err.message });
        }
        
        const [statusStats, stationStats, issueStats, issueTypeStats] = results;
        
        res.json({
            bin_status: statusStats[0] || [],
            station_count: stationStats[0] || [],
            issue_status: issueStats[0] || [],
            issue_types: issueTypeStats[0] || []
        });
    });
});

app.get('/api/test/procedure', (req, res) => {
    const testLat = 1.564145;
    const testLng = 103.638011;
    const testTypes = 'Plastic,Paper';
    const testRadius = 1.0;
    
    const procedureQuery = 'CALL FindStationsWithBinTypes(?, ?, ?, ?)';
    
    pool.query(procedureQuery, [testLat, testLng, testTypes, testRadius], (err, results) => {
        if (err) {
            console.error('Stored procedure test error:', err);
            return res.status(500).json({ 
                error: 'Stored procedure error', 
                details: err.message 
            });
        }
        
        const stations = results[0] || [];
        
        res.json({
            message: 'Stored procedure test successful',
            parameters: {
                latitude: testLat,
                longitude: testLng,
                types: testTypes,
                radius: testRadius
            },
            stations_found: stations.length,
            stations: stations.map(s => ({
                latitude: s.latitude,
                longitude: s.longitude,
                location: s.location_description,
                available_types: s.available_bin_types,
                distance: s.distance_km
            }))
        });
    });
});


app.use((err, req, res, next) => {
    console.error('Server Error:', err);
    res.status(500).json({ 
        error: 'Internal server error',
        message: err.message 
    });
});


app.use('*', (req, res) => {
    res.status(404).json({ 
        error: 'Endpoint not found',
        available_endpoints: [
            'GET /',
            'GET /api/bins',
            'GET /api/bins/:id',
            'PUT /api/bins/:id/status',
            'GET /api/bins/nearby',
            'GET /api/bins/types',
            'GET /api/stations',
            'GET /api/stations/:id',
            'GET /api/stations/:id/bins',
            'POST /api/stations',
            'POST /api/stations/:id/bins',
            'POST /api/stations/find',
            'POST /api/issues/report',
            'GET /api/issues/recent',
            'GET /api/statistics',
            'GET /api/test/procedure'
        ]
    });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Backend server running on port ${PORT}`);
    console.log(`📡 Access via: http://localhost:${PORT}`);
    console.log(`📱 React Native should use: http://10.0.2.2:${PORT} (Android emulator)`);
    console.log(`\n🌟 Available Endpoints:`);
    console.log(`✅ Bins: /api/bins, /api/bins/:id, /api/bins/nearby`);
    console.log(`✅ Stations: /api/stations, /api/stations/:id, /api/stations/:id/bins`);
    console.log(`✅ Station Management: POST /api/stations, POST /api/stations/:id/bins`);
    console.log(`✅ Station Search: POST /api/stations/find`);
    console.log(`✅ Issues: POST /api/issues/report, GET /api/issues/recent`);
    console.log(`✅ Statistics: GET /api/statistics`);
    console.log(`✅ Bin Management: PUT /api/bins/:id/status`);

});
