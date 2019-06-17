const {app, BrowserWindow, Menu} = require('electron');
const IPFSFactory = require('ipfsd-ctl');
const path = require('path');
const os = require('os');
const fs = require('fs-extra');
const uuid = require('uuid/v1');

////
// Boot up an IPFS node
//

let ipfsd;
let retried = false;
const repoPath = path.join(os.homedir(), '.grooveboat');

const spawnIPFS = () => {
  IPFSFactory
    .create()
    .spawn({repoPath, disposable: false}, onSpawn);
};

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
  if (err) throw err;

  global.ipfs = ipfsd.api;

  ipfsd.api.id((err, id) => {
    if (err && retried) {
      // Yikes, this is bad
      console.log('could not spawn ipfs after reinitializing repo. aborting!');
      process.exit(1);
    } else if (err) {
      // Corrupt repo, let's remove it and try again
      retried = true;
      fs.remove(repoPath, () => spawnIPFS());
    }
  });

  createWindow();
};

const onQuit = () => {
  console.log('shutting down ipfs node...');
  ipfsd.stop(() => {
    console.log('done. bye bye!');
    app.quit();
  });
};

////
// Setup our main window
//
const windows = [];

const createWindow = () => {
  const additionals = {};
  if (windows.length > 0) {
    additionals.partition = `persist:${windows.length}`;
  }

  const window = new BrowserWindow({
    titleBarStyle: 'hidden',
    webPreferences: {
      nodeIntegration: true,
      ...additionals,
    },
    width: 840,
    height: 590,
    minWidth: 600,
    minHeight: 590,
  });

  window.loadURL('http://localhost:1234');
  window.on('closed', () => {
    const index = windows.indexOf(window);
    if (index !== -1) {
      windows.splice(index, 1);
    }
  });

  windows.push(window);
};

app.on('ready', () => {
  const template = [
    ...(process.platform === 'darwin' ? [{
      label: app.getName(),
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        {label: 'New Window', click: createWindow},
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideothers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    }] : []),
    { role: 'fileMenu' },
    { role: 'editMenu' },
    { role: 'viewMenu' },
    { role: 'windowMenu' },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
  spawnIPFS();
});

app.on('window-all-closed', onQuit);

app.on('activate', () => {
  if (windows.length === 0) {
    createWindow();
  }
});
