const {app, BrowserWindow, Menu} = require('electron');
const IPFSFactory = require('ipfsd-ctl');
const path = require('path');
const os = require('os');
const fs = require('fs-extra');
const uuid = require('uuid/v1');
const {promisify} = require('util');

////
// Boot up an IPFS node
//

let ipfsd;
let retried = false;
const repoPath = path.join(os.homedir(), '.grooveboat');

const bootIPFS = async () => {
  const factory = IPFSFactory.create()

  const callSpawn = promisify(factory.spawn.bind(factory));
  const ipfsd = await callSpawn({repoPath, disposable: false});
  global.ipfsd = ipfsd;

  // Promisify some things
  const callInit = promisify(ipfsd.init.bind(ipfsd));
  const callStart = promisify(ipfsd.start.bind(ipfsd));
  const callStop = promisify(ipfsd.stop.bind(ipfsd));

  // Init and boot the IPFS node
  if (!fs.existsSync(repoPath)) {
    await callInit();
  }
  await callStart();

  global.ipfs = ipfsd.api;

  // Make sure our node is actually runnung
  let addresses;
  try {
    addresses = await ipfsd.api.id();
  } catch (e) {
    if (e.errno !== 'ECONNREFUSED') {
      console.log('ipfs error:', e);
      process.exit(1);
    }

    // Let's try reiniting our ipfs repository
    await promisify(fs.remove)(repoPath);
    bootIPFS();
    return;
  }

  console.log('ipfs node is running');
};

const onQuit = async () => {
  const callStop = promisify(global.ipfsd.stop.bind(global.ipfsd));
  await callStop();
  console.log('ipfsd stopped!');
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

app.on('ready', async () => {
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

  await bootIPFS();
  createWindow();
});

app.on('window-all-closed', onQuit);

app.on('activate', () => {
  if (windows.length === 0) {
    createWindow();
  }
});
