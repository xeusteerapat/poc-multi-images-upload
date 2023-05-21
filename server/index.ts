import express, { Request, Response } from 'express';
import cors from 'cors';
import fs from 'fs';
import crypto from 'crypto';

const app = express();
app.use(express.raw({ type: 'application/octet-stream', limit: '100mb' }));
app.use(
  cors({
    origin: 'http://localhost:3000',
  })
);
app.use('/uploads', express.static('uploads'));

type UploadQuery = {
  name: string;
  currentChunkIndex: string;
  totalChunks: string;
};

app.post('/upload', (req: Request, res: Response) => {
  const { name, currentChunkIndex, totalChunks } = req.query as UploadQuery;
  const firstChunk = parseInt(currentChunkIndex) === 0;
  const lastChunk = parseInt(currentChunkIndex) === parseInt(totalChunks) - 1;

  const ext = name.split('.').pop();
  const data = req.body.toString().split(',')[1];
  const buffer = Buffer.from(data, 'base64');

  const tmpFilename =
    'tmp_' +
    crypto
      .createHash('md5')
      .update(name + req.ip)
      .digest('hex') +
    '.' +
    ext;

  if (firstChunk && fs.existsSync('./uploads/' + tmpFilename)) {
    fs.unlinkSync('./uploads/' + tmpFilename);
  }

  fs.appendFileSync('./uploads/' + tmpFilename, buffer);

  if (lastChunk) {
    const finalFilename =
      crypto.createHash('md5').update(Date.now().toString()).digest('hex') +
      '.' +
      ext;

    fs.renameSync('./uploads/' + tmpFilename, './uploads/' + finalFilename);

    res.json({ finalFilename });
  } else {
    res.json('ok');
  }
});

app.listen(5002, () => {
  console.log('Upload server 5002 🚀');
});
