import React, { useContext, useEffect, useState } from 'react'
import { Button, Dropdown, DropdownItem, DropdownMenu, DropdownSection, DropdownTrigger, Input } from '@heroui/react'
import { SessionContext } from '../App'
import { supabase } from '../supabase-client'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FiSearch, FiUser } from 'react-icons/fi'
import logo from '../assets/logo.png'
import { SmoothCursor } from './smoothCursor'

function Navbar() {
  const { session, setSession } = useContext(SessionContext)
  const navigate = useNavigate()
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [smoothCursor, setSmoothCursor] = useState(true)


// don't show the smooth cursor on mobile or tablet
  useEffect(() => {
    const isMobileOrTablet = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 1024;
    
    if (isMobileOrTablet) {
      setSmoothCursor(false);
      localStorage.setItem('smoothCursor', false);
    } else {
      const savedSmoothCursor = localStorage.getItem('smoothCursor');
      setSmoothCursor(savedSmoothCursor === null ? true : JSON.parse(savedSmoothCursor));
    }

    const handleResize = () => {
      const isSmallScreen = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 1024;
      setSmoothCursor(!isSmallScreen);
      localStorage.setItem('smoothCursor', !isSmallScreen);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [])

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()

        if (error || !data.session) {
          setIsLoggedIn(false)
        } else {
          setIsLoggedIn(true)
          setSession(data)
        }
      } catch (error) {
        console.error("Error checking authentication:", error)
        setIsLoggedIn(false)
      }
    }

    checkAuth()
  }, [setSession])

  useEffect(() => {
    setIsLoggedIn(!!session?.session)
  }, [session])

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut()
    if (!error) {
      setSession(null)
      setIsLoggedIn(false)
      navigate('/auth')
    }
  }

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bg-white shadow-sm py-4 px-6 mb-8"
    >
      <div  className="transition-all duration-300 max-w-6xl mx-auto flex items-center justify-between">
        <motion.div
          whileHover={{ scale: 1.05 }}
          className="text-xl md:text-2xl font-bold flex items-center gap-2 select-none bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-transparent bg-clip-text cursor-pointer"
          onClick={() => navigate('/')}
        >
          <img src={logo} alt="logo" className='w-5 h-5 md:w-10 md:h-10' />
          Magic Tools 
        </motion.div>

        <div className='lg:flex hidden items-center gap-4'>
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className='text-sm text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500 cursor-default hover:scale-105 transform transition-transform duration-200'
          >
            ✨ Tip: magical cursor can be turned off in your profile settings ✨
          </motion.p>
        </div>

        {isLoggedIn ? (
          <div className="flex items-center gap-4">
            <Input
              isClearable
              classNames={{
                label: "text-black/50",
                input: [
                  "bg-transparent",
                  "text-black/90",
                  "placeholder:text-indigo-500/50",
                ],
                innerWrapper: "bg-transparent",
                inputWrapper: [
                  "shadow-md",
                  "bg-white/90",
                  "backdrop-blur-xl",
                  "backdrop-saturate-200",
                  "border border-transparent",
                  "hover:border-indigo-500/30",
                  "group-data-[focus=true]:border-purple-500/50",
                  "group-data-[focus=true]:bg-white",
                  "transition-all duration-300",
                  "!cursor-text",
                ],
              }}
              placeholder="Search tools..."
              radius="lg"
              className='hidden sm:block'
              startContent={
                <FiSearch className="text-indigo-500/70 mb-0.5 pointer-events-none flex-shrink-0" />
              }
            />
            <Dropdown>
              <DropdownTrigger>
                <div 
                  variant="light" 
                  className="flex transition-all cursor-pointer items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 duration-300"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center text-white">
                      {session?.session?.user?.user_metadata?.name?.[0]?.toUpperCase() || session?.session?.user?.email?.[0]?.toUpperCase() || <FiUser className="w-4 h-4" />}
                    </div>
                    <div className=" hidden md:flex flex-col items-start">
                      <span className="text-sm font-medium text-gray-700">
                        {session?.session?.user?.user_metadata?.name || session?.session?.user?.email}
                      </span>
                      <span className="text-xs text-gray-500">
                        {session?.session?.user?.email}
                      </span>
                    </div>
                  </div>
                </div>
              </DropdownTrigger>
              <DropdownMenu
        aria-label="Custom item styles"
        className="p-3"
        disabledKeys={["profile"]}
        itemClasses={{
          base: [
            "rounded-md",
            "text-default-500",
            "transition-opacity",
            "data-[hover=true]:text-foreground",
            "data-[hover=true]:bg-default-100",
            "dark:data-[hover=true]:bg-default-50",
            "data-[selectable=true]:focus:bg-default-50",
            "data-[pressed=true]:opacity-70",
            "data-[focus-visible=true]:ring-default-500",
          ],
        }}
      >
        <DropdownSection showDivider aria-label="Profile & Actions">
          {/* <DropdownItem key="profile" isReadOnly className="h-14 gap-2 opacity-100">
            <User
              avatarProps={{
                size: "sm",
                src: "https://avatars.githubusercontent.com/u/30373425?v=4",
              }}
              classNames={{
                name: "text-default-600",
                description: "text-default-500",
              }}
              description="@jrgarciadev"
              name="Junior Garcia"
            />
          </DropdownItem> */}
          <DropdownItem key="dashboard">Dashboard</DropdownItem>
          <DropdownItem onPress={()=>{
            if(smoothCursor){
              localStorage.setItem('smoothCursor', 'false')
              setSmoothCursor(!smoothCursor)
            }else{
              localStorage.setItem('smoothCursor', 'true')
              setSmoothCursor(!smoothCursor)
            }
          }} key="settings">{smoothCursor ? 'Disable Smooth Cursor' : 'Enable Smooth Cursor'}</DropdownItem>
        </DropdownSection>

        <DropdownSection showDivider aria-label="Preferences">
          <DropdownItem key="quick_search" shortcut="⌘K">
            Quick search
          </DropdownItem>
          <DropdownItem
            key="theme"
            isReadOnly
            className="cursor-default"
            endContent={
              <select
                className="z-10 outline-none w-16 py-0.5 rounded-md text-tiny group-data-[hover=true]:border-default-500 border-small border-default-300 dark:border-default-200 bg-transparent text-default-500"
                id="theme"
                name="theme"
              >
                <option>System</option>
                <option>Dark</option>
                <option>Light</option>
              </select>
            }
          >
            Theme
          </DropdownItem>
        </DropdownSection>

        <DropdownSection aria-label="Help & Feedback">
          <DropdownItem key="help_and_feedback">Help & Feedback</DropdownItem>
          <DropdownItem color='danger' className='text-red-500' key="logout" onPress={handleLogout}>Log Out</DropdownItem>
        </DropdownSection>
      </DropdownMenu>
            </Dropdown>
          </div>
        ) : (
          <div className="flex gap-3">

            <Button className='bg-gradient-to-r from-indigo-500 to-purple-600 text-white'
              color="primary"
              onPress={() => navigate('/auth')}
            >
              Get Started
            </Button>
          </div>
        )}
      </div>
      {smoothCursor && <SmoothCursor />}
    </motion.nav>
  )
}

export default Navbar