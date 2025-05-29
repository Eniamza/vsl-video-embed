// server.js
const express = require('express');
const cors    = require('cors');
const ytdl    = require('@distube/ytdl-core');

const app  = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all origins
app.use(cors());

app.get('/stream', async (req, res) => {
  const videoURL = req.query.url;
  if (!videoURL || !ytdl.validateURL(videoURL)) {
    return res.status(400).send('Invalid or missing `url` parameter');
  }

  try {
    // Fetch and decipher info
    const info = await ytdl.getInfo(videoURL);
    // Pick best MP4 with audio+video
    const format = ytdl.chooseFormat(info.formats, {
      quality: 'highest',
      filter: f => f.container === 'mp4' && f.hasAudio && f.hasVideo
    });
    if (!format || !format.url) {
      return res.status(404).send('No suitable format found');
    }

    res.setHeader('Content-Type', 'video/mp4');
    // Stream the video
    ytdl.downloadFromInfo(info, { format })
        .on('error', err => {
          console.error('Stream error:', err);
          if (!res.headersSent) res.status(500).end('Stream error');
        })
        .pipe(res);

  } catch (err) {
    console.error('ytdl getInfo error:', err);
    res.status(500).send(
      err.message.includes('Could not extract functions')
        ? 'YouTube format changed: update @distube/ytdl-core'
        : 'Server error fetching video'
    );
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server listening on http://0.0.0.0:${PORT}`);
});