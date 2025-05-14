import React, { useEffect, useState } from 'react'
import {BrowserRouter as Router, Routes, Route} from 'react-router-dom'
import { Auth, Home, Tool } from './pages'
import {HeroUIProvider} from "@heroui/react";
import { supabase } from './supabase-client';
import { createContext } from 'react';
import { Navbar } from './components';

export const SessionContext=createContext()

function App() {
  
  const [session,setSession]=useState(null)

  useEffect(()=>{
    const fetchSession=async()=>{
      const currentSession=await supabase.auth.getSession()
      setSession(currentSession.data)
      console.log(currentSession)
    }
    fetchSession()
  },[])
  return (
      <HeroUIProvider>
        <SessionContext.Provider value={{session,setSession}}>
        <Router>
          <Navbar/>
        <Routes>
          <Route path='/' element={<Home />} />
          <Route path='/tool/:id' element={<Tool />} />
          <Route path='/auth' element={<Auth />} />
        </Routes>
      </Router>
      </SessionContext.Provider>
      </HeroUIProvider>
   
  )
}

export default App