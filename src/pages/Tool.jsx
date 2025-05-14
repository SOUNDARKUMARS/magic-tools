import React, { useEffect, useState } from 'react'
import { supabase } from '../supabase-client'
import { useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Button, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from '@heroui/react'
import { MdModeEditOutline, MdAddBox, MdSettings, MdVisibility, MdVisibilityOff, MdSave, MdDone, MdAutoAwesome } from 'react-icons/md'
import { IoMdTrash } from 'react-icons/io'
import { FiColumns, FiDownload, FiPlus } from 'react-icons/fi'
import { useTypewriter } from '../utils/typedText'
import { FaCheck, FaSort, FaSortUp, FaSortDown } from 'react-icons/fa'

function Tool() {
    
    const { id } = useParams()
    const [isLoading, setIsLoading] = useState(null)
    const [tool, setTool] = useState(null)
    const [tableData, setTableData] = useState({ fields: [], rows: [] })
    const [newRow, setNewRow] = useState({})
    const [newField, setNewField] = useState({ name: '', type: 'text', options: [] })
    const [editingRow, setEditingRow] = useState(null)
    const [isColumnModalOpen, setIsColumnModalOpen] = useState(false)
    const [hiddenColumns, setHiddenColumns] = useState(JSON.parse(localStorage.getItem('hiddenColumns')) || [])
    const [columnOrder, setColumnOrder] = useState([])
    const [showSuccessMessage, setShowSuccessMessage] = useState(false)
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' })

    const [toolSummaryPrompt, setToolSummaryPrompt] = useState('')
    const [toolSummaryResponse, setToolSummaryResponse] = useState('')

    const typedText = useTypewriter(toolSummaryResponse);
    const API_KEY =  "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"
    const API_URL =  "https://openrouter.ai/api/v1/chat/completions"

    // Animation variants
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

    useEffect(() => {
        fetchTools()
    }, [])

    useEffect(() => {
        if (tool?.table_data?.fields) {
            setTableData(tool.table_data)
            setColumnOrder(tool.table_data.fields.map(f => f.name))

            // Initialize empty row
            const emptyRow = {}
            tool.table_data.fields.forEach(field => {
                emptyRow[field.name] = ''
            })
            setNewRow(emptyRow)
        }
    }, [tool])

    const handleToolSummary = async () => {
        setIsLoading('summary')
        try {
            const res = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'microsoft/mai-ds-r1:free',
                    messages: [
                        {
                            role: 'user',
                            content: `
                            You are a data analysis assistant.
                            
                            Below is the table data from my custom tool. Focus only on analyzing the data — do not explain the tool name or purpose unless it's essential to your insight.
                            
                            Columns:
                            ${tableData.fields.map(f => `- ${f.name} (${f.type}${f.options ? `: ${f.options.join(', ')}` : ''})`).join('\n')}
                            
                            Rows:
                            ${tableData.rows.map((row, idx) => `Row ${idx + 1}: ${JSON.stringify(row)}`).join('\n')}
                            
                            Your Task:
                            - Analyze and identify patterns, trends, or insights from this data.
                            - Mention interesting correlations or outliers (e.g., big amounts, frequent categories, anomalies).
                            - Comment on data distributions (e.g., which category is used most, average values, etc.).
                            -and an overall summary of the table.
                            - Output ONLY valid JSON with one key: "summary"
                            - Format the summary using inner HTML (e.g., <b>, <br>) where appropriate.
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

            // cleaning the res - (removing ``` like this)
            const cleanedContent = rawContent
                .replace(/```json\n?/g, '')
                .replace(/```\n?/g, '')
                .trim()

            const parsedResponse = JSON.parse(cleanedContent)
            setToolSummaryResponse(parsedResponse.summary)

        } catch (error) {
            console.error("Failed to fetch response:", error)
        } finally {
            setIsLoading(null)
        }
    }


    const fetchTools = async () => {
        setIsLoading("fetching")
        const { data, error } = await supabase.from('tools').select('*').eq('id', id)
        if (error) {
            console.error("Failed to fetch tool:", error)
        } else {
            console.log("Tool fetched successfully:", data)
            setTool(data[0])
        }
        setIsLoading(null)
    }

    const handleAddRow = () => {
        const updatedData = {
            ...tableData,
            rows: [...tableData.rows, newRow]
        }

        setTableData(updatedData)

        // Reset newRow with empty values
        const emptyRow = {}
        tableData.fields.forEach(field => {
            emptyRow[field.name] = ''
        })
        setNewRow(emptyRow)
    }

    const handleAddField = () => {
        if (!newField.name) return;

        // Update tableData with the new field
        const updatedData = {
            ...tableData,
            fields: [...tableData.fields, newField]
        }

        setTableData(updatedData)

        // Add the new field to column order
        setColumnOrder(prev => [...prev, newField.name])

        // Update newRow to include the new field
        setNewRow(prev => ({
            ...prev,
            [newField.name]: ''
        }))

        // Reset newField
        setNewField({ name: '', type: 'text', options: [] })
        setIsColumnModalOpen(false)
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
        if (window.confirm('Are you sure you want to delete this row?')) {
            const updatedData = {
                ...tableData,
                rows: tableData.rows.filter((_, index) => index !== ind)
            }
            setTableData(updatedData)
        }
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
        setIsLoading('saving')
        const { data, error } = await supabase.from('tools').update({ table_data: tableData }).eq('id', id)
        if (error) {
            console.error("Failed to save data:", error)
            alert("Failed to save data")
        } else {
            console.log("Data saved successfully:", data)
            setShowSuccessMessage(true)
            setTimeout(() => setShowSuccessMessage(false), 3000)
        }
        setIsLoading(null)
    }

    const toggleColumnVisibility = (columnName) => {
        setHiddenColumns(prev =>
            prev.includes(columnName)
                ? prev.filter(col => col !== columnName)
                : [...prev, columnName]
        )

    }

    const visibleColumns = tableData.fields.filter(field => !hiddenColumns.includes(field.name))
        .sort((a, b) => columnOrder.indexOf(a.name) - columnOrder.indexOf(b.name))

    // Sorting function
    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (name) => {
        if (sortConfig.key === name) {
            return sortConfig.direction === 'ascending' ? <FaSortUp className="ml-1" /> : <FaSortDown className="ml-1" />;
        }
        return <FaSort className="ml-1 opacity-50" />;
    };

    // Get sorted data
    const sortedData = React.useMemo(() => {
        let sortableItems = [...tableData.rows];
        if (sortConfig.key !== null) {
            sortableItems.sort((a, b) => {
                if (a[sortConfig.key] === null || a[sortConfig.key] === undefined) return 1;
                if (b[sortConfig.key] === null || b[sortConfig.key] === undefined) return -1;
                
                const aValue = a[sortConfig.key].toString().toLowerCase();
                const bValue = b[sortConfig.key].toString().toLowerCase();
                
                // Check if values are numeric
                const aNum = Number(a[sortConfig.key]);
                const bNum = Number(b[sortConfig.key]);
                
                if (!isNaN(aNum) && !isNaN(bNum)) {
                    return sortConfig.direction === 'ascending' ? aNum - bNum : bNum - aNum;
                }
                
                // Otherwise sort as strings
                if (aValue < bValue) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [tableData.rows, sortConfig]);

    if (isLoading === "fetching" && !tool) {
        return (
            <div className="flex flex-col space-y-6 p-4 max-w-6xl mx-auto">
                {/* Skeleton for tool header */}
                <div className="h-24 w-full bg-gray-200 rounded-lg animate-pulse mb-6"></div>

                {/* Skeleton for action buttons */}
                <div className="flex justify-end gap-2 mb-6">
                    <div className="h-10 w-32 bg-gray-200 rounded-md animate-pulse"></div>
                    <div className="h-10 w-32 bg-gray-200 rounded-md animate-pulse"></div>
                </div>

                {/* Skeleton for add row section */}
                <div className="h-64 w-full bg-gray-200 rounded-lg animate-pulse mb-6"></div>

                {/* Skeleton for table */}
                <div className="w-full bg-gray-200 rounded-lg animate-pulse">
                    <div className="h-10 w-full bg-gray-300 animate-pulse"></div>
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-12 w-full bg-gray-100 animate-pulse mt-1"></div>
                    ))}
                </div>
            </div>
        )
    }
   

    return (
        <div className='p-4 max-w-6xl mx-auto'>
            {tool && (
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className='w-full mt-8'
                >
                    {/* Success message */}
                    <AnimatePresence>
                        {showSuccessMessage && (
                            <motion.div
                                initial={{ opacity: 0, y: -50 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -50 }}
                                className="fixed top-4 right-4 bg-gradient-to-r from-green-400 to-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center"
                            >
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                                </svg>
                                Changes saved successfully!
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* tool header */}
                    <motion.div
                        variants={itemVariants}
                        className='flex justify-between items-center mb-8'
                    >
                        <div className="px-6 py-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow-lg text-white w-full">
                            <h2 className='text-3xl font-bold text-white mb-2'>{tool.title}</h2>
                            <p className='text-white text-opacity-90'>{tool.description}</p>
                        </div>
                    </motion.div>
                    {/* actions buttons */}
                    <div className="flex justify-end mb-4 gap-3">
                        <Button
                            onPress={()=>alert('Coming Soon')}
                            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            <FiDownload className="mr-2 h-5 w-5" />
                            Download Data
                        </Button>
                        <Button isLoading={isLoading === 'summary'}
                            onPress={handleToolSummary}
                            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            <MdAutoAwesome className="mr-2 h-5 w-5" />
                            {isLoading === 'summary' ? 'Summarizing...' : 'Summarize Table'}
                        </Button>
                        <Button
                            onPress={() => setIsColumnModalOpen(true)}
                            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-purple-500 hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                        >
                            <FiColumns className="mr-2 h-5 w-5" />
                            Manage Columns
                        </Button>

                        <Button
                            onPress={handleSaveData}
                            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-green-500 hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                            disabled={isLoading}
                        >
                            <MdSave className="mr-2 h-5 w-5" />
                            {isLoading === 'saving' ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>

                    {/* table Section */}
                    <motion.div
                        variants={itemVariants}
                        className='bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden mb-6'
                    >
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                                    <tr>
                                        {visibleColumns.map((field, index) => (
                                            <th
                                                key={field.name}
                                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer group"
                                                onClick={() => requestSort(field.name)}
                                            >
                                                <div className="flex items-center">
                                                    {field.name}
                                                    <span className="ml-1 text-gray-400 group-hover:text-gray-700">
                                                        {getSortIcon(field.name)}
                                                    </span>
                                                </div>
                                            </th>
                                        ))}
                                        <th className="relative px-6 py-3">
                                            <span className="sr-only">Actions</span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {sortedData.map((row, rowIndex) => (
                                        <motion.tr
                                            key={rowIndex}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: rowIndex * 0.05 }}
                                            className="hover:bg-indigo-50 transition-colors"
                                        >
                                            {visibleColumns.map((field, colIndex) => (
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
                                                    <Button isIconOnly variant='light' className='hover:text-blue-600 text-gray-500'
                                                        onPress={() => editingRow === rowIndex ? setEditingRow(null) : handleEditRow(rowIndex)}
                                                    >
                                                        {editingRow === rowIndex ?"Save": <MdModeEditOutline size={18} />}
                                                    </Button>
                                                    <Button isIconOnly
                                                        onPress={() => handleDelRow(rowIndex)} variant='light' className='hover:text-red-600 text-gray-500'
                                                    >
                                                        <IoMdTrash size={18} />
                                                    </Button>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))}
                                    {tableData.rows.length === 0 && (
                                        <tr>
                                            <td colSpan={visibleColumns.length + 1} className="px-6 py-10 text-center text-gray-500">
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

                    {/* tool summary */}
                    {isLoading === 'summary' ? (
                       <motion.div
                       variants={itemVariants}
                       className="mb-8 flex flex-col gap-3 py-6 bg-white p-6 rounded-lg shadow-md border border-gray-200 bg-gradient-to-b from-white to-gray-50"
                    >
                            <h3 className="text-lg font-medium mb-4 text-gray-800 flex items-center border-b pb-3">
                                Tool Summary
                            </h3>
                            <div className="w-full max-w-2xl h-4 bg-gray-200 rounded-full animate-pulse"></div>
                            <div className="w-full max-w-xl h-4 bg-gray-200 rounded-full animate-pulse"></div>
                            <div className="w-full max-w-lg h-4 bg-gray-200 rounded-full animate-pulse"></div>
                        </motion.div>
                    ) : isLoading === null && toolSummaryResponse && (
                        <motion.div
                            variants={itemVariants}
                            className="mb-8 bg-white p-6 rounded-lg shadow-md border border-gray-200 bg-gradient-to-b from-white to-gray-50"
                        >
                            <h3 className="text-lg font-medium mb-4 text-gray-800 flex items-center border-b pb-3">
                                Tool Summary
                            </h3>
                            <p className='text-gray-600' dangerouslySetInnerHTML={{ __html: toolSummaryResponse }} />
                        </motion.div>
                    )}

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
                            {visibleColumns.map((field, index) => (
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
                                            style={{textTransform: 'capitalize'}}
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
                                            style={{textTransform: 'capitalize'}}
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

                    {/* Column Management Modal */}
                    <Modal scrollBehavior='inside' isOpen={isColumnModalOpen} onOpenChange={setIsColumnModalOpen}>
                        <ModalContent>
                            {(onClose) => (
                                <>
                                    <ModalHeader className="flex flex-col gap-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
                                        Manage Columns
                                    </ModalHeader>
                                    <ModalBody>
                                        <div className="space-y-4">
                                            <div className="border-b pb-4">
                                                <h4 className="text-lg font-medium mb-3 text-gray-800">Add New Column</h4>
                                                <div className="space-y-3">
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                                            Column Name
                                                        </label>
                                                        <input
                                                            placeholder="Enter column name"
                                                            value={newField.name}
                                                            onChange={(e) => setNewField(prev => ({ ...prev, name: e.target.value }))}
                                                            className="block w-full border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm py-2 px-3"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                                            Column Type
                                                        </label>
                                                        <select
                                                            value={newField.type}
                                                            onChange={(e) => setNewField(prev => ({ ...prev, type: e.target.value }))}
                                                            className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                                                        >
                                                            <option value="text">Text</option>
                                                            <option value="number">Number</option>
                                                            <option value="enum">Enum</option>
                                                            <option value="date">Date</option>
                                                        </select>
                                                    </div>
                                                    {newField.type === 'enum' && (
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                Options (comma separated)
                                                            </label>
                                                            <input
                                                                placeholder="Option1, Option2, Option3"
                                                                onChange={(e) => setNewField(prev => ({
                                                                    ...prev,
                                                                    options: e.target.value.split(',').map(o => o.trim()).filter(Boolean)
                                                                }))}
                                                                className="block w-full border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm py-2 px-3"
                                                            />
                                                        </div>
                                                    )}
                                                    <Button
                                                        onClick={handleAddField}
                                                        disabled={!newField.name}
                                                        color="primary"
                                                        className="w-full"
                                                    >
                                                        Add Column
                                                    </Button>
                                                </div>
                                            </div>

                                            <div>
                                                <h4 className="text-lg font-medium mb-3 text-gray-800">Visible Columns</h4>
                                                <div className="space-y-2">
                                                    {tableData.fields.map((field, index) => (
                                                        <motion.div
                                                            key={field.name}
                                                            initial={{ opacity: 0, x: -20 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            transition={{ delay: index * 0.05 }}
                                                            className="flex items-center justify-between p-3 bg-gray-50 rounded border border-gray-200 hover:bg-gray-100 transition-colors"
                                                        >
                                                            <span className="font-medium">{field.name}</span>
                                                            <Button
                                                                size="sm"
                                                                color={hiddenColumns.includes(field.name) ? "default" : "primary"}
                                                                variant="flat"
                                                                onPress={() => toggleColumnVisibility(field.name)}
                                                            >
                                                                {hiddenColumns.includes(field.name) ?
                                                                    <MdVisibilityOff size={20} /> :
                                                                    <MdVisibility size={20} />
                                                                }
                                                            </Button>
                                                        </motion.div>
                                                    ))}
                                                    {tableData.fields.length === 0 && (
                                                        <div className="text-center text-gray-500 py-4">
                                                            <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                                                            </svg>
                                                            <p>No columns available. Add a column to get started.</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </ModalBody>
                                    <ModalFooter>
                                        <Button color="primary" onPress={() => {
                                            localStorage.setItem('hiddenColumns', JSON.stringify(hiddenColumns))
                                            onClose()
                                        }}>
                                            Done
                                        </Button>
                                    </ModalFooter>
                                </>
                            )}
                        </ModalContent>
                    </Modal>
                </motion.div>
            )}
        </div>
    )
}

export default Tool