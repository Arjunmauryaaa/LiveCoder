import React, { useState, useEffect } from "react";
import { v4 as uuid } from "uuid";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { initSocket } from "../Socket";

function Home() {
  const [roomId, setRoomId] = useState("");
  const [username, setUsername] = useState("");
  const [isRoomIdGenerated, setIsRoomIdGenerated] = useState(false);
  const [socket, setSocket] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    const setupSocket = async () => {
      const s = await initSocket();
      setSocket(s);
    };
    setupSocket();
    return () => {
      if (socket) socket.disconnect();
    };
    // eslint-disable-next-line
  }, []);

  const generateRoomId = (e) => {
    e.preventDefault();
    // Generate a random 4-digit number as a string
    const Id = Math.floor(1000 + Math.random() * 9000).toString();
    setRoomId(Id);
    setIsRoomIdGenerated(true);
    toast.success("Room Id is generated");
  };

  const joinRoom = async () => {
    if (!roomId || !username) {
      toast.error("Please enter both Room ID and Username.");
      return;
    }
    if (roomId.length !== 4) {
      toast.error("Room ID must be exactly 4 digits");
      return;
    }
    if (isRoomIdGenerated) {
      // Always allow navigation for generated IDs (room will be created)
      navigate(`/editor/${roomId}`, {
        state: {
          username,
          isRoomCreator: true,
        },
      });
      toast.success("room is created");
      return;
    }
    // For manual IDs, check with backend if room exists
    if (!socket) {
      toast.error("Socket not ready. Try again.");
      return;
    }
    let roomExists = false;
    await new Promise((resolve) => {
      socket.emit("check_room", { roomId }, (response) => {
        roomExists = response && response.exists;
        resolve();
      });
    });
    if (roomExists) {
      navigate(`/editor/${roomId}`, {
        state: {
          username,
          isRoomCreator: false,
        },
      });
      toast.success("Joined room");
    } else {
      toast.error("Invalid Room ID");
    }
  };

  // when enter then also join
  const handleInputEnter = (e) => {
    if (e.code === "Enter") {
      joinRoom();
    }
  };

  return (
    <div className="container-fluid min-vh-100 d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
      <div className="col-12 col-md-6">
        <div className="card shadow-sm p-2 mb-5 bg-secondary rounded" style={{ minHeight: '350px', width: '100%' }}>
          <div className="card-body text-center bg-dark">
            <img
              src="/images/codecast.png"
              alt="Logo"
              className="img-fluid mx-auto d-block"
              style={{ maxWidth: "150px" }}
            />
            <h4 className="card-title text-light mb-4">Enter the ROOM ID</h4>
            <div className="form-group">
              <input
                type="text"
                value={roomId}
                onChange={(e) => {
                  // Only allow up to 4 digits
                  const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                  setRoomId(value);
                  if (value === "") setIsRoomIdGenerated(false);
                }}
                className="form-control mb-2"
                placeholder="ROOM ID (required)"
                onKeyUp={handleInputEnter}
                maxLength={4}
                required
                readOnly={isRoomIdGenerated}
              />
            </div>
            <div className="form-group">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="form-control mb-2"
                placeholder="USERNAME (required)"
                onKeyUp={handleInputEnter}
                required
              />
            </div>
            <button
              onClick={joinRoom}
              className="btn btn-success btn-lg btn-block"
            >
              JOIN
            </button>
            <p className="mt-3 text-light">
              Don't have a room ID? create{" "}
              <span
                onClick={generateRoomId}
                className=" text-success p-2"
                style={{ cursor: "pointer" }}
              >
                {" "}
                New Room
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;
