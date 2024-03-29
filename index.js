import http from 'http';
import cors from 'cors';
import express, { json } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import directoryTree from 'directory-tree';
import { validateArray, validateInt, validateJson, validateJsonShape, validateParams, validateStringIn } from './validators.js';
import { validatePath } from './customValidators.js';

const fileSystemFolder = 'fs';
const trashFolder = 'fstrash';

try {
  fs.mkdirSync(fileSystemFolder);
} catch (e) {
  // nada
}

try {
  fs.mkdirSync(trashFolder);
} catch (e) {
  // nada
}

function normalizedDirtree() {
  const cb = (item, path) => {
    item.path = path.substr(fileSystemFolder.length);
  };

  return directoryTree(fileSystemFolder, { normalizePath: true }, cb, cb);
}

let dirtree = normalizedDirtree();

const app = express();
const port = 8081;

app.set('port', port);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());

app.get('/', (req, res) => {
  res.send('hi');
});

app.get('/note/(*)', (req, res) => {
  const params = validateParams({ path: req.params['0'] }, {
    path: validatePath(dirtree),
  });

  if (!params) {
    res.sendStatus(400);
    return;
  }

  fs.readFile(path.join(fileSystemFolder, params.path), 'utf8', (err, data) => {
    if (err) {
      res.sendStatus(500);
      throw err;
    }

    res.status(200).json(data.split('\t').filter(d => d));
  });
});

app.post('/note/draw', (req, res) => {
  const params = validateParams(req.body, {
    path: validatePath(dirtree),
    data: validateJson
  });

  if (!params) {
    res.sendStatus(400);
    return;
  }

  fs.appendFile(path.join(fileSystemFolder, params.path), `${JSON.stringify(params.data)}\t`, 'utf8', (err) => {
    if (err) {
      res.sendStatus(500);
      throw err;
    }
  
    res.sendStatus(200);
  })
});

app.post('/note/move', (req, res) => {
  const params = validateParams(req.body, {
    path: validatePath(dirtree),
    toMove: validateArray('int'),
    offset: validateJsonShape({ x: 'float', y: 'float' })
  });

  if (!params) {
    res.sendStatus(400);
    return;
  }

  fs.readFile(path.join(fileSystemFolder, params.path), 'utf8', (err, data) => {
    if (err) {
      res.sendStatus(500);
      throw err;
    }

    const arr = data.split('\t');

    params.toMove.forEach((i) => {
      const stroke = JSON.parse(arr[i]);
      stroke.points.forEach((pt) => {
        pt.x += params.offset.x,
        pt.y += params.offset.y
      });
      arr[i] = JSON.stringify(stroke);
    })

    fs.writeFile(path.join(fileSystemFolder, params.path), arr.join('\t'), 'utf8', (err) => {
      if (err) {
        res.sendStatus(500);
        throw err;
      }

      res.sendStatus(200);
    });
  });
});

app.post('/note/erase', (req, res) => {
  const params = validateParams(req.body, {
    path: validatePath(dirtree),
    toErase: validateArray('int')
  });

  if (!params) {
    res.sendStatus(400);
    return;
  }

  fs.readFile(path.join(fileSystemFolder, params.path), 'utf8', (err, data) => {
    if (err) {
      res.sendStatus(500);
      throw err;
    }

    const arr = data.split('\t');

    params.toErase.sort((a, b) => b - a).forEach(i => arr.splice(i, 1));

    fs.writeFile(path.join(fileSystemFolder, params.path), arr.join('\t'), 'utf8', (err) => {
      if (err) {
        res.sendStatus(500);
        throw err;
      }

      res.sendStatus(200);
    });
  });
});

app.get('/fs', (req, res) => {
  res.status(201).json(dirtree);
});

app.delete('/fs/(*)', (req, res) => {
  const params = validateParams({ path: req.params['0'] }, {
    path: validatePath(dirtree),
  });

  if (!params) {
    res.sendStatus(400);
    return;
  }
  
  fs.rename(path.join(fileSystemFolder, params.path), path.join(trashFolder, params.path), (err) => {
    if (err) {
      throw err;
    }

    res.status(200).json(dirtree = normalizedDirtree());
  });
});

app.post('/fs', (req, res) => {
  const params = validateParams(req.body, {
    path: validatePath(dirtree),
    name: 'string',
    type: validateStringIn(['file', 'folder'])
  });

  if (!params) {
    res.sendStatus(400);
    return;
  }

  if (params.type === 'folder') {
    fs.mkdir(path.join(fileSystemFolder, params.path, params.name), (err) => {
      if (err) {
        res.sendStatus(500);
        throw err;
      }
  
      dirtree = normalizedDirtree();
      res.status(201).json(dirtree);
    })
  } else {
    fs.appendFile(path.join(fileSystemFolder, params.path, params.name), '', (err) => {
      if (err) {
        res.sendStatus(500);
        throw err;
      }
  
      dirtree = normalizedDirtree();
      res.status(201).json(dirtree);
    });
  }
});

const server = http.createServer(app);

server.listen(port, async () => {
  console.log(`server started on port ${port} n___n`);
});

server.on('error', (error) => {
  if (error.syscall !== 'listen')
  {
    throw error;
  }
  
  var bind = typeof port === 'string'
  ? 'Pipe ' + port
  : 'Port ' + port;
  
  // handle specific listen errors with friendly messages
  switch (error.code)
  {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
});