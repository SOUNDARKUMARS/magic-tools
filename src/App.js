import React from 'react'
import {BrowserRouter as Router, Routes, Route} from 'react-router-dom'
import { Home, Login } from './pages'
import {HeroUIProvider} from "@heroui/react";

function App() {
  return (
    <HeroUIProvider>
       <Router>
      <Routes>
        <Route path='/' element={<Home />} />
        <Route path='/login' element={<Login />} />
      </Routes>
    </Router>
    </HeroUIProvider>
   
  )
}

export default App