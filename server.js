const express = require('express');

const app = express();
app.use(express.json());

const PORT = 3000;

// Nyimpen log sementara di memori
let logs = [];
let nextId = 1;

// Endpoint untuk nambah log
app.post('/logs', (req, res) => {
  const { level, service, event, message } = req.body;

  const newLog = {
    id: nextId,
    timestamp: new Date().toISOString(),
    level,
    service,
    event,
    message
  }

  logs.push(newLog);
  nextId++;

  res.status(201).json(newLog);         
})


app.get('/logs', (req, res) => {
  res.json(logs);
})


app.get("/logs/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const foundLog = logs.find(log => log.id === id);

  if(!foundLog) {
    return res.status(404).json({ error: "Log not found" });
  }

  res.json(foundLog);
})


app.listen(PORT, () => {
  console.log(`Log API jalan di http://localhost:${PORT}`);
})

