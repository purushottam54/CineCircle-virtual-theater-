const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024 * 1024 // 10GB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-matroska', 'video/x-msvideo'];
    cb(null, allowedTypes.includes(file.mimetype));
  }
});

app.use(express.static("public"));
app.use('/uploads', express.static('uploads'));

// Store uploaded movies metadata
let movies = {};
let rooms = {};

io.on("connection", (socket) => {

  socket.on("join-room", ({ room, name }) => {

    socket.join(room);

    if (!rooms[room]) {
      rooms[room] = {
        users: [],
        videoTime: 0,
        isPlaying: false
      };
    }

    rooms[room].users.push({
      id: socket.id,
      name
    });

    io.to(room).emit("user-list", rooms[room].users);

    socket.emit("sync-video", {
      time: rooms[room].videoTime,
      playing: rooms[room].isPlaying
    });

    socket.to(room).emit("chat", {
      name: "System",
      message: `${name} joined the room`
    });

  });

  socket.on("chat", (data) => {
    io.to(data.room).emit("chat", data);
  });

  socket.on("reaction", (data) => {
    io.to(data.room).emit("reaction", data);
  });

  socket.on("video-play", ({ room, time }) => {

    if (!rooms[room]) return;

    rooms[room].isPlaying = true;
    rooms[room].videoTime = time;

    socket.to(room).emit("video-play", time);
  });

  socket.on("video-pause", ({ room, time }) => {

    if (!rooms[room]) return;

    rooms[room].isPlaying = false;
    rooms[room].videoTime = time;

    socket.to(room).emit("video-pause", time);
  });

  socket.on("video-time", ({ room, time }) => {

    if (!rooms[room]) return;

    rooms[room].videoTime = time;

    socket.to(room).emit("video-time", time);
  });

  socket.on("disconnect", () => {

    for (const room in rooms) {

      rooms[room].users =
        rooms[room].users.filter(u => u.id !== socket.id);

      io.to(room).emit("user-list", rooms[room].users);

      if (rooms[room].users.length === 0) {
        delete rooms[room];
      }

    }

  });

  socket.on("load-video", (data) => {

    socket.to(data.room).emit("load-video", data.url);

  });

  // Handle local movie upload
  socket.on("load-local-movie", async (data) => {
    try {
      // Generate unique movie ID
      const movieId = uuidv4();
      const movieInfo = {
        id: movieId,
        filename: data.filename,
        originalName: data.originalName,
        room: data.room,
        uploadedAt: new Date().toISOString()
      };
      
      movies[movieId] = movieInfo;
      
      // Broadcast the stream URL to all users in the room
      const streamUrl = `/stream/${movieId}`;
      
      io.to(data.room).emit("movie-loaded", streamUrl);
      
      // Add system message
      io.to(data.room).emit("chat", {
        name: "System",
        message: `🎬 ${data.originalName} loaded by ${data.username}`
      });
      
    } catch (error) {
      console.error('Error handling local movie load:', error);
      socket.emit("error", { message: "Failed to load local movie" });
    }
  });

  // WebRTC signalling for cameras
  socket.on("webrtc-offer", ({ room, to, offer }) => {
    socket.to(to).emit("webrtc-offer", {
      from: socket.id,
      offer
    });
  });

  socket.on("webrtc-answer", ({ room, to, answer }) => {
    socket.to(to).emit("webrtc-answer", {
      from: socket.id,
      answer
    });
  });

  socket.on("webrtc-ice-candidate", ({ room, to, candidate }) => {
    socket.to(to).emit("webrtc-ice-candidate", {
      from: socket.id,
      candidate
    });
  });

  socket.on("webrtc-stop-cam", ({ room }) => {
    socket.to(room).emit("webrtc-stop-cam", {
      from: socket.id
    });
  });

});

// HTTP range streaming endpoint for video files
app.get('/stream/:movieId', (req, res) => {
  const movieId = req.params.movieId;
  const movie = movies[movieId];
  
  if (!movie) {
    return res.status(404).send('Movie not found');
  }
  
  const filePath = path.join(__dirname, 'uploads', movie.filename);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('Movie file not found');
  }
  
  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;
  
  if (range) {
    // Handle range request for streaming
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = (end - start) + 1;
    const file = fs.createReadStream(filePath, { start, end });
    
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': 'video/mp4'
    };
    
    res.writeHead(206, head);
    file.pipe(res);
  } else {
    // Handle full file request
    const head = {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4'
    };
    
    res.writeHead(200, head);
    fs.createReadStream(filePath).pipe(res);
  }
});

// File upload endpoint
app.post('/upload', upload.single('movie'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  const movieId = uuidv4();
  const movieInfo = {
    id: movieId,
    filename: req.file.filename,
    originalName: req.file.originalname,
    room: req.body.room,
    uploadedAt: new Date().toISOString()
  };
  
  movies[movieId] = movieInfo;
  
  res.json({ 
    success: true, 
    movieId: movieId,
    streamUrl: `/stream/${movieId}`
  });
});

// Cleanup old movies (run every hour)
setInterval(() => {
  const now = new Date();
  for (const [movieId, movie] of Object.entries(movies)) {
    const movieAge = new Date(movie.uploadedAt);
    const hoursOld = (now - movieAge) / (1000 * 60 * 60);
    
    if (hoursOld > 24) { // Remove movies older than 24 hours
      const filePath = path.join(__dirname, 'uploads', movie.filename);
      try {
        fs.unlinkSync(filePath);
        delete movies[movieId];
        console.log(`Cleaned up old movie: ${movie.originalName}`);
      } catch (error) {
        console.error('Error cleaning up movie:', error);
      }
    }
  }
}, 60 * 60 * 1000); // Run every hour

server.listen(3000, '0.0.0.0', () => {
  console.log("Server running on http://localhost:3000");
  // Create uploads directory if it doesn't exist
  if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
  }
});
