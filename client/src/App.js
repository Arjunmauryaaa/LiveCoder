import './App.css';
import { Routes, Route } from "react-router-dom";
import Home from './components/Home';
import EditorPage from './components/EditorPage';
import LandingPage from './components/LandingPage';
import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <>
    <div>
      <Toaster  position='top-center'></Toaster>
    </div>
    <Routes>
     <Route path='/' element={ <Home /> } />
     <Route path='/editor/:roomId' element={ <EditorPage /> } />
     <Route path='/landing' element={ <LandingPage /> } />
    </Routes>
    </>
  );
}

export default App;
