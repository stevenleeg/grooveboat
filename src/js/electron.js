const {app, BrowserWindow, Menu} = require('electron');
const IPFSFactory = require('ipfsd-ctl');
const path = require('path');
const os = require('os');
const fs = require('fs');
const uuid = require('uuid/v1');

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
  if (err) throw err;

  global.ipfs = ipfsd.api;

  ipfsd.api.id((err, id) => {
    console.log(err, id);
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
    additionals.partition = uuid();
    console.log('starting new partition', uuid());
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

  window.toggleDevTools();

  windows.push(window);
};

app.on('ready', () => {
  const template = [
    {
      label: 'grooveboat',
      submenu: [
        {role: 'about'},
        {type: 'separator'},
        {label: 'New Window', click: createWindow},
        {role: 'services', submenu: []},
        {role: 'hideothers'},
        {role: 'unhide'},
        {type: 'separator'},
        {role: 'quit'},
      ],
    },
    {
      label: 'Edit',
      submenu: [
        {role: 'undo'},
        {role: 'redo'},
        {type: 'separator'},
        {role: 'cut'},
        {role: 'copy'},
        {role: 'paste'},
        {role: 'delete'},
        {role: 'selectall'},
      ],
    },
  ];
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  IPFSFactory
    .create()
    .spawn({repoPath, disposable: false}, onSpawn);
});

app.on('window-all-closed', onQuit);
process.on('SIGINT', onQuit);

app.on('activate', () => {
  if (windows.length === 0) {
    createWindow();
  }
});
