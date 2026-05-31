const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Add secure APIs here
});
