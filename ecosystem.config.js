module.exports = {
  apps: [
    // ==========================================
    // RAFT CLUSTER (Port 3001-3003)
    // ==========================================
    {
      name: "raft-1",
      script: "./dist/main.js",
      env: { PORT: 3001, APP_MODE: "raft", PEERS: "http://127.0.0.1:3002,http://127.0.0.1:3003" }
    },
    {
      name: "raft-2",
      script: "./dist/main.js",
      env: { PORT: 3002, APP_MODE: "raft", PEERS: "http://127.0.0.1:3001,http://127.0.0.1:3003" }
    },
    {
      name: "raft-3",
      script: "./dist/main.js",
      env: { PORT: 3003, APP_MODE: "raft", PEERS: "http://127.0.0.1:3001,http://127.0.0.1:3002" }
    },

    // ==========================================
    // PAXOS CLUSTER (Port 4001-4003)
    // ==========================================
    {
      name: "paxos-1",
      script: "./dist/main.js",
      env: { PORT: 4001, APP_MODE: "paxos", PEERS: "http://127.0.0.1:4002,http://127.0.0.1:4003" }
    },
    {
      name: "paxos-2",
      script: "./dist/main.js",
      env: { PORT: 4002, APP_MODE: "paxos", PEERS: "http://127.0.0.1:4001,http://127.0.0.1:4003" }
    },
    {
      name: "paxos-3",
      script: "./dist/main.js",
      env: { PORT: 4003, APP_MODE: "paxos", PEERS: "http://127.0.0.1:4001,http://127.0.0.1:4002" }
    },

    // ==========================================
    // LIBRARY APP (Port 5000)
    // ==========================================
    {
      name: "lib-app",
      script: "./dist/main.js",
      env: { PORT: 5000, APP_MODE: "lib" }
    }
  ]
};
