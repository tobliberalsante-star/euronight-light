const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 3001;

let state = {
  color: '#000000',
  effect: null,
  speed: 5,
  brightness: 1,
};

const viewers = new Set();

function broadcastViewerCount() {
  io.emit('viewer_count', { count: viewers.size });
}

io.on('connection', (socket) => {
  socket.emit('init_state', state);

  socket.on('register_viewer', () => {
    viewers.add(socket.id);
    broadcastViewerCount();
  });

  socket.on('register_admin', () => {
    // Admin ne compte pas dans les viewers
  });

  socket.on('set_color', ({ color }) => {
    state.color = color;
    state.effect = null;
    io.emit('color_update', { color });
    io.emit('effect_stop');
  });

  socket.on('set_effect', ({ effect, speed }) => {
    state.effect = effect;
    if (speed !== undefined) state.speed = speed;
    io.emit('effect_update', { effect, speed: state.speed });
  });

  socket.on('stop_effect', () => {
    state.effect = null;
    io.emit('effect_stop');
  });

  socket.on('flash', () => {
    io.emit('flash');
  });

  socket.on('set_brightness', ({ value }) => {
    state.brightness = value;
    io.emit('brightness_update', { value });
  });

  socket.on('disconnect', () => {
    const wasViewer = viewers.has(socket.id);
    viewers.delete(socket.id);
    if (wasViewer) broadcastViewerCount();
  });
});

app.get('/health', (_req, res) => res.json({ ok: true }));

server.listen(PORT, () => {
  console.log(`Euronight Light server running on port ${PORT}`);
});
