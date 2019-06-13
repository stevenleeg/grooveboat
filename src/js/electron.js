const {app, BrowserWindow} = require('electron');
const IPFSFactory = require('ipfsd-ctl');
const path = require('path');
const os = require('os');
const fs = require('fs');

////
// Boot up an IPFS node
//

let ipfsd;
const repoPath = path.join(os.homedir(), '.grooveboat');

const onSpawn = (err, instance) => {
  if (err) throw err;

  console.log('ipfs daemon spawned...')
  ipfsd = instance;

  if (fs.existsSync(repoPath)) {
    ipfsd.start(onStart);
  } else {
    ipfsd.init({directory: repoPath}, onInit);
  }
};

const onInit = (err) => {
  if (err) throw err;
  console.log('ipfs repo initialized...');
  ipfsd.start(onStart);
};

const onStart = (err) => {
  console.log('ipfs started');
  global.ipfs = ipfsd.api;
  createWindow();
};



////
// Setup our main window
//
let mainWindow;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    titleBarStyle: 'hidden',
    webPreferences: {
      nodeIntegration: true,
    },
    width: 900,
    height: 680,
  });

  mainWindow.loadURL('http://localhost:1234');
  mainWindow.on('closed', () => mainWindow = null);
};

app.on('ready', () => {
  IPFSFactory
    .create()
    .spawn({repoPath, disposable: false}, onSpawn);
});

app.on('window-all-closed', () => {
  console.log('shutting down ipfs node...');
  ipfsd.stop(() => {
    console.log('done. bye bye!');
    app.quit();
  });
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
