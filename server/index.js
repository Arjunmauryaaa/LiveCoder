const express = require("express");
const app = express();
const http = require("http");
const { Server } = require("socket.io");
const ACTIONS = require("./Actions");
const cors = require("cors");
const axios = require("axios");
const server = http.createServer(app);
require("dotenv").config();
const fs = require('fs');
const path = require('path');
let LEETCODE_QUESTIONS = [];
try {
  LEETCODE_QUESTIONS = JSON.parse(fs.readFileSync(path.join(__dirname, 'leetcode_questions.json'), 'utf-8'));
} catch (e) {
  console.error('Failed to load leetcode_questions.json', e);
  LEETCODE_QUESTIONS = [];
}

const languageConfig = {
  python3: { versionIndex: "3" },
  java: { versionIndex: "3" },
  cpp: { versionIndex: "4" },
  nodejs: { versionIndex: "3" },
  c: { versionIndex: "4" },
  ruby: { versionIndex: "3" },
  go: { versionIndex: "3" },
  scala: { versionIndex: "3" },
  bash: { versionIndex: "3" },
  sql: { versionIndex: "3" },
  pascal: { versionIndex: "2" },
  csharp: { versionIndex: "3" },
  php: { versionIndex: "3" },
  swift: { versionIndex: "3" },
  rust: { versionIndex: "3" },
  r: { versionIndex: "3" },
};

// --- Question Bank ---
const JAVA_TEMPLATE = "public class Main {\n    public static void main(String[] args) {\n        System.out.println(\"Welcome to LiveCoder\");\n    }\n}";

// --- Timer Management ---
const ROOM_TIMERS = {}; // { roomId: { interval, timeLeft } }
const QUESTION_TIME = 300; // 5 minutes in seconds
const USER_TIMERS = {}; // { roomId: { username: { interval, timeLeft } } }

// --- Room State Management ---
// Now track per-user progress
const ROOM_STATES = {}; // { roomId: { userProgress: { [username]: { index, score, submissions } }, questions } }

