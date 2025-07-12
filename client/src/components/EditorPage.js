import React, { useEffect, useRef, useState } from "react";
import Client from "./Client";
import Editor from "./Editor";
import { initSocket } from "../Socket";
import { ACTIONS } from "../Actions";
import {
  useNavigate,
  useLocation,
  Navigate,
  useParams,
} from "react-router-dom";
import { toast } from "react-hot-toast";
import axios from "axios";

// List of supported languages
const LANGUAGES = [
  "python3",
  "java"
];

// Add state for round type selection
const ROUND_TYPES = [
  "Aptitude + Logical + Verbal",
  "Coding Round",
  "Technical Interview"
];

const TOPICS = [
  "Arrays",
  "Strings",
  "Pattern Programs",
  "Sorting and Searching",
  "HashMap / HashSet / Frequency",
  "Recursion & Backtracking",
  "Linked List",
  "Stacks & Queues",
  "Trees",
  "Graphs",
  "Maths & Numbers"
];

const DIFFICULTIES = [
  { label: 'Easy', icon: '🟢', value: 'easy' },
  { label: 'Medium', icon: '🟡', value: 'medium' },
  { label: 'Hard', icon: '🔴', value: 'hard' },
];

function EditorPage() {
  const [clients, setClients] = useState([]);
  const [output, setOutput] = useState("");
  const [isCompileWindowOpen, setIsCompileWindowOpen] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("java");
  const [question, setQuestion] = useState(null);
  const [timer, setTimer] = useState(null);
  const [timeUp, setTimeUp] = useState(false);
  const [lobby, setLobby] = useState(false);
  const [adminSocketId, setAdminSocketId] = useState(null);
  const [clientsList, setClientsList] = useState([]);
  const codeRef = useRef(null);
  const [submitResult, setSubmitResult] = useState(null);
  const [initialCode, setInitialCode] = useState("");
  const [selectedRound, setSelectedRound] = useState(ROUND_TYPES[0]);
  const [selectedTopic, setSelectedTopic] = useState(TOPICS[0]);
  const [selectedDifficulty, setSelectedDifficulty] = useState(null);
  
  // New states for challenge system
  const [questionResults, setQuestionResults] = useState(null);
  const [currentScores, setCurrentScores] = useState({});
  const [leaderboard, setLeaderboard] = useState(null);
  const [challengeEnded, setChallengeEnded] = useState(false);
  const [questionNumber, setQuestionNumber] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);

  const Location = useLocation();
  const navigate = useNavigate();
  const { roomId } = useParams();

  const socketRef = useRef(null);

  useEffect(() => {
    const init = async () => {
      socketRef.current = await initSocket();
      socketRef.current.on("connect_error", (err) => handleErrors(err));
      socketRef.current.on("connect_failed", (err) => handleErrors(err));

      const handleErrors = (err) => {
        console.log("Error", err);
        toast.error("Socket connection failed, Try again later");
        navigate("/");
      };

      socketRef.current.emit(ACTIONS.JOIN, {
        roomId,
        username: Location.state?.username,
      });

      socketRef.current.on(
        ACTIONS.JOINED,
        ({ clients, username, socketId }) => {
          console.log(`[FRONTEND] User ${username} joined room ${roomId}`);
          if (username !== Location.state?.username) {
            toast.success(`${username} joined the room.`);
          }
          setClients(clients);
        }
      );

      socketRef.current.on(ACTIONS.DISCONNECTED, ({ socketId, username }) => {
        console.log(`[FRONTEND] User ${username} disconnected from room ${roomId}`);
        toast.success(`${username} left the room`);
        setClients((prev) => {
          return prev.filter((client) => client.socketId !== socketId);
        });
      });

      // Listen for question event
      socketRef.current.on("question", (question) => {
        console.log(`[FRONTEND] Received question: ${question.title}`);
        setQuestion(question);
        setTimeUp(false);
        setQuestionResults(null);
        setQuestionNumber(prev => prev + 1);
        // Set initial code template for the question
        const template = question.javaTemplate || question.functionSignature || "class Main {\n    public static void main(String[] args) {\n        System.out.println(\"Welcome to LiveCoder\");\n    }\n}";
        setInitialCode(template + "\n// Write your code below this line\n");
      });

      // Listen for timer event
      socketRef.current.on("timer", (timeLeft) => {
        console.log(`[FRONTEND] Timer update: ${timeLeft}s left`);
        setTimer(timeLeft);
      });

      // Listen for time_up event
      socketRef.current.on("time_up", () => {
        console.log(`[FRONTEND] Time up event received`);
        setTimeUp(true);
      });

      // Listen for question results
      socketRef.current.on("question_results", ({ question, results, scores }) => {
        console.log(`[FRONTEND] Question results received:`, { question: question.title, results, scores });
        setQuestionResults({ question, results });
        setCurrentScores(scores);
        toast.success("Question results are in!");
      });

      // Listen for next question
      socketRef.current.on("next_question", (nextQuestion) => {
        console.log(`[FRONTEND] Next question received: ${nextQuestion.title}`);
        setQuestion(nextQuestion);
        setTimeUp(false);
        setQuestionResults(null);
        setQuestionNumber(prev => prev + 1);
        const template = nextQuestion.javaTemplate || nextQuestion.functionSignature || "class Main {\n    public static void main(String[] args) {\n        System.out.println(\"Welcome to LiveCoder\");\n    }\n}";
        setInitialCode(template + "\n// Write your code below this line\n");
        toast.success("Next question loaded!");
      });

      // Listen for challenge ended
      socketRef.current.on("challenge_ended", ({ leaderboard, finalScores }) => {
        console.log(`[FRONTEND] Challenge ended, leaderboard:`, leaderboard);
        setLeaderboard(leaderboard);
        setCurrentScores(finalScores);
        setChallengeEnded(true);
        toast.success("Challenge completed! Check the leaderboard.");
      });

      // Listen for challenge error
      socketRef.current.on("challenge_error", ({ message }) => {
        console.log(`[FRONTEND] Challenge error: ${message}`);
        toast.error(message);
      });

      // Listen for submission received
      socketRef.current.on("submission_received", ({ message }) => {
        console.log(`[FRONTEND] Submission received: ${message}`);
        toast.success(message);
      });

      socketRef.current.on("lobby_state", ({ adminSocketId, clients, lobby }) => {
        console.log(`[FRONTEND] Lobby state update:`, { adminSocketId, clients: clients.length, lobby });
        setAdminSocketId(adminSocketId);
        setClientsList(clients);
        setLobby(lobby);
        if (!lobby) {
          // Challenge started, reset states
          console.log(`[FRONTEND] Challenge started, resetting states`);
          setQuestionNumber(0);
          setTotalQuestions(0);
          setChallengeEnded(false);
          setLeaderboard(null);
          setCurrentScores({});
          setQuestionResults(null);
        }
      });

      socketRef.current.on('error', (data) => {
        console.log(`[FRONTEND] Socket error:`, data);
        if (data && data.message === 'Invalid Room ID') {
          toast.error('Invalid Room ID');
          navigate('/');
        }
      });
    };
    init();

    return () => {
      console.log(`[FRONTEND] Cleaning up socket listeners for room ${roomId}`);
      socketRef.current && socketRef.current.disconnect();
      socketRef.current.off(ACTIONS.JOINED);
      socketRef.current.off(ACTIONS.DISCONNECTED);
      socketRef.current && socketRef.current.off("question");
      socketRef.current && socketRef.current.off("timer");
      socketRef.current && socketRef.current.off("time_up");
      socketRef.current && socketRef.current.off("question_results");
      socketRef.current && socketRef.current.off("next_question");
      socketRef.current && socketRef.current.off("challenge_ended");
      socketRef.current && socketRef.current.off("challenge_error");
      socketRef.current && socketRef.current.off("submission_received");
      socketRef.current && socketRef.current.off("lobby_state");
    };
  }, []);

  useEffect(() => {
    if (question && selectedLanguage) {
      let template;
      if (question.javaTemplate) {
        template = question.javaTemplate;
      } else if (question.functionSignature) {
        template = question.functionSignature[selectedLanguage] || Object.values(question.functionSignature)[0];
      } else {
        template = "class Main {\n    public static void main(String[] args) {\n        System.out.println(\"Welcome to LiveCoder\");\n    }\n}";
      }
      if (typeof template !== "string") template = String(template ?? "");
      setInitialCode(template + "\n// Write your code below this line\n");
    }
  }, [question, selectedLanguage]);

  // Handler for admin to start challenge
  const handleStartChallenge = () => {
    console.log(`[FRONTEND] Admin starting challenge with topic: ${selectedTopic}, difficulty: ${selectedDifficulty}`);
    if (!selectedTopic || !selectedDifficulty) {
      toast.error("Please select both topic and difficulty.");
      return;
    }
    socketRef.current.emit(ACTIONS.START_CHALLENGE, {
      roomId,
      topic: selectedTopic,
      difficulty: selectedDifficulty,
    });
  };

  // Handler for submitting code
  const handleSubmitCode = () => {
    console.log(`[FRONTEND] User submitting code`);
    if (!codeRef.current) {
      toast.error("Please write some code first!");
      return;
    }
    
    socketRef.current.emit(ACTIONS.SUBMIT_CODE, {
      roomId,
      code: codeRef.current,
      language: selectedLanguage,
    });
  };

  if (!Location.state) {
    return <Navigate to="/" />;
  }

  // Show leaderboard if challenge ended
  if (challengeEnded && leaderboard) {
    return (
      <div className="container-fluid vh-100 d-flex align-items-center justify-content-center bg-dark">
        <div className="card shadow p-4 bg-light w-75">
          <h2 className="text-center mb-4">🏆 Challenge Results 🏆</h2>
          
          <div className="table-responsive">
            <table className="table table-striped">
              <thead className="table-dark">
                <tr>
                  <th>Rank</th>
                  <th>Username</th>
                  <th>Total Score</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry, index) => (
                  <tr key={entry.username} className={index < 3 ? 'table-warning' : ''}>
                    <td>
                      {index === 0 && '🥇'}
                      {index === 1 && '🥈'}
                      {index === 2 && '🥉'}
                      {index > 2 && `#${entry.rank}`}
                    </td>
                    <td>{entry.username}</td>
                    <td><strong>{entry.score}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="text-center mt-4">
            <button className="btn btn-primary" onClick={() => navigate("/")}>
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (lobby) {
    return (
      <div className="container-fluid vh-100 d-flex align-items-stretch" style={{ minHeight: '100vh' }}>
        {/* Left: Waiting Room Card */}
        <div className="d-flex align-items-stretch" style={{ width: '50vw', height: '100vh' }}>
          <div className="card shadow p-4 bg-dark text-light w-100 h-100" style={{ minHeight: '350px', height: '100vh' }}>
            <h3>Waiting Room</h3>
            <p>Room ID: <strong>{roomId}</strong></p>
            <div className="mb-3">Members:</div>
            <ul>
              {clientsList.map((client) => (
                <li key={client.socketId}>{client.username} {client.socketId === adminSocketId && <span>(Admin)</span>}</li>
              ))}
            </ul>
            {socketRef.current && socketRef.current.id === adminSocketId && (
              <button
                className="btn btn-success mt-3 w-100"
                onClick={handleStartChallenge}
                disabled={!selectedTopic || !selectedDifficulty}
              >
                Start Challenge
              </button>
            )}
            {socketRef.current && socketRef.current.id !== adminSocketId && (
              <div className="mt-3">Waiting for admin to start the challenge...</div>
            )}
          </div>
        </div>
        {/* Right: Round Type and Topic Selection */}
        <div className="col-12 col-md-6 d-flex align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
          <div className="card shadow p-4 bg-dark text-light w-100" style={{ minHeight: '350px' }}>
            <h2 className="mb-4">Select Round Type</h2>
            <div className="btn-group-vertical w-100" role="group" aria-label="Round Type Selection">
              {ROUND_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  className={`btn btn-outline-primary mb-2${selectedRound === type ? ' active' : ''}`}
                  onClick={() => {
                    if (type !== 'Coding Round') {
                      toast('Not yet Implemented');
                    } else {
                      setSelectedRound(type);
                    }
                  }}
                >
                  {type}
                </button>
              ))}
            </div>
            {/* Show topic selection only for Coding Round */}
            {selectedRound === "Coding Round" && (
              <div className="mt-4">
                <h5 className="mb-3">Select Topic</h5>
                <div className="btn-group-vertical w-100" role="group" aria-label="Topic Selection">
                  {TOPICS.map((topic) => (
                    <button
                      key={topic}
                      type="button"
                      className={`btn btn-outline-success mb-2${selectedTopic === topic ? ' active' : ''}`}
                      onClick={() => {
                        setSelectedTopic(topic);
                        setSelectedDifficulty(null); // Reset difficulty when topic changes
                      }}
                    >
                      {topic}
                    </button>
                  ))}
                </div>
                <div className="mt-2 text-info">Selected: {selectedTopic}</div>
                {/* Only admin can select difficulty */}
                {socketRef.current && socketRef.current.id === adminSocketId && (
                  <div className="mt-4">
                    <h5 className="mb-3">Select Difficulty</h5>
                    <div className="btn-group w-100" role="group" aria-label="Difficulty Selection">
                      {DIFFICULTIES.map((diff) => (
                        <button
                          key={diff.value}
                          type="button"
                          className={`btn btn-outline-warning mx-1${selectedDifficulty === diff.value ? ' active' : ''}`}
                          onClick={() => setSelectedDifficulty(diff.value)}
                        >
                          <span style={{ fontSize: '1.2em', marginRight: 6 }}>{diff.icon}</span>
                          {diff.label}
                        </button>
                      ))}
                    </div>
                    {selectedDifficulty && (
                      <div className="mt-2 text-info">Selected: {DIFFICULTIES.find(d => d.value === selectedDifficulty)?.label}</div>
                    )}
                  </div>
                )}
              </div>
            )}
            <div className="mt-3 text-info">Selected: {selectedRound}</div>
          </div>
        </div>
      </div>
    );
  }

  const copyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      toast.success(`Room ID is copied`);
    } catch (error) {
      console.log(error);
      toast.error("Unable to copy the room ID");
    }
  };

  const leaveRoom = async () => {
    navigate("/");
  };

  const runCode = async () => {
    setIsCompiling(true);
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
      const response = await axios.post(`${backendUrl}/compile`, {
        code: codeRef.current,
        language: selectedLanguage,
      });
      console.log("Backend response:", response.data);
      setOutput(response.data.output || JSON.stringify(response.data));
    } catch (error) {
      console.error("Error compiling code:", error);
      setOutput(error.response?.data?.error || "An error occurred");
    } finally {
      setIsCompiling(false);
    }
  };

  const toggleCompileWindow = () => {
    setIsCompileWindowOpen(!isCompileWindowOpen);
  };

  const handleSubmit = async () => {
    setSubmitResult(null);
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
      const response = await axios.post(`${backendUrl}/submit`, {
        code: codeRef.current,
        language: selectedLanguage,
        roomId,
        username: Location.state?.username,
      });
      setSubmitResult(response.data);
    } catch (error) {
      setSubmitResult({ error: error.response?.data?.error || "Submission failed" });
    }
  };

  return (
    <div className="container-fluid vh-100 d-flex flex-column">
      {/* Timer display */}
      {timer !== null && (
        <div className="alert alert-warning mb-0 text-center">
          <strong>Time Left: </strong>
          {`${Math.floor(timer / 60)}:${(timer % 60).toString().padStart(2, '0')} minutes`}
          {questionNumber > 0 && (
            <span className="ms-3">
              <strong>Question {questionNumber}</strong>
            </span>
          )}
        </div>
      )}
      {timeUp && (
        <div className="alert alert-danger mb-0 text-center">
          <strong>Time is up!</strong>
        </div>
      )}

      {/* Question Results Display */}
      {questionResults && (
        <div className="alert alert-info mb-0">
          <h5>Question Results</h5>
          <div className="row">
            <div className="col-md-6">
              <strong>Question:</strong> {questionResults.question.title}
            </div>
            <div className="col-md-6">
              <strong>Your Score:</strong> {questionResults.results[Location.state?.username] || 0}/10
            </div>
          </div>
          <div className="mt-2">
            <strong>Current Standings:</strong>
            <div className="d-flex flex-wrap gap-2 mt-1">
              {Object.entries(questionResults.results)
                .sort(([,a], [,b]) => b - a)
                .map(([username, score]) => (
                  <span key={username} className="badge bg-primary">
                    {username}: {score}
                  </span>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Question display */}
      {question && (
        <div className="alert alert-info mb-0">
          <h5 className="mb-1">{question.title}</h5>
          <div>{question.description}</div>
          {question.constraints && (
            <ul>
              {question.constraints.map((c, i) => <li key={i}>{c}</li>)}
            </ul>
          )}
        </div>
      )}

      <div className="row flex-grow-1">
        {/* Client panel */}
        <div className="col-md-2 bg-dark text-light d-flex flex-column">
          <img
            src="/images/codecast.png"
            alt="Logo"
            className="img-fluid mx-auto"
            style={{ maxWidth: "150px", marginTop: "-43px" }}
          />
          <hr style={{ marginTop: "-3rem" }} />

          {/* Client list container */}
          <div className="d-flex flex-column flex-grow-1 overflow-auto">
            <span className="mb-2">Members</span>
            {clients.map((client) => (
              <Client key={client.socketId} username={client.username} />
            ))}
          </div>

          {/* Current Scores */}
          {Object.keys(currentScores).length > 0 && (
            <div className="mt-3">
              <span className="mb-2">Current Scores:</span>
              {Object.entries(currentScores)
                .sort(([,a], [,b]) => b - a)
                .map(([username, score]) => (
                  <div key={username} className="small">
                    {username}: {score}
                  </div>
                ))}
            </div>
          )}

          <hr />
          {/* Buttons */}
          <div className="mt-auto mb-3">
            <button className="btn btn-success w-100 mb-2" onClick={copyRoomId}>
              Copy Room ID
            </button>
            <button className="btn btn-danger w-100" onClick={leaveRoom}>
              Leave Room
            </button>
          </div>
        </div>

        {/* Editor panel */}
        <div className="col-md-10 text-light d-flex flex-column">
          {/* Language selector */}
          <div className="bg-dark p-2 d-flex justify-content-end">
            <select
              className="form-select w-auto"
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
            >
              {LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
          </div>

          <Editor
            onCodeChange={(code) => {
              codeRef.current = typeof code === "string" ? code : String(code ?? "");
            }}
            initialCode={typeof initialCode === "string" ? initialCode : String(initialCode ?? "")}
          />
          
          {/* Submit button */}
          <div className="d-flex justify-content-between align-items-center mt-3">
            <button 
              className="btn btn-primary" 
              onClick={handleSubmitCode}
              disabled={timeUp || questionResults}
            >
              Submit Code
            </button>
            <button className="btn btn-secondary" onClick={handleSubmit}>
              Test Submit
            </button>
          </div>

          {submitResult && (
            <div className="alert mt-3 " style={{ background: submitResult.correct ? '#d4edda' : '#f8d7da', color: submitResult.correct ? '#155724' : '#721c24' }}>
              {submitResult.error && <div>{submitResult.error}</div>}
              {submitResult.message && <div>{submitResult.message}</div>}
              {submitResult.score !== undefined && (
                <div>
                  <strong>Score: {submitResult.score}/10</strong>
                </div>
              )}
              {submitResult.questionNumber && (
                <div>
                  Question {submitResult.questionNumber} of {submitResult.totalQuestions}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Compiler toggle button */}
      <button
        className="btn btn-primary position-fixed bottom-0 end-0 m-3"
        onClick={toggleCompileWindow}
        style={{ zIndex: 1050 }}
      >
        {isCompileWindowOpen ? "Close Compiler" : "Open Compiler"}
      </button>

      {/* Compiler section */}
      <div
        className={`bg-dark text-light p-3 ${
          isCompileWindowOpen ? "d-block" : "d-none"
        }`}
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          height: isCompileWindowOpen ? "30vh" : "0",
          transition: "height 0.3s ease-in-out",
          overflowY: "auto",
          zIndex: 1040,
        }}
      >
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="m-0">Compiler Output ({selectedLanguage})</h5>
          <div>
            <button
              className="btn btn-success me-2"
              onClick={runCode}
              disabled={isCompiling}
            >
              {isCompiling ? "Compiling..." : "Run Code"}
            </button>
            <button className="btn btn-secondary" onClick={toggleCompileWindow}>
              Close
            </button>
          </div>
        </div>
        <pre className="bg-secondary p-3 rounded">
          {output || "Output will appear here after compilation"}
        </pre>
      </div>
    </div>
  );
}

export default EditorPage;
