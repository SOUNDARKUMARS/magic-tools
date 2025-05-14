import React, { useContext, useEffect, useState } from 'react'
import { Button, Input } from '@heroui/react'
import { MdModeEditOutline, MdAddBox, MdSave, MdAutoAwesome } from "react-icons/md";
import { IoMdTrash } from "react-icons/io";
import { FiPlus, FiDatabase } from "react-icons/fi";
import { supabase } from '../supabase-client';
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { SessionContext } from '../App';
import { OPENROUTER_API_URL, getApiHeaders } from '../config';

function Home() {
    const navigate = useNavigate()
    const { session, setSession } = useContext(SessionContext)
    const [prompt, setPrompt] = useState('')
    const [response, setResponse] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [authChecked, setAuthChecked] = useState(false)
    const [tools, setTools] = useState([])
    const [tableData, setTableData] = useState({ fields: [], rows: [] })
    const [newRow, setNewRow] = useState({})
    const [editingRow, setEditingRow] = useState(null)
    const [saveSuccess, setSaveSuccess] = useState(false)
    const [generationSuccess, setGenerationSuccess] = useState(false)

    // check authentication on component mount
    useEffect(() => {
        const checkAuth = async () => {
            try {
                const { data, error } = await supabase.auth.getSession()
                
                if (error || !data.session) {
                    console.log("No valid session found, redirecting to auth")
                    navigate('/auth')
                    return
                }
                
                setSession(data)
                setAuthChecked(true)
            } catch (error) {
                console.error("Error checking authentication:", error)
                navigate('/auth')
            }
        }
        
        checkAuth()
    }, [navigate, setSession])

    // animation variants
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { 
            opacity: 1,
            transition: { 
                when: "beforeChildren",
                staggerChildren: 0.1
            }
        }
    }

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { 
            y: 0, 
            opacity: 1,
            transition: { type: "spring", stiffness: 300, damping: 24 }
        }
    }

    const cardVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: (i) => ({ 
            opacity: 1, 
            y: 0,
            transition: { 
                delay: i * 0.05,
                type: "spring", 
                stiffness: 300, 
                damping: 24 
            }
        }),
        hover: { 
            y: -5, 
            boxShadow: "0 10px 25px -5px rgba(59, 130, 246, 0.1), 0 5px 10px -5px rgba(59, 130, 246, 0.2)",
            transition: { type: "spring", stiffness: 500, damping: 20 }
        },
        tap: { 
            scale: 0.98, 
            transition: { type: "spring", stiffness: 500, damping: 20 }
        }
    }

    useEffect(() => {
        if (authChecked) {
            fetchTools()
        }
    }, [authChecked])


