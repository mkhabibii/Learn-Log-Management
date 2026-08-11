const fs = require('fs')
const path = require('path')

const logFile = path.join(__dirname, 'logs', 'app.log')
const stateFile = path.join(__dirname, "collector-state.json")
const centralDir = path.join(__dirname, "central")
const centralFile = path.join(centralDir, "logs.json")

if (!fs.existsSync(centralDir)) {
  fs.mkdirSync(centralDir)
}

function readState() {
  if (!fs.existsSync(stateFile)) {
    return { lastline: 0};
  }

  const raw = fs.readFileSync(stateFile, "utf-8");
  return JSON.parse(raw);
}

function saveState(state) {
  fs.writeFileSync(stateFile, JSON.stringify(state));
}

function readCentralLogs(){
  if (!fs.existsSync(centralFile)) {
    return [];
  }
  const raw = fs.readFileSync(centralFile, "utf-8");
  return JSON.parse(raw);
}

function collect() {
  const state = readState();

  const raw = fs.readFileSync(logFile, "utf-8");
  const allLines = raw.split("\n").filter(line => line.trim() !== "");

  const newLines = allLines.slice(state.lastline);

  if (newLines.length === 0) {
    console.log("Tidak ada log baru");
    return;
  }

  const newEntries = newLines.map(line => JSON.parse(line));

  const centralLogs = readCentralLogs();
  const updateLogs = centralLogs.concat(newEntries);

  fs.writeFileSync(centralFile, JSON.stringify(updateLogs, null, 2));

  state.lastline = allLines.length;
  saveState(state);

  console.log(`${newEntries.length} Log baru dikirim ke central`);
}

collect()