// Debug logging function
function debugLog(message, data = null) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] DEBUG: ${message}`, data ? JSON.stringify(data, null, 2) : '');
}

function startRoomTimer(roomId) {
  debugLog(`Starting room timer for room ${roomId}`);
  if (ROOM_TIMERS[roomId]) {
    debugLog(`Clearing existing room timer for room ${roomId}`);
    clearInterval(ROOM_TIMERS[roomId].interval);
  }
  ROOM_TIMERS[roomId] = { timeLeft: QUESTION_TIME };
  ROOM_TIMERS[roomId].interval = setInterval(() => {
    ROOM_TIMERS[roomId].timeLeft--;
    debugLog(`Room ${roomId} timer: ${ROOM_TIMERS[roomId].timeLeft}s left`);
    io.to(roomId).emit("timer", ROOM_TIMERS[roomId].timeLeft);
    if (ROOM_TIMERS[roomId].timeLeft <= 0) {
      debugLog(`Room ${roomId} timer expired`);
      clearInterval(ROOM_TIMERS[roomId].interval);
      delete ROOM_TIMERS[roomId];
      handleTimeUp(roomId);
    }
  }, 1000);
}

// Handle time up for a room
async function handleTimeUp(roomId) {
  debugLog(`Handling time up for room ${roomId}`);
  const roomState = ROOM_STATES[roomId];
  if (!roomState || !roomState.challengeActive) {
    debugLog(`No active challenge for room ${roomId}`);
    return;
  }

  // Collect all submissions
  const submissions = roomState.submissions || {};
  const currentQuestion = roomState.questions[roomState.currentQuestionIndex];
  
  if (currentQuestion) {
    debugLog(`Evaluating submissions for question: ${currentQuestion.title}`);
    // Evaluate submissions and assign scores
    const results = await evaluateSubmissions(submissions, currentQuestion);
    
    // Update scores
    Object.keys(results).forEach(username => {
      if (!roomState.scores[username]) {
        roomState.scores[username] = 0;
      }
      roomState.scores[username] += results[username];
    });

    // Emit results to all clients
    io.to(roomId).emit("question_results", {
      question: currentQuestion,
      results: results,
      scores: roomState.scores
    });
  }

  // Move to next question or end challenge
  roomState.currentQuestionIndex++;
  
  if (roomState.currentQuestionIndex < roomState.questions.length) {
    debugLog(`Moving to next question ${roomState.currentQuestionIndex + 1} for room ${roomId}`);
    // More questions available
    const nextQuestion = roomState.questions[roomState.currentQuestionIndex];
    roomState.submissions = {}; // Reset submissions for next question
    
    io.to(roomId).emit("next_question", nextQuestion);
    startRoomTimer(roomId);
  } else {
    debugLog(`Challenge ended for room ${roomId}`);
    // Challenge ended, show leaderboard
    roomState.challengeActive = false;
    const leaderboard = Object.entries(roomState.scores)
      .sort(([,a], [,b]) => b - a)
      .map(([username, score], index) => ({
        rank: index + 1,
        username,
        score
      }));
    
    io.to(roomId).emit("challenge_ended", {
      leaderboard,
      finalScores: roomState.scores
    });
  }
}

// Evaluate submissions and assign scores (1-10 points)
async function evaluateSubmissions(submissions, question) {
  const results = {};
  
  for (const [username, submission] of Object.entries(submissions)) {
    try {
      // Simple evaluation based on code quality and correctness
      let score = 0;
      
      // Basic checks
      if (submission.code && submission.code.length > 10) {
        score += 2; // Basic code structure
      }
      
      if (submission.code.includes("public class") || submission.code.includes("public static")) {
        score += 2; // Proper Java structure
      }
      
      if (submission.code.includes("System.out.println")) {
        score += 1; // Has output
      }
      
      // Check for common patterns based on question type
      if (question.title.toLowerCase().includes("array")) {
        if (submission.code.includes("[]") || submission.code.includes("array")) {
          score += 2;
        }
      }
      
      if (question.title.toLowerCase().includes("sum")) {
        if (submission.code.includes("+") || submission.code.includes("sum")) {
          score += 2;
        }
      }
      
      if (question.title.toLowerCase().includes("reverse")) {
        if (submission.code.includes("reverse") || submission.code.includes("for") || submission.code.includes("while")) {
          score += 2;
        }
      }
      
      // Bonus for more complex logic
      if (submission.code.includes("for") || submission.code.includes("while")) {
        score += 1;
      }
      
      if (submission.code.includes("if") || submission.code.includes("else")) {
        score += 1;
      }
      
      // Cap at 10 points
      results[username] = Math.min(score, 10);
      
    } catch (error) {
      console.error(`Error evaluating submission for ${username}:`, error);
      results[username] = 0;
    }
  }
  
  return results;
}

// Helper to start a timer for a user
function startUserTimer(roomId, username, socketId, onTimeout) {
  debugLog(`Starting user timer for ${username} in room ${roomId}, socket ${socketId}`);
  if (!USER_TIMERS[roomId]) USER_TIMERS[roomId] = {};
  // Clear any existing timer for this user
  if (USER_TIMERS[roomId][username] && USER_TIMERS[roomId][username].interval) {
    debugLog(`Clearing existing timer for ${username} in room ${roomId}`);
    clearInterval(USER_TIMERS[roomId][username].interval);
  }
  USER_TIMERS[roomId][username] = { timeLeft: QUESTION_TIME };
  USER_TIMERS[roomId][username].interval = setInterval(() => {
    USER_TIMERS[roomId][username].timeLeft--;
    debugLog(`User ${username} timer: ${USER_TIMERS[roomId][username].timeLeft}s left`);
    io.to(socketId).emit("timer", USER_TIMERS[roomId][username].timeLeft);
    if (USER_TIMERS[roomId][username].timeLeft <= 0) {
      debugLog(`User ${username} timer expired`);
      clearInterval(USER_TIMERS[roomId][username].interval);
      delete USER_TIMERS[roomId][username];
      onTimeout();
    }
  }, 1000);
}

// CORS configuration for production
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://your-frontend-domain.vercel.app', // Replace with your actual Vercel domain
    /\.vercel\.app$/, // Allow all Vercel subdomains
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json());

const io = new Server(server, {
  cors: {
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://your-frontend-domain.vercel.app', // Replace with your actual Vercel domain
      /\.vercel\.app$/, // Allow all Vercel subdomains
    ],
    methods: ["GET", "POST"],
    credentials: true
  },
});

const userSocketMap = {};
const getAllConnectedClients = (roomId) => {
  return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map(
    (socketId) => {
      return {
        socketId,
        username: userSocketMap[socketId],
      };
    }
  );
};

const ROOM_ADMINS = {}; // { roomId: socketId }
const ROOM_LOBBY = {}; // { roomId: true/false }

function shuffleArray(array) {
  // Fisher-Yates shuffle
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

io.on("connection", (socket) => {
  // console.log('Socket connected', socket.id);
  socket.on(ACTIONS.JOIN, ({ roomId, username }) => {
    userSocketMap[socket.id] = username;
    socket.join(roomId);
    const clients = getAllConnectedClients(roomId);
    // If this is the first user in the room, make them admin and set lobby state
    if (clients.length === 1) {
      ROOM_ADMINS[roomId] = socket.id;
      ROOM_LOBBY[roomId] = true;
      // Initialize room state
      ROOM_STATES[roomId] = {
        userProgress: {}, // { username: { index, score, submissions } }
        questions: [],
      };
    } else if (ROOM_ADMINS[roomId] === undefined && ROOM_LOBBY[roomId] === undefined) {
      // If not the first user and room does not exist, emit error
      socket.emit('error', { message: 'Invalid Room ID' });
      return;
    }
    
    // If challenge already started, send current question and timer to the new user
    const roomState = ROOM_STATES[roomId];
    if (roomState && roomState.challengeActive && roomState.questions.length > 0) {
      const currentQuestion = roomState.questions[roomState.currentQuestionIndex];
      if (currentQuestion) {
        socket.emit("question", currentQuestion);
      }
      if (ROOM_TIMERS[roomId]) {
        socket.emit("timer", ROOM_TIMERS[roomId].timeLeft);
      }
    }
    
    // Notify all clients of the current lobby state and admin
    io.to(roomId).emit("lobby_state", {
      adminSocketId: ROOM_ADMINS[roomId],
      clients,
      lobby: ROOM_LOBBY[roomId] || false
    });
    // notify that new user join
    clients.forEach(({ socketId }) => {
      io.to(socketId).emit(ACTIONS.JOINED, {
        clients,
        username,
        socketId: socket.id,
      });
    });
  });

  // Listen for start challenge from admin
  socket.on(ACTIONS.START_CHALLENGE, ({ roomId, topic, difficulty }) => {
    debugLog(`Admin starting challenge for room ${roomId} with topic: ${topic}, difficulty: ${difficulty}`);
    // Mark lobby as closed
    ROOM_LOBBY[roomId] = false;
    
    // Initialize room state
    if (!ROOM_STATES[roomId]) {
      ROOM_STATES[roomId] = {
        userProgress: {},
        questions: [],
      };
    }
    
    const roomState = ROOM_STATES[roomId];
    // Filter questions by topic and difficulty
    let filteredQuestions = LEETCODE_QUESTIONS.filter(q =>
      q.topic && q.topic.toLowerCase() === topic.toLowerCase() &&
      q.difficulty && q.difficulty.toLowerCase() === difficulty.toLowerCase()
    );
    
    if (filteredQuestions.length === 0) {
      // Fallback to any questions with the topic
      filteredQuestions = LEETCODE_QUESTIONS.filter(q =>
        q.topic && q.topic.toLowerCase() === topic.toLowerCase()
      );
    }
    
    if (filteredQuestions.length === 0) {
      debugLog(`No questions found for topic: ${topic}, difficulty: ${difficulty}`);
      // No questions found, emit error
      io.to(roomId).emit("challenge_error", { message: "No questions found for the selected topic and difficulty." });
      return;
    }
    
    roomState.questions = filteredQuestions;
    debugLog(`Found ${filteredQuestions.length} questions for room ${roomId}`);
    
    // Initialize user progress for all users in the room
    const clients = getAllConnectedClients(roomId);
    debugLog(`Initializing progress for ${clients.length} clients in room ${roomId}`);
    clients.forEach(({ username }) => {
      roomState.userProgress[username] = { index: 0, score: 0, submissions: [], done: false };
    });
    
    // Notify all clients lobby is closed
    io.to(roomId).emit("lobby_state", {
      adminSocketId: ROOM_ADMINS[roomId],
      clients,
      lobby: false
    });
    
    // Send first question to each user
    clients.forEach(({ socketId, username }) => {
      const firstQ = roomState.questions[0];
      if (firstQ) {
        debugLog(`Sending first question to ${username} in room ${roomId}`);
        io.to(socketId).emit("question", firstQ);
        startUserTimer(roomId, username, socketId, () => {
          // Auto-submit (or mark as unattempted) and move to next question for this user
          debugLog(`User ${username} timeout callback triggered`);
          handleUserTimeout(roomId, username, socketId);
        });
      }
    });
  });

  // Handle code submissions
  socket.on(ACTIONS.SUBMIT_CODE, ({ roomId, code, language }) => {
    const username = userSocketMap[socket.id];
    debugLog(`User ${username} submitting code for room ${roomId}`);
    const roomState = ROOM_STATES[roomId];
    if (!roomState || !roomState.userProgress[username]) {
      debugLog(`No room state or user progress for ${username} in room ${roomId}`);
      return;
    }
    const userProg = roomState.userProgress[username];
    const qIndex = userProg.index;
    const question = roomState.questions[qIndex];
    if (!question) {
      debugLog(`No question found at index ${qIndex} for user ${username}`);
      return;
    }
    // Store submission
    userProg.submissions.push({ code, language, timestamp: Date.now(), questionTitle: question.title });
    // Score: 0 if code matches template, else normal scoring
    let score = 0;
    const template = (question.javaTemplate || "").trim();
    if (code.trim() !== template) {
      if (code && code.length > 10) score += 2;
      if (code.includes("public class") || code.includes("public static")) score += 2;
      if (code.includes("System.out.println")) score += 1;
      if (question.title.toLowerCase().includes("array")) {
        if (code.includes("[]") || code.includes("array")) score += 2;
      }
      if (question.title.toLowerCase().includes("sum")) {
        if (code.includes("+") || code.includes("sum")) score += 2;
      }
      if (question.title.toLowerCase().includes("reverse")) {
        if (code.includes("reverse") || code.includes("for") || code.includes("while")) score += 2;
      }
      if (code.includes("for") || code.includes("while")) score += 1;
      if (code.includes("if") || code.includes("else")) score += 1;
      score = Math.min(score, 10);
    } // else score remains 0
    userProg.score += score;
    debugLog(`User ${username} scored ${score} points, total: ${userProg.score}`);
    // Send result to user
    io.to(socket.id).emit("question_results", {
      question,
      results: { [username]: score },
      scores: { [username]: userProg.score }
    });
    // Move to next question for this user
    userProg.index++;
    if (userProg.index < roomState.questions.length) {
      debugLog(`Moving user ${username} to question ${userProg.index + 1}`);
      // Always clear the old timer before starting a new one
      if (USER_TIMERS[roomId] && USER_TIMERS[roomId][username]) {
        debugLog(`Clearing timer for ${username} before next question`);
        clearInterval(USER_TIMERS[roomId][username].interval);
        delete USER_TIMERS[roomId][username];
      }
      const nextQ = roomState.questions[userProg.index];
      io.to(socket.id).emit("next_question", nextQ);
      startUserTimer(roomId, username, socket.id, () => {
        debugLog(`User ${username} timeout callback triggered for next question`);
        handleUserTimeout(roomId, username, socket.id);
      });
    } else {
      debugLog(`User ${username} completed all questions`);
      // Mark user as done
      userProg.done = true;
      let finalScore = userProg.score;
      if (!userProg.submissions || userProg.submissions.length === 0) {
        finalScore = 0;
        userProg.score = 0;
      }
      // Check if all users are done
      const allDone = Object.values(roomState.userProgress).every(u => u.done);
      debugLog(`All users done: ${allDone}`);
      if (allDone) {
        debugLog(`Building leaderboard for room ${roomId}`);
        // Build leaderboard for all users
        const leaderboardArr = Object.entries(roomState.userProgress)
          .map(([username, prog]) => ({ username, score: prog.score }))
          .sort((a, b) => b.score - a.score)
          .map((entry, idx) => ({ ...entry, rank: idx + 1 }));
        const finalScores = {};
        leaderboardArr.forEach(entry => { finalScores[entry.username] = entry.score; });
        io.to(roomId).emit("challenge_ended", {
          leaderboard: leaderboardArr,
          finalScores
        });
      } else {
        // Only show personal result to this user
        io.to(socket.id).emit("challenge_ended", {
          leaderboard: [
            { rank: 1, username, score: finalScore }
          ],
          finalScores: { [username]: finalScore }
        });
      }
    }
  });

  // sync the code
  socket.on(ACTIONS.CODE_CHANGE, ({ roomId, code }) => {
    socket.in(roomId).emit(ACTIONS.CODE_CHANGE, { code });
  });
  // when new user join the room all the code which are there are also shows on that persons editor
  socket.on(ACTIONS.SYNC_CODE, ({ socketId, code }) => {
    io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code });
  });

  // leave room
  socket.on("disconnecting", () => {
    const username = userSocketMap[socket.id];
    debugLog(`User ${username} (socket ${socket.id}) is disconnecting`);
    const rooms = [...socket.rooms];
    // leave all the room
    rooms.forEach((roomId) => {
      debugLog(`User ${username} leaving room ${roomId}`);
      socket.in(roomId).emit(ACTIONS.DISCONNECTED, {
        socketId: socket.id,
        username: userSocketMap[socket.id],
      });
      // If admin leaves, assign new admin if possible
      if (ROOM_ADMINS[roomId] === socket.id) {
        debugLog(`Admin ${username} leaving room ${roomId}, reassigning admin`);
        const clients = getAllConnectedClients(roomId).filter(c => c.socketId !== socket.id);
        if (clients.length > 0) {
          ROOM_ADMINS[roomId] = clients[0].socketId;
          debugLog(`New admin assigned: ${clients[0].username} (${clients[0].socketId})`);
        } else {
          debugLog(`No clients left in room ${roomId}, cleaning up room state`);
          delete ROOM_ADMINS[roomId];
          delete ROOM_LOBBY[roomId];
          delete ROOM_STATES[roomId];
          if (ROOM_TIMERS[roomId]) {
            debugLog(`Clearing room timer for ${roomId}`);
            clearInterval(ROOM_TIMERS[roomId].interval);
            delete ROOM_TIMERS[roomId];
          }
          if (USER_TIMERS[roomId]) {
            debugLog(`Clearing user timers for room ${roomId}`);
            Object.values(USER_TIMERS[roomId]).forEach(timer => {
              if (timer.interval) clearInterval(timer.interval);
            });
            delete USER_TIMERS[roomId];
          }
        }
      } else {
        // Clear user timer if they were in a challenge
        if (USER_TIMERS[roomId] && USER_TIMERS[roomId][username]) {
          debugLog(`Clearing timer for disconnected user ${username} in room ${roomId}`);
          clearInterval(USER_TIMERS[roomId][username].interval);
          delete USER_TIMERS[roomId][username];
        }
      }
    });

    delete userSocketMap[socket.id];
    socket.leave();
  });

  socket.on('check_room', ({ roomId }, callback) => {
    const exists = ROOM_ADMINS[roomId] !== undefined;
    callback({ exists });
  });
});

app.post("/compile", async (req, res) => {
  const { code, language } = req.body;

  try {
    const response = await axios.post("https://api.jdoodle.com/v1/execute", {
      script: code,
      language: language,
      versionIndex: languageConfig[language].versionIndex,
      clientId: process.env.jDoodle_clientId,
      clientSecret: process.env.kDoodle_clientSecret,
    });
    res.json(response.data);
  } catch (error) {
    console.error(error);
    if (error.response && error.response.data) {
      res.status(500).json({ error: error.response.data.error || JSON.stringify(error.response.data) });
    } else {
      res.status(500).json({ error: error.message || "Failed to compile code" });
    }
  }
});

app.post("/submit", async (req, res) => {
  const { code, language, roomId, username } = req.body;
  const roomState = ROOM_STATES[roomId];
  if (!roomState || !roomState.challengeActive) {
    return res.status(400).json({ error: "No active challenge for this room." });
  }
  
  const currentQuestion = roomState.questions[roomState.currentQuestionIndex];
  if (!currentQuestion) {
    return res.status(400).json({ error: "No active question for this room." });
  }
  
  // Store submission
  roomState.submissions[username] = {
    code,
    language,
    timestamp: Date.now()
  };
  
  // Simple evaluation for immediate feedback
  let score = 0;
  if (code && code.length > 10) score += 2;
  if (code.includes("public class") || code.includes("public static")) score += 2;
  if (code.includes("System.out.println")) score += 1;
  
  res.json({ 
    message: "Code submitted successfully!", 
    score: Math.min(score, 10),
    questionNumber: roomState.currentQuestionIndex + 1,
    totalQuestions: roomState.questions.length
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));

// Add the handleUserTimeout function
function handleUserTimeout(roomId, username, socketId) {
  debugLog(`Handling timeout for user ${username} in room ${roomId}`);
  const roomState = ROOM_STATES[roomId];
  if (!roomState || !roomState.userProgress[username]) {
    debugLog(`No room state or user progress for ${username} in room ${roomId} during timeout`);
    return;
  }
  const userProg = roomState.userProgress[username];
  const qIndex = userProg.index;
  const question = roomState.questions[qIndex];
  if (!question) {
    debugLog(`No question found at index ${qIndex} for user ${username} during timeout`);
    return;
  }
  // If no submission for this question, push an empty submission (score will be 0)
  userProg.submissions.push({ code: "", language: "java", timestamp: Date.now(), questionTitle: question.title });
  // Score is 0 for timeout
  let score = 0;
  userProg.score += score;
  debugLog(`User ${username} timed out, scored 0, total: ${userProg.score}`);
  // Send result to user
  io.to(socketId).emit("question_results", {
    question,
    results: { [username]: score },
    scores: { [username]: userProg.score }
  });
  // Move to next question for this user
  userProg.index++;
  if (userProg.index < roomState.questions.length) {
    debugLog(`Moving user ${username} to next question ${userProg.index + 1} after timeout`);
    const nextQ = roomState.questions[userProg.index];
    io.to(socketId).emit("next_question", nextQ);
    startUserTimer(roomId, username, socketId, () => {
      debugLog(`User ${username} timeout callback triggered for next question after previous timeout`);
      handleUserTimeout(roomId, username, socketId);
    });
  } else {
    debugLog(`User ${username} completed all questions after timeout`);
    userProg.done = true;
    let finalScore = userProg.score;
    if (!userProg.submissions || userProg.submissions.length === 0) {
      finalScore = 0;
      userProg.score = 0;
    }
    // Check if all users are done
    const allDone = Object.values(roomState.userProgress).every(u => u.done);
    debugLog(`All users done after timeout: ${allDone}`);
    if (allDone) {
      debugLog(`Building leaderboard for room ${roomId} after timeout`);
      // Build leaderboard for all users
      const leaderboardArr = Object.entries(roomState.userProgress)
        .map(([username, prog]) => ({ username, score: prog.score }))
        .sort((a, b) => b.score - a.score)
        .map((entry, idx) => ({ ...entry, rank: idx + 1 }));
      const finalScores = {};
      leaderboardArr.forEach(entry => { finalScores[entry.username] = entry.score; });
      io.to(roomId).emit("challenge_ended", {
        leaderboard: leaderboardArr,
        finalScores
      });
    } else {
      // Only show personal result to this user
      io.to(socketId).emit("challenge_ended", {
        leaderboard: [
          { rank: 1, username, score: finalScore }
        ],
        finalScores: { [username]: finalScore }
      });
    }
  }
}
