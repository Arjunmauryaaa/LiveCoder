import {io} from 'socket.io-client';

export const initSocket = async () =>{
    const options = {
        'force new connection': true,
        reconnectionAttempts : 'Infinity',
        timeout: 20000, // Increased timeout for production
        transports: ['websocket', 'polling'], // Allow fallback to polling
        upgrade: true,
        rememberUpgrade: true
    };
    
    // Use environment variable or fallback to localhost for development
    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
    console.log('Connecting to backend:', backendUrl); // Debug log
    
    return io(backendUrl, options);
}