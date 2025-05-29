const express = require('express');
const ytdl    = require('@distube/ytdl-core');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

// 1) Serve everything in `public/` at the site root:
app.use(express.static(path.join(__dirname, 'public')));

// 2) /stream endpoint: proxy YouTube → MP4
app.get('/stream', async (req, res) => {
  const videoURL = req.query.url;
  if (!videoURL || !ytdl.validateURL(videoURL)) {
    return res.status(400).send('Invalid or missing `url`');
  }

  let info, format;
  try {
    info   = await ytdl.getInfo(videoURL);
    format = ytdl.chooseFormat(info.formats, {
      quality: 'highest',
      filter: f => f.container === 'mp4' && f.hasAudio && f.hasVideo
    });
    if (!format || !format.url) {
      return res.status(404).send('No suitable MP4 format found');
    }
  } catch (err) {
    console.error('❌ getInfo error:', err);
    return res.status(500).send('Error fetching video info');
  }

  res.setHeader('Content-Type', 'video/mp4');
  ytdl
    .downloadFromInfo(info, { format, highWaterMark: 1 << 25 })
    .on('error', err => {
      console.error('❌ Stream error:', err);
      if (!res.headersSent) res.status(500).end('Stream error');
      else res.end();
    })
    .pipe(res);
});

// 3) SPA fallback: any other GET → public/index.html
//    (use app.use so it doesn’t run through path-to-regexp)
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 4) Listen on all interfaces
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server listening on http://0.0.0.0:${PORT}`);
});
