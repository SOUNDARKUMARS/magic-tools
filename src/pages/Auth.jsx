import React, { useState } from 'react'
import { Tabs, Tab, Input, Link, Button, Card, CardBody } from "@heroui/react";
import { supabase } from '../supabase-client';
import { useNavigate } from 'react-router-dom';
function Auth() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSignUp = async () => {
    setIsLoading(true)
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          name: name
        }
      }
    })
    if (error) {
    alert(error.message)
    console.log('error signing up',error)
    } else {
     alert("check your email for verification")
    }
    setIsLoading(false)
  }

  const handleLogin = async () => {
    setIsLoading(true)
    const {error, data}=await supabase.auth.signInWithPassword({
      email:email,
      password:password
    })
    if(error){
      alert(error.message)
      console.log('error signing in',error)
    }else{
      if(data.user){
        navigate('/')
      }
    }
    setIsLoading(false)
  }
  return (
    <div className="flex flex-col w-full h-screen items-center justify-center">
      <Card className="max-w-full w-[340px] h-[400px]">
        <CardBody className="overflow-hidden">
          <Tabs
            fullWidth
            aria-label="Tabs form"
            selectedKey={selected}
            size="md"
            onSelectionChange={setSelected}
          >
            <Tab key="login" title="Login">
              <div className="flex flex-col gap-4">
                <Input isRequired label="Email" placeholder="Enter your email" type="email" value={email} onValueChange={setEmail} />
                <Input
                  isRequired
                  label="Password"
                  placeholder="Enter your password"
                  type="password"
                  value={password}
                  onValueChange={setPassword}
                />
                <p className="text-center text-small">
                  Need to create an account?{" "}
                  <Link className='cursor-pointer text-indigo-500' size="sm" onPress={() => setSelected("sign-up")}>
                    Sign up
                  </Link>
                </p>
                <div className="flex gap-2 justify-end">
                  <Button isLoading={isLoading} disabled={!email || !password || isLoading} className='bg-gradient-to-r from-indigo-500  to-purple-500 text-white' fullWidth color="primary" onPress={handleLogin}>
                    {isLoading ? "Logging in..." : "Login"}
                  </Button>
                </div>
              </div>
            </Tab>
            <Tab key="sign-up" title="Sign up">
              <div className="flex flex-col gap-4 h-[300px]">
                <Input isRequired label="Name" placeholder="Enter your name" type="text" value={name} onValueChange={setName} />
                <Input isRequired label="Email" placeholder="Enter your email" type="email" value={email} onValueChange={setEmail} />
                <Input
                  isRequired
                  label="Password"
                  placeholder="Enter your password"
                  type="password"
                  value={password}
                  onValueChange={setPassword}
                />
                <p className="text-center text-small">
                  Already have an account?{" "}
                  <Link className='cursor-pointer text-indigo-500' size="sm" onPress={() => setSelected("login")}>
                    Login
                  </Link>
                </p>
                <div className="flex gap-2 justify-end">
                  <Button isLoading={isLoading} disabled={!email || !name || !password || isLoading} className='bg-gradient-to-r from-indigo-500  to-purple-500 text-white' fullWidth color="primary" onPress={handleSignUp}>
                    {isLoading ? "Signing up..." : "Sign up"}
                  </Button>
                </div>
              </div>
            </Tab>
          </Tabs>
        </CardBody>
      </Card>
    </div>
  )
}

export default Auth