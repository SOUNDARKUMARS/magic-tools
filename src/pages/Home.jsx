import React, { useEffect, useState } from 'react'
import { Button, Input, Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from '@heroui/react'
import { MdModeEditOutline } from "react-icons/md";
import { IoMdTrash } from "react-icons/io";

function Home() {
    const [prompt, setPrompt] = useState('')
    const [response, setResponse] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [tableData, setTableData] = useState({ fields: [], rows: [] })
    const [newRow, setNewRow] = useState({})
    const [editingRow, setEditingRow] = useState(null)

    const API_KEY = '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'
    const API_URL = 'https://openrouter.ai/api/v1/chat/completions'

    const handleClick = async () => {
        if (!prompt.trim()) return
        setIsLoading(true)
        try {
            const res = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'google/gemma-3-27b-it:free',
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
                throw new Error(`error in getting response! status: ${res.status}`)
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
      
    const handleSaveData = () => {
        localStorage.setItem('tableData', JSON.stringify(tableData))
    }

    const handleLoadData = () => {
        const storedData = localStorage.getItem('tableData')
        if(storedData){
            setTableData(JSON.parse(storedData))
        }
    }

    useEffect(()=>{
        handleLoadData()
    },[])

    return (
        <div className='flex flex-col items-center w-3/4 mx-auto gap-4 py-8'>
            <h1 className='text-2xl font-bold mb-4'>Magic Tool Generator</h1>
            <div className='w-full flex gap-2'>
                <Input 
                    className='flex-1'
                    placeholder='Describe the tool you want to create...' 
                    value={prompt}
                    onValueChange={setPrompt} 
                />
                <Button 
                    className='px-4'
                    onPress={handleClick}
                    isLoading={isLoading}
                >
                    Generate Tool
                </Button>
            </div>

            {tableData.fields.length > 0 && (
                <div className='w-full mt-8'>
                    <div className='flex justify-between items-center mb-4'>
                        <div>
                            <h2 className='text-xl font-semibold'>{tableData.tool_name}</h2>
                            <p className='text-gray-600'>{tableData.purpose}</p>
                        </div>
                    </div>

                    <Table aria-label="Generated tool table">
                        <TableHeader>
                            {tableData.fields.map((field, index) => (
                                <TableColumn key={index}>{field.name}</TableColumn>
                            ))}
                            <TableColumn>Actions</TableColumn>
                        </TableHeader>
                        <TableBody>
                            {tableData.rows.map((row, rowIndex) => (
                                <TableRow key={rowIndex}>
                                    {tableData.fields.map((field, colIndex) => (
                                        <TableCell key={colIndex}>
                                            {editingRow === rowIndex ? (
                                                field.type === 'enum' ? (
                                                    <select
                                                        value={row[field.name]}
                                                        onChange={(e) => handleUpdateRow(rowIndex, field.name, e.target.value)}
                                                        className='border rounded px-2 py-1'
                                                    >
                                                        {field.options?.map((option, i) => (
                                                            <option key={i} value={option}>{option}</option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <Input
                                                        type={field.type}
                                                        value={row[field.name]}
                                                        onValueChange={(value) => handleUpdateRow(rowIndex, field.name, value)}
                                                    />
                                                )
                                            ) : (
                                                row[field.name]
                                            )}
                                        </TableCell>
                                    ))}
                                    <TableCell>
                                        <div className='flex gap-2'>
                                            <Button
                                                size="sm"
                                                onPress={() => editingRow === rowIndex ? setEditingRow(null) : handleEditRow(rowIndex)}
                                            >
                                                {editingRow === rowIndex ? 'Save' : <MdModeEditOutline size={18} color='blue'/>}
                                            </Button>
                                            <Button
                                                size="sm"
                                                onPress={() => handleDelRow(rowIndex)}
                                            >
                                              <IoMdTrash size={18} color='red'/>
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            <TableRow>
                                {tableData.fields.map((field, index) => (
                                    <TableCell key={index}>
                                        {field.type === 'enum' ? (
                                            <select
                                                value={newRow[field.name]}
                                                onChange={(e) => handleNewRowChange(field.name, e.target.value)}
                                                className='border rounded px-2 py-1'
                                            >
                                                <option value="">Select...</option>
                                                {field.options?.map((option, i) => (
                                                    <option key={i} value={option}>{option}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <Input
                                                type={field.type}
                                                placeholder={`Enter ${field.name.toLowerCase()}`}
                                                value={newRow[field.name]}
                                                onValueChange={(value) => handleNewRowChange(field.name, value)}
                                            />
                                        )}
                                    </TableCell>
                                ))}
                                <TableCell>
                                    <Button size="sm" className='w-full' onPress={handleAddRow}>Add Row</Button>
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </div>
            )}
            <Button onPress={handleSaveData}>Save Data</Button>
        </div>
    )
}

export default Home

// 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