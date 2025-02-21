const { app, BrowserWindow } = require("electron");
const path = require("path");
const { spawn } = require("child_process");
const fs = require("fs");

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
   mainWindow.loadURL("http://localhost:5000/login");

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
   const pythonExe = path.join(process.resourcesPath, "python", "python.exe");
   const appPyPath = path.join(process.resourcesPath, "app", "backend", "app.py");
   //            ^ note "app" in the path

   console.log("pythonExe:", pythonExe);
   console.log("appPyPath:", appPyPath);

   console.log("Exists pythonExe?", fs.existsSync(pythonExe));
   console.log("Exists appPyPath?", fs.existsSync(appPyPath));

   flaskProcess = spawn(pythonExe, [appPyPath], {
      cwd: path.join(process.resourcesPath, "app", "backend"),
      //                                ^ likewise here
      env: {
         ...process.env,
         FLASK_ENV: "development",
      },
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