// insert user if not exists after verifying from the email
    useEffect(() => {
        const insertUserIfNotExists = async () => {
          const {
            data: { session },
          } = await supabase.auth.getSession()
      
          const user = session?.user
          if (!user) return
      
          // Check if user already exists in 'users' table
          const { data: existingUser, error: fetchError } = await supabase
            .from('users')
            .select('email')
            .eq('email', user.email)
            .maybeSingle()
      
          if (!existingUser && !fetchError) {
            const { error: insertError } = await supabase.from('users').insert([
              {
                email: user.email,
                username: user.user_metadata?.name,
                profile_img:"https://i.pravatar.cc/150?img=1"
              },
            ])
            if (insertError) {
              console.error('Error inserting user:', insertError)
            } else {
              console.log('User added to users table')
            }
          }
        }
      
        insertUserIfNotExists()
      }, [])

    const fetchTools = async () => {
        if (!authChecked) return
        
        setIsLoading(true)
        try {
            const { data, error } = await supabase.from('tools').select('id,title,description,created_at')
            if (error) {
                console.error("Failed to fetch tools:", error)
                if (error.code === 'PGRST301' || error.code === '401') {
                    // Session may have expired
                    navigate('/auth')
                    return
                }
            } else {
                console.log("Tools fetched successfully:", data)
                setTools(data)
            }
        } catch (error) {
            console.error("Error fetching tools:", error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleLogout = async () => {
        try {
            await supabase.auth.signOut()
            setSession(null)
            navigate('/auth')
        } catch (error) {
            console.error("Error signing out:", error)
        }
    }

    const handleClick = async () => {
        if (!prompt.trim() || !authChecked) return
        setIsLoading(true)
        try {
            console.log("Making request to OpenRouter with headers:", getApiHeaders());
            console.log("Using model:", 'open-r1/olympiccoder-32b:free');
            console.log("Current hostname:", window.location.hostname);
            console.log("Current origin:", window.location.origin);
            
            const res = await fetch(OPENROUTER_API_URL, {
                method: 'POST',
                headers: getApiHeaders(),
                body: JSON.stringify({
                    model: 'open-r1/olympiccoder-32b:free',
                    messages: [
                        {
                            role: 'user',
                            content: `${prompt}

Please return only raw JSON in the following format:

{
  "tool_name": "Your tool's name here",
  "purpose": "Brief purpose of the tool",
  "fields": [
    { "name": "Field Name", "type": "text" },
    { "name": "Status", "type": "enum", "options": ["open", "in progress", "done"] },
    { "name": "Due Date", "type": "date" }
  ],
  "rows": [
    {
      "Field Name": "Sample value",
      "Status": "open",
      "Due Date": "2024-12-01"
    }
  ]
}

Guidelines:
- Ensure 'fields' represent columns with name, type and optional enum values
- Generate 1-2 example rows using the fields above
- Fields should be relevant to the user's requested tool
- Return ONLY valid JSON
`,
                        },
                    ],
                }),
            })

            if (res.status !== 200) {
                const errorText = await res.text();
                console.error("API Error:", {
                    status: res.status,
                    statusText: res.statusText,
                    body: errorText
                });
                throw new Error(`Error in API response: ${res.status} - ${errorText}`);
            }

            const data = await res.json()
            const rawContent = data.choices[0]?.message?.content || '{}'

            // cleaning the res - (removing ```, /, and all)
            const cleanedContent = rawContent
                .replace(/```json\n?/g, '')
                .replace(/```\n?/g, '')
                .trim()

            const parsedResponse = JSON.parse(cleanedContent)
            setResponse(data.choices[0]?.message?.content || 'No response')
            setTableData(parsedResponse)
            setGenerationSuccess(true)
            setTimeout(() => setGenerationSuccess(false), 3000)

            // initialize new row (newRow) with empty values
            const emptyRow = {}
            parsedResponse.fields.forEach(field => {
                emptyRow[field.name] = ''
            })
            setNewRow(emptyRow)

        } catch (error) {
            console.error("Failed to fetch response:", error)
            setResponse('Error: Failed to get response')
        } finally {
            setIsLoading(false)
        }
    }

    const handleAddRow = () => {
        setTableData(prev => ({
            ...prev,
            rows: [...prev.rows, newRow]
        }))

        // reset newRow with empty values
        const emptyRow = {}
        tableData.fields.forEach(field => {
            emptyRow[field.name] = ''
        })
        setNewRow(emptyRow)
    }

    const handleNewRowChange = (fieldName, value) => {
        setNewRow(prev => ({
            ...prev,
            [fieldName]: value
        }))
    }

    const handleEditRow = (index) => {
        setEditingRow(index)
    }

    const handleDelRow = (ind) => {
        window.confirm('Are you sure you want to delete this row?') &&
            setTableData(prev => ({
                ...prev,
                rows: prev.rows.filter((_, index) => index !== ind)
            }))
    }

    const handleUpdateRow = (index, fieldName, value) => {
        const updatedRows = [...tableData.rows]
        updatedRows[index] = {
            ...updatedRows[index],
            [fieldName]: value
        }
        setTableData(prev => ({
            ...prev,
            rows: updatedRows
        }))
    }

    const handleSaveData = async () => {
        if (!authChecked) return
        // console.log(session?.session?.user?.id)
        // return
        setIsLoading(true)
        try {
            const { data, error } = await supabase.from('tools').insert({ 
                table_data: tableData, 
                created_by_id: session?.session?.user?.id, 
                title: tableData.tool_name, 
                description: tableData.purpose 
            }).single()
            
            if (error) {
                console.error("Failed to save data:", error)
                if (error.code === 'PGRST301' || error.code === '401') {
                    // Session may have expired
                    navigate('/auth')
                    return
                }
            } else {
                console.log("Data saved successfully:", data)
                setSaveSuccess(true)
                setTimeout(() => {
                    setSaveSuccess(false)
                    fetchTools()
                }, 2000)
            }
        } catch (error) {
            console.error("Error saving data:", error)
        } finally {
            setIsLoading(false)
        }
    }

    if (!authChecked) {
        return (
            <div className="flex flex-col space-y-6 max-w-6xl mx-auto px-4 py-8">
                <div className="h-8 w-64 bg-gray-200 rounded-md animate-pulse"></div>
                <div className="h-64 w-full bg-gray-200 rounded-xl animate-pulse"></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                    {[1,2,3].map((i) => (
                        <div key={i} className="h-48 bg-gray-200 rounded-lg animate-pulse"></div>
                    ))}
                </div>
            </div>
        )
    }

    if (isLoading && tools.length === 0) {
        return (
            <div className="flex flex-col space-y-6 max-w-6xl mx-auto px-4 py-8">
                <div className="h-8 w-64 bg-gray-200 rounded-md animate-pulse"></div>
                <div className="h-64 w-full bg-gray-200 rounded-xl animate-pulse"></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                    {[1,2,3].map((i) => (
                        <div key={i} className="h-48 bg-gray-200 rounded-lg animate-pulse"></div>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <motion.div 
            className='max-w-6xl mx-auto px-4 py-8'
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {/* Success messages */}
            <AnimatePresence>
                {generationSuccess && (
                    <motion.div 
                        initial={{ opacity: 0, y: -50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -50 }}
                        className="fixed top-4 right-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center"
                    >
                        <MdAutoAwesome className="w-5 h-5 mr-2" />
                        Tool generated successfully!
                    </motion.div>
                )}
                {saveSuccess && (
                    <motion.div 
                        initial={{ opacity: 0, y: -50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -50 }}
                        className="fixed top-4 right-4 bg-gradient-to-r from-green-400 to-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center"
                    >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                        Tool saved successfully!
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header with user info and know more button */}
            <div className="flex justify-between items-center mb-6">
                <motion.h2 
                    variants={itemVariants}
                    className="text-lg font-medium text-gray-700"
                >
                    Welcome, {session?.session?.user?.user_metadata?.name || session?.session?.user?.email || 'User'}
                </motion.h2>
                <motion.button
                    variants={itemVariants}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-indigo-500 to-purple-600 rounded-md shadow-sm hover:from-indigo-600 hover:to-purple-700 transition-all duration-300"
                >
                    About Magic Tools
                </motion.button>
            </div>

            <motion.div variants={itemVariants}>
                <div className="bg-gradient-to-r from-indigo-400 via-purple-600 to-pink-400 text-white rounded-xl p-8 mb-10 shadow-lg">
                    <h1 className='text-3xl font-bold mb-3'>Magic Tool Generator</h1>
                    <p className="text-indigo-100 mb-6">Describe what tool you want to create and we'll generate it for you instantly</p>
                    <div className='flex flex-col sm:flex-row gap-3 bg-white/10 p-4 rounded-lg backdrop-blur-sm'>
                        <Input
                            className='flex-1 bg-white/90 backdrop-blur-sm rounded-full caret-black'
                            placeholder='Describe the tool you want to create...'
                            value={prompt}
                            onValueChange={setPrompt}
                        />
                        <Button
                            className='px-6 py-2 bg-white text-indigo-600 hover:bg-indigo-50 font-medium transition-all duration-300'
                            onPress={handleClick}
                            isLoading={isLoading}
                            startContent={!isLoading && <MdAutoAwesome />}
                        >
                            Generate Tool
                        </Button>
                    </div>
                </div>
            </motion.div>

            {/* existing tools */}
            {tools.length > 0 && (
                <motion.div variants={itemVariants} className="mb-10">
                    <h2 className="text-2xl font-bold mb-4 text-gray-800 flex items-center">
                        <FiDatabase className="mr-2 text-indigo-500" />
                        Your Tools
                    </h2>
                    <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
                        {tools.map((tool, i) => (
                            <motion.div
                                key={tool.id}
                                custom={i}
                                variants={cardVariants}
                                whileHover="hover"
                                whileTap="tap"
                                onClick={() => navigate(`/tool/${tool.id}`)}
                                className='bg-white border border-gray-200 p-5 rounded-lg cursor-pointer shadow-sm hover:shadow-md transition-all duration-300'
                            >
                                <div className="h-2 w-[50px] bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full mb-3"></div>
                                <h2 className='text-lg font-semibold text-gray-800 mb-2'>{tool.title}</h2>
                                <p className='text-sm text-gray-600 mb-3'>{tool.description}</p>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs px-2 py-1 bg-indigo-50 text-indigo-600 rounded-full">
                                    {new Date(tool.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </span>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            )}

            {tableData.fields.length > 0 && (
                <motion.div 
                    variants={itemVariants}
                    className='w-full mb-8'
                >
                    <div className='bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-lg shadow-lg text-white p-6 mb-6'>
                        <h2 className='text-2xl font-bold text-white mb-2'>{tableData.tool_name}</h2>
                        <p className='text-white text-opacity-90'>{tableData.purpose}</p>
                    </div>

                    {/* Add Row Section */}
                    <motion.div 
                        variants={itemVariants}
                        className="mb-8 bg-white p-6 rounded-lg shadow-md border border-gray-200 bg-gradient-to-b from-white to-gray-50"
                    >
                        <h3 className="text-lg font-medium mb-4 text-gray-800 flex items-center border-b pb-3">
                            <FiPlus className="mr-2 text-indigo-500" />
                            Add New Row
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            {tableData.fields.map((field, index) => (
                                <motion.div 
                                    key={index} 
                                    className="mb-2"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                >
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {field.name}
                                    </label>
                                    {field.type === 'enum' ? (
                                        <select
                                            value={newRow[field.name] || ''}
                                            onChange={(e) => handleNewRowChange(field.name, e.target.value)}
                                            className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md transition-all duration-200 hover:border-indigo-300"
                                        >
                                            <option value="">Select {field.name}</option>
                                            {field.options?.map((option, i) => (
                                                <option key={i} value={option}>{option}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <input
                                            type={field.type}
                                            placeholder={`Enter ${field.name}`}
                                            value={newRow[field.name] || ''}
                                            onChange={(e) => handleNewRowChange(field.name, e.target.value)}
                                            className="block w-full border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm py-2 px-3 transition-all duration-200 hover:border-indigo-300"
                                        />
                                    )}
                                </motion.div>
                            ))}
                        </div>
                        <div className="mt-5 flex justify-end">
                            <motion.button 
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={handleAddRow}
                                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-300"
                                disabled={isLoading}
                            >
                                <MdAddBox className="mr-2 -ml-1 h-5 w-5" />
                                Add Row
                            </motion.button>
                        </div>
                    </motion.div>

                    {/* table Section */}
                    <motion.div 
                        variants={itemVariants}
                        className='bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden mb-6'
                    >
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                                    <tr>
                                        {tableData.fields.map((field, index) => (
                                            <th
                                                key={field.name}
                                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                            >
                                                {field.name}
                                            </th>
                                        ))}
                                        <th className="relative px-6 py-3">
                                            <span className="sr-only">Actions</span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {tableData.rows.map((row, rowIndex) => (
                                        <motion.tr
                                            key={rowIndex}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: rowIndex * 0.05 }}
                                            className="hover:bg-indigo-50 transition-colors"
                                        >
                                            {tableData.fields.map((field, colIndex) => (
                                                <td
                                                    key={colIndex}
                                                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                                                >
                                                    {editingRow === rowIndex ? (
                                                        field.type === 'enum' ? (
                                                            <select
                                                                value={row[field.name] || ''}
                                                                onChange={(e) => handleUpdateRow(rowIndex, field.name, e.target.value)}
                                                                className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                                                            >
                                                                <option value="">Select {field.name}</option>
                                                                {field.options?.map((option, i) => (
                                                                    <option key={i} value={option}>{option}</option>
                                                                ))}
                                                            </select>
                                                        ) : (
                                                            <input
                                                                type={field.type}
                                                                value={row[field.name] || ''}
                                                                onChange={(e) => handleUpdateRow(rowIndex, field.name, e.target.value)}
                                                                className="block w-full border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm py-2 px-3"
                                                            />
                                                        )
                                                    ) : (
                                                        <span className="font-medium text-gray-800">{row[field.name]}</span>
                                                    )}
                                                </td>
                                            ))}
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <div className='flex gap-2 justify-end'>
                                                    <motion.button
                                                        whileHover={{ scale: 1.1 }}
                                                        whileTap={{ scale: 0.95 }}
                                                        onClick={() => editingRow === rowIndex ? setEditingRow(null) : handleEditRow(rowIndex)}
                                                        className="text-indigo-600 hover:text-indigo-900 p-2 rounded-full hover:bg-indigo-100 transition-all duration-200"
                                                    >
                                                        {editingRow === rowIndex ? 'Save' : <MdModeEditOutline size={18} />}
                                                    </motion.button>
                                                    <motion.button
                                                        whileHover={{ scale: 1.1 }}
                                                        whileTap={{ scale: 0.95 }}
                                                        onClick={() => handleDelRow(rowIndex)}
                                                        className="text-red-600 hover:text-red-900 p-2 rounded-full hover:bg-red-100 transition-all duration-200"
                                                    >
                                                        <IoMdTrash size={18} />
                                                    </motion.button>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))}
                                    {tableData.rows.length === 0 && (
                                        <tr>
                                            <td colSpan={tableData.fields.length + 1} className="px-6 py-10 text-center text-gray-500">
                                                <div className="flex flex-col items-center">
                                                    <svg className="w-12 h-12 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                                                    </svg>
                                                    <p className="text-lg font-medium">No data available</p>
                                                    <p className="text-sm text-gray-400">Add a row to get started with your table</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>

                    <motion.div 
                        variants={itemVariants}
                        className="flex justify-end"
                    >
                        <motion.button 
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleSaveData}
                            className="inline-flex items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-300"
                            disabled={isLoading}
                        >
                            <MdSave className="mr-2 -ml-1 h-5 w-5" />
                            {isLoading ? 'Saving...' : 'Save Tool'}
                        </motion.button>
                    </motion.div>
                </motion.div>
            )}

            {/* No tools state */}
            {tools.length === 0 && !tableData.fields.length && !isLoading && (
                <motion.div 
                    variants={itemVariants}
                    className="bg-white rounded-lg shadow-md p-10 text-center mt-8"
                >
                    <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                    </svg>
                    <h3 className="text-xl font-medium text-gray-900 mb-2">No tools created yet</h3>
                    <p className="text-gray-500 mb-6">Use the generator above to create your first tool</p>
                </motion.div>
            )}
        </motion.div>
    )
}

export default Home