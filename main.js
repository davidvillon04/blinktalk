const { app, BrowserWindow } = require("electron");
const path = require("path");
const { spawn } = require("child_process");

let mainWindow;
let flaskProcess;

function createWindow() {
   mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
         nodeIntegration: false, // if you don't need Node APIs in your frontend
         contextIsolation: true, // recommended for security
      },
   });

   // Load your Flask app's URL
   mainWindow.loadURL("http://localhost:5000");

   mainWindow.on("closed", () => {
      mainWindow = null;
      // Optionally kill the Flask process when the window is closed.
      if (flaskProcess) {
         flaskProcess.kill();
      }
   });
}

// Start the Flask server as a child process
function startFlask() {
   // Make sure you set FLASK_APP=app.py (or your main Flask file)
   // and any other environment variables needed.
   flaskProcess = spawn("flask", ["run"], {
      cwd: __dirname, // your project root
      shell: true,
      env: Object.assign({}, process.env, { FLASK_APP: "backend/app.py" }),
   });

   flaskProcess.stdout.on("data", (data) => {
      console.log(`Flask: ${data}`);
   });

   flaskProcess.stderr.on("data", (data) => {
      console.error(`Flask error: ${data}`);
   });
}

app.on("ready", () => {
   startFlask();
   createWindow();
});

app.on("window-all-closed", () => {
   // On macOS it's common for apps to stay open until the user quits explicitly
   if (process.platform !== "darwin") {
      app.quit();
   }
});

app.on("activate", () => {
   if (mainWindow === null) {
      createWindow();
   }
});
