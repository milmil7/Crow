import React, { useState, useEffect, useRef, useCallback } from 'react';
import {webviewWindow} from "@tauri-apps/api";


export const TitleBar = ({ title }) => {

  const handleClose = () => webviewWindow.WebviewWindow.getCurrent().close();
  const handleMinimize = () => webviewWindow.getCurrentWebviewWindow().minimize();
  const handleMaximize = () => webviewWindow.getCurrentWebviewWindow().toggleMaximize();

  return (
    <div data-tauri-drag-region className="flex justify-between items-center bg-gray-900 text-white px-2 ps-0 border-b-2 border-black">
      <h1 data-tauri-drag-region className="text-md m-1 font-extrabold flex items-center">
        <span className="bg-yellow-300 text-black px-2 py-1 rounded-md shadow-[2px_2px_0px_rgba(0,0,0,1)]">
          {title}
        </span>
      </h1>
      <div className="flex items-center space-x-2">


        <button
          onClick={handleMinimize}
          className="w-6 h-6 flex items-center justify-center bg-gray-600 rounded-full border border-black
                     shadow-[1px_1px_0px_rgba(0,0,0,1)] hover:bg-gray-700 transition-colors"
          title="Minimize"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>

        <button
          onClick={handleMaximize}
          className="w-6 h-6 flex items-center justify-center bg-gray-600 rounded-full border border-black
                     shadow-[1px_1px_0px_rgba(0,0,0,1)] hover:bg-gray-700 transition-colors"
          title="Maximize"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          </svg>
        </button>

        <button
          onClick={handleClose}
          className="w-6 h-6 flex items-center justify-center bg-red-500 rounded-full border border-black
                     shadow-[1px_1px_0px_rgba(0,0,0,1)] hover:bg-red-600 transition-colors"
          title="Close"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    </div>
  );
};



const App = () => {
  const [tabs, setTabs] = useState([]);
  const [activeTabId, setActiveTabId] = useState(null);
  const nextTabIdRef = useRef(1);
  const draggedTabId = useRef(null);
  const dragOverTabId = useRef(null);
  const [responseBody, setResponseBody] = useState('');
  const [prettyResponseBody, setPrettyResponseBody] = useState('');
  const [responseHeaders, setResponseHeaders] = useState({});
  const [statusCode, setStatusCode] = useState(null);
  const [responseTime, setResponseTime] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeResponseTab, setActiveResponseTab] = useState('pretty');
  const [history, setHistory] = useState([]);
  const [collections, setCollections] = useState([]);
  const [environments, setEnvironments] = useState([]);
  const nextEnvIdRef = useRef(1);
  const [showSaveToCollectionModal, setShowSaveToCollectionModal] = useState(false);
  const [selectedCollectionToSave, setSelectedCollectionToSave] = useState('');
  const [newCollectionName, setNewCollectionName] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmModalMessage, setConfirmModalMessage] = useState('');
  const [confirmModalAction, setConfirmModalAction] = useState(() => {});


  const newCollectionInputRef = useRef(null);
  useEffect(() => {

    const savedHistory = localStorage.getItem('postman_history');
    if (savedHistory) {
      try {
        const parsedHistory = JSON.parse(savedHistory);

        setHistory(parsedHistory.map(item => ({
          ...item,
          timestamp: item.timestamp ? new Date(item.timestamp) : new Date()
        })).sort((a, b) => b.timestamp - a.timestamp));
      } catch (e) {
        console.error("Error parsing history from localStorage:", e);
        setHistory([]);
      }
    } else {
      setHistory([]);
    }


    const savedCollections = localStorage.getItem('postman_collections');
    if (savedCollections) {
      try {
        setCollections(JSON.parse(savedCollections));
      } catch (e) {
        console.error("Error parsing collections from localStorage:", e);
        setCollections([]);
      }
    } else {
      setCollections([]);
    }


    const savedEnvironments = localStorage.getItem('postman_environments');
    if (savedEnvironments) {
      try {
        const parsedEnvironments = JSON.parse(savedEnvironments);

        let maxId = 0;
        const processedEnvs = parsedEnvironments.map((env, index) => {
          const id = env.id || (index + 1);
          if (typeof id === 'number') maxId = Math.max(maxId, id);
          return { ...env, id: id, key: env.key || '', value: env.value || '' };
        });
        nextEnvIdRef.current = maxId + 1;

        const hasEmptyRow = processedEnvs.some(env => env.key === '' && env.value === '');
        if (!hasEmptyRow) {
          setEnvironments([...processedEnvs, { id: nextEnvIdRef.current++, key: '', value: '' }]);
        } else {
          setEnvironments(processedEnvs);
        }
      } catch (e) {
        console.error("Error parsing environments from localStorage:", e);
        setEnvironments([]);
        nextEnvIdRef.current = 1;
      }
    } else {
      setEnvironments([{ id: nextEnvIdRef.current++, key: '', value: '' }]);
    }
  }, []);


  useEffect(() => {
  if (history.length > 0) {
    localStorage.setItem('postman_history', JSON.stringify(history));
  }
}, [history]);

useEffect(() => {
  if (collections.length > 0) {
    localStorage.setItem('postman_collections', JSON.stringify(collections));
  }
}, [collections]);

useEffect(() => {
  const environmentsToSave = environments.filter(env => env.key !== '' || env.value !== '');
  if (environmentsToSave.length > 0) {
    localStorage.setItem('postman_environments', JSON.stringify(environmentsToSave));
  }
}, [environments]);


  const addTab = useCallback((initialState = {}) => {
    const newId = nextTabIdRef.current++;
    const newTab = {
      id: newId,
      title: initialState.title || `New Tab ${newId}`,
      url: initialState.url || 'https://jsonplaceholder.typicode.com/posts',
      method: initialState.method || 'GET',
      requestBody: initialState.requestBody || '',
      requestHeaders: initialState.requestHeaders || [{ id: 1, key: '', value: '' }],
      queryParams: initialState.queryParams || [{ id: 1, key: '', value: '' }],
      authType: initialState.authType || 'none',
      bearerToken: initialState.bearerToken || '',
      basicAuthUsername: initialState.basicAuthUsername || '',
      basicAuthPassword: initialState.basicAuthPassword || '',
      responseBody: initialState.responseBody || '',
      prettyResponseBody: initialState.prettyResponseBody || '',
      responseHeaders: initialState.responseHeaders || {},
      statusCode: initialState.statusCode || null,
      responseTime: initialState.responseTime || null,
      activeRequestTab: initialState.activeRequestTab || 'body',
    };
    setTabs(prevTabs => [...prevTabs, newTab]);
    setActiveTabId(newId);
  }, []);


  useEffect(() => {
    if (tabs.length === 0) {
      addTab({ title: "Tab 1" });
    }
  }, [tabs.length, addTab]);


  useEffect(() => {
    const activeTab = tabs.find(tab => tab.id === activeTabId);
    if (activeTab) {
      setResponseBody(activeTab.responseBody);
      setPrettyResponseBody(activeTab.prettyResponseBody);
      setResponseHeaders(activeTab.responseHeaders);
      setStatusCode(activeTab.statusCode);
      setResponseTime(activeTab.responseTime);
      setIsLoading(false);
    }
  }, [activeTabId, tabs]);

  const closeTab = (idToClose) => {
    setTabs(prevTabs => {
      const updatedTabs = prevTabs.filter(tab => tab.id !== idToClose);
      if (updatedTabs.length === 0) {
        addTab({ title: "New Request" });
        return [];
      }
      if (activeTabId === idToClose) {
        setActiveTabId(updatedTabs[0].id);
      }
      return updatedTabs;
    });
  };

  const updateActiveTabContent = useCallback((field, value) => {
    setTabs(prevTabs =>
      prevTabs.map(tab =>
        tab.id === activeTabId ? { ...tab, [field]: value } : tab
      )
    );
  }, [activeTabId]);

  const getActiveTab = useCallback(() => {
    return tabs.find(tab => tab.id === activeTabId) || tabs[0] || {};
  }, [tabs, activeTabId]);


  const addRow = (field, currentRows) => {
    updateActiveTabContent(field, [...currentRows, { id: currentRows.length + 1, key: '', value: '' }]);
  };

  const removeRow = (field, currentRows, id) => {
    updateActiveTabContent(field, currentRows.filter(row => row.id !== id));
  };

  const updateRow = (field, currentRows, id, subField, value) => {
    updateActiveTabContent(field, currentRows.map(row =>
      row.id === id ? { ...row, [subField]: value } : row
    ));
  };



  const addEnvironmentVariable = () => {
    setEnvironments(prevEnvs => [...prevEnvs, { id: nextEnvIdRef.current++, key: '', value: '' }]);
  };

  const updateEnvironmentVariable = (id, field, value) => {
    setEnvironments(prevEnvs => {
      const updatedEnvs = prevEnvs.map(env =>
        env.id === id ? { ...env, [field]: value } : env
      );

      const lastEnv = updatedEnvs[updatedEnvs.length - 1];
      if (lastEnv && lastEnv.id === id && lastEnv.key !== '' && lastEnv.value !== '') {
        return [...updatedEnvs, { id: nextEnvIdRef.current++, key: '', value: '' }];
      }
      return updatedEnvs;
    });
  };

  const removeEnvironmentVariable = (id) => {
    showConfirmation(`Are you sure you want to delete this environment variable?`, () => {
      setEnvironments(prevEnvs => {
        const filteredEnvs = prevEnvs.filter(env => env.id !== id);

        const hasEmptyRow = filteredEnvs.some(env => env.key === '' && env.value === '');
        if (filteredEnvs.length === 0 || (!hasEmptyRow && filteredEnvs[filteredEnvs.length - 1]?.key !== '' && filteredEnvs[filteredEnvs.length - 1]?.value !== '')) {
          return [...filteredEnvs, { id: nextEnvIdRef.current++, key: '', value: '' }];
        }
        return filteredEnvs;
      });
    });
  };


  const resolveEnvironmentVariables = useCallback((text) => {
    if (!text || typeof text !== 'string') return text;
    let resolvedText = text;
    environments.forEach(env => {
      if (env.key && env.value) {
        const regex = new RegExp(`\\$\\{${env.key}\\}`, 'g');
        resolvedText = resolvedText.replace(regex, env.value);
      }
    });
    return resolvedText;
  }, [environments]);


  const handleSendRequest = async () => {
    setIsLoading(true);
    setResponseBody('');
    setPrettyResponseBody('');
    setResponseHeaders({});
    setStatusCode(null);
    setResponseTime(null);

    const startTime = performance.now();
    const currentTab = getActiveTab();


    let requestUrl = resolveEnvironmentVariables(currentTab.url);
    const activeQueryParams = currentTab.queryParams.filter(p => p.key && p.value);
    if (activeQueryParams.length > 0) {
      const queryString = activeQueryParams
        .map(p => `${encodeURIComponent(resolveEnvironmentVariables(p.key))}=${encodeURIComponent(resolveEnvironmentVariables(p.value))}`)
        .join('&');
      requestUrl = `${requestUrl}?${queryString}`;
    }

    const headersToSend = new Headers();
    currentTab.requestHeaders.forEach(header => {
      if (header.key && header.value) {
        headersToSend.append(resolveEnvironmentVariables(header.key), resolveEnvironmentVariables(header.value));
      }
    });

    if (['POST', 'PUT', 'PATCH'].includes(currentTab.method) && currentTab.requestBody && !headersToSend.has('Content-Type')) {
      headersToSend.append('Content-Type', 'application/json');
    }

    if (currentTab.authType === 'bearer' && currentTab.bearerToken) {
      headersToSend.append('Authorization', `Bearer ${resolveEnvironmentVariables(currentTab.bearerToken)}`);
    } else if (currentTab.authType === 'basic' && currentTab.basicAuthUsername && currentTab.basicAuthPassword) {
      const credentials = btoa(`${resolveEnvironmentVariables(currentTab.basicAuthUsername)}:${resolveEnvironmentVariables(currentTab.basicAuthPassword)}`);
      headersToSend.append('Authorization', `Basic ${credentials}`);
    }

    const requestOptions = {
      method: currentTab.method,
      headers: headersToSend,
    };

    if (['POST', 'PUT', 'PATCH'].includes(currentTab.method) && currentTab.requestBody) {
      try {
        const resolvedRequestBody = resolveEnvironmentVariables(currentTab.requestBody);
        requestOptions.body = JSON.stringify(JSON.parse(resolvedRequestBody), null, 2);
      } catch (error) {
        const errorMessage = `Error: Invalid JSON in request body - ${error.message}`;
        setResponseBody(errorMessage);
        setPrettyResponseBody(errorMessage);
        setIsLoading(false);
        return;
      }
    }

    let response;
    let textData;
    let finalStatusCode = 'N/A';
    let finalResponseHeaders = {};
    let finalResponseBody = '';
    let finalPrettyResponseBody = '';

    try {
      response = await fetch(requestUrl, requestOptions);
      finalStatusCode = response.status;

      response.headers.forEach((value, key) => {
        finalResponseHeaders[key] = value;
      });

      textData = await response.text();
      finalResponseBody = textData;

      try {
        const jsonData = JSON.parse(textData);
        finalPrettyResponseBody = JSON.stringify(jsonData, null, 2);
      } catch (jsonError) {
        finalPrettyResponseBody = textData;
      }

    } catch (error) {
      finalResponseBody = `Network Error: ${error.message}`;
      finalPrettyResponseBody = `Network Error: ${error.message}`;
    } finally {
      const endTime = performance.now();
      const finalResponseTime = (endTime - startTime).toFixed(2);


      setTabs(prevTabs =>
        prevTabs.map(tab =>
          tab.id === activeTabId ? {
            ...tab,
            responseBody: finalResponseBody,
            prettyResponseBody: finalPrettyResponseBody,
            responseHeaders: finalResponseHeaders,
            statusCode: finalStatusCode,
            responseTime: parseFloat(finalResponseTime),
          } : tab
        )
      );


      setStatusCode(finalStatusCode);
      setResponseTime(parseFloat(finalResponseTime));
      setResponseHeaders(finalResponseHeaders);
      setResponseBody(finalResponseBody);
      setPrettyResponseBody(finalPrettyResponseBody);
      setIsLoading(false);


      setHistory(prevHistory => [{
        id: Date.now(),
        timestamp: new Date().toISOString(),
        url: currentTab.url,
        method: currentTab.method,
        requestBody: currentTab.requestBody,
        requestHeaders: currentTab.requestHeaders.filter(h => h.key && h.value),
        queryParams: currentTab.queryParams.filter(p => p.key && p.value),
        authType: currentTab.authType,
        bearerToken: currentTab.authType === 'bearer' ? currentTab.bearerToken : '',
        basicAuthUsername: currentTab.authType === 'basic' ? currentTab.basicAuthUsername : '',
        statusCode: finalStatusCode,
        responseTime: parseFloat(finalResponseTime),
        responseBody: finalResponseBody,
        responseHeaders: finalResponseHeaders,
      }, ...prevHistory].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
    }
  };


  const copyToClipboard = () => {
    const textarea = document.createElement('textarea');
    textarea.value = responseBody;
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      console.log('Response copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
    document.body.removeChild(textarea);
  };

  const clearAll = () => {
    updateActiveTabContent('url', 'https://jsonplaceholder.typicode.com/posts');
    updateActiveTabContent('method', 'GET');
    updateActiveTabContent('requestBody', '');
    updateActiveTabContent('requestHeaders', [{ id: 1, key: '', value: '' }]);
    updateActiveTabContent('queryParams', [{ id: 1, key: '', value: '' }]);
    updateActiveTabContent('authType', 'none');
    updateActiveTabContent('bearerToken', '');
    updateActiveTabContent('basicAuthUsername', '');
    updateActiveTabContent('basicAuthPassword', '');
    updateActiveTabContent('responseBody', '');
    updateActiveTabContent('prettyResponseBody', '');
    updateActiveTabContent('responseHeaders', {});
    updateActiveTabContent('statusCode', null);
    updateActiveTabContent('responseTime', null);
    setIsLoading(false);
    setActiveResponseTab('pretty');
  };


  const loadHistoryItem = (item) => {
    addTab({
      title: `${item.method} ${item.url.substring(0, 20)}...`,
      url: item.url,
      method: item.method,
      requestBody: item.requestBody || '',
      requestHeaders: item.requestHeaders || [{ id: 1, key: '', value: '' }],
      queryParams: item.queryParams || [{ id: 1, key: '', value: '' }],
      authType: item.authType || 'none',
      bearerToken: item.bearerToken || '',
      basicAuthUsername: item.basicAuthUsername || '',
      basicAuthPassword: '',
      responseBody: item.responseBody || '',
      prettyResponseBody: item.responseBody || '',
      responseHeaders: item.responseHeaders || {},
      statusCode: item.statusCode || null,
      responseTime: item.responseTime || null,
      activeRequestTab: 'body',
    });


  };

  const handleDeleteHistoryItem = (id) => {
    showConfirmation(`Are you sure you want to delete this history item?`, () => {
      setHistory(prevHistory => prevHistory.filter(item => item.id !== id));
    });
  };

  const handleClearHistory = () => {
    showConfirmation(`Are you sure you want to clear all history? This action cannot be undone.`, () => {
      setHistory([]);
    });
  };


  const handleSaveToCollection = () => {
    setShowSaveToCollectionModal(true);
    setSelectedCollectionToSave('');
    setNewCollectionName('');
    setTimeout(() => {
      if (newCollectionInputRef.current) {
        newCollectionInputRef.current.focus();
      }
    }, 0);
  };

  const handleCreateCollection = () => {
    if (!newCollectionName.trim()) return;
    setCollections(prevCollections => [...prevCollections, {
      id: Date.now(),
      name: newCollectionName.trim(),
      requests: [],
      createdAt: new Date().toISOString()
    }]);
    setNewCollectionName('');
    console.log("Collection created!");
  };

  const handleAddRequestToCollection = () => {
    if (!selectedCollectionToSave) return;

    const currentTab = getActiveTab();
    const requestToSave = {
      id: Date.now(),
      url: currentTab.url,
      method: currentTab.method,
      requestBody: currentTab.requestBody,
      requestHeaders: currentTab.requestHeaders.filter(h => h.key && h.value),
      queryParams: currentTab.queryParams.filter(p => p.key && p.value),
      authType: currentTab.authType,
      bearerToken: currentTab.authType === 'bearer' ? currentTab.bearerToken : '',
      basicAuthUsername: currentTab.authType === 'basic' ? currentTab.basicAuthUsername : '',
      name: `Request ${new Date().toLocaleTimeString()}`
    };

    setCollections(prevCollections =>
      prevCollections.map(col =>
        col.id === parseInt(selectedCollectionToSave)
          ? { ...col, requests: [...col.requests, requestToSave] }
          : col
      )
    );
    setShowSaveToCollectionModal(false);
    console.log("Request added to collection!");
  };

  const loadCollectionRequest = (request) => {
    addTab({
      title: `${request.method} ${request.url.substring(0, 20)}...`,
      url: request.url,
      method: request.method,
      requestBody: request.requestBody || '',
      requestHeaders: request.requestHeaders || [{ id: 1, key: '', value: '' }],
      queryParams: request.queryParams || [{ id: 1, key: '', value: '' }],
      authType: request.authType || 'none',
      bearerToken: request.bearerToken || '',
      basicAuthUsername: request.basicAuthUsername || '',
      basicAuthPassword: '',
      activeRequestTab: 'body',
    });
    setResponseBody('');
    setPrettyResponseBody('');
    setResponseHeaders({});
    setStatusCode(null);
    setResponseTime(null);
  };

  const handleDeleteCollection = (collectionId) => {
    showConfirmation(`Are you sure you want to delete this collection? This action cannot be undone.`, () => {
      setCollections(prevCollections => prevCollections.filter(col => col.id !== collectionId));
    });
  };

  const handleDeleteRequestFromCollection = (collectionId, requestToDeleteId) => {
    showConfirmation(`Are you sure you want to delete this request from the collection?`, () => {
      setCollections(prevCollections =>
        prevCollections.map(col =>
          col.id === collectionId
            ? { ...col, requests: col.requests.filter(req => req.id !== requestToDeleteId) }
            : col
        )
      );
    });
  };


  const showConfirmation = (message, action) => {
    setConfirmModalMessage(message);
    setConfirmModalAction(() => action);
    setShowConfirmModal(true);
  };

  const handleConfirm = () => {
    confirmModalAction();
    setShowConfirmModal(false);
  };

  const handleCancelConfirm = () => {
    setShowConfirmModal(false);
  };


  const handleDragStart = (e, id) => {
    draggedTabId.current = id;
    e.dataTransfer.effectAllowed = 'move';
    e.currentTarget.classList.add('dragging');
  };

  const handleDragEnter = (e, id) => {
    e.preventDefault();
    dragOverTabId.current = id;
    e.currentTarget.classList.add('drag-over');
  };

  const handleDragLeave = (e) => {
    e.currentTarget.classList.remove('drag-over');
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, targetId) => {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');

    const draggedId = draggedTabId.current;
    if (draggedId === targetId) return;

    setTabs(prevTabs => {
      const newTabs = [...prevTabs];
      const draggedIndex = newTabs.findIndex(tab => tab.id === draggedId);
      const targetIndex = newTabs.findIndex(tab => tab.id === targetId);

      if (draggedIndex === -1 || targetIndex === -1) return prevTabs;

      const [removed] = newTabs.splice(draggedIndex, 1);
      newTabs.splice(targetIndex, 0, removed);
      return newTabs;
    });
  };

  const handleDragEnd = (e) => {
    e.currentTarget.classList.remove('dragging');
    draggedTabId.current = null;
    dragOverTabId.current = null;
    const dragOverElements = document.querySelectorAll('.drag-over');
    dragOverElements.forEach(el => el.classList.remove('drag-over'));
  };

  const currentActiveTab = getActiveTab();


  const JsonTableViewer = ({ jsonData }) => {
    if (!jsonData) {
      return <p className="text-gray-50 text-center">No JSON data to display as table.</p>;
    }

    let parsedData;
    try {
      parsedData = JSON.parse(jsonData);
    } catch (e) {
      return <p className="text-red-600 text-center">Invalid JSON: {e.message}</p>;
    }


    if (Array.isArray(parsedData) && parsedData.length > 0 && typeof parsedData[0] === 'object') {
      const headers = Object.keys(parsedData[0]);
      return (
        <div className="overflow-x-auto border-2 border-black rounded-md shadow-[4px_4px_0px_rgba(0,0,0,1)]">
          <table className="min-w-full divide-y divide-gray-200 bg-gray-800">
            <thead className="bg-gray-500">
              <tr>
                {headers.map(header => (
                  <th key={header} className="px-2 py-1 text-left text-xs font-bold text-gray-50 uppercase tracking-wider border-b-2 border-black">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {parsedData.map((row, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-gray-500">
                  {headers.map(header => (
                    <td key={`${rowIndex}-${header}`} className="px-3 py-2 whitespace-nowrap text-sm text-gray-50 border-b border-gray-200">
                      {typeof row[header] === 'object' && row[header] !== null
                        ? JSON.stringify(row[header])
                        : String(row[header])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }


    if (typeof parsedData === 'object' && parsedData !== null) {
      return (
        <div className="overflow-x-auto border-2 border-black rounded-md shadow-[4px_4px_0px_rgba(0,0,0,1)]">
          <table className="min-w-full divide-y divide-gray-200 bg-gray-800">
            <thead className="bg-gray-500">
              <tr>
                <th className="px-2 py-1 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-black">Key</th>
                <th className="px-2 py-1 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-black">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {Object.entries(parsedData).map(([key, value]) => (
                <tr key={key} className="hover:bg-gray-50">
                  <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900 border-b border-gray-200">{key}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 border-b border-gray-200">
                    {typeof value === 'object' && value !== null
                      ? JSON.stringify(value)
                      : String(value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    return <p className="text-gray-600 text-center">JSON data is not in a supported table format (e.g., simple object or array of objects).</p>;
  };


  return (
    <div className="h-[calc(100vh-46px)] overflow-auto w-[calc(100vw-5px)] bg-gray-800 font-mono text-white justify-center">
      <style>{`
        .dragging {
          opacity: 0.5;
          border-style: dashed !important;
        }
        .drag-over {
          background-color: #e0e7ff !important;
        }

        /* For WebKit browsers (Chrome, Safari, Edge, Opera) */
::-webkit-scrollbar {
    width: 14px; /* Thickness of the scrollbar */
    height: 14px; /* Height for horizontal scrollbars */
    background-color: #fff; /* Background of the scrollbar track */
    border: 2px solid #000; /* Strong black border around the entire scrollbar */
}

/* The draggable scrolling handle */
::-webkit-scrollbar-thumb {
    background-color: #000; /* Black thumb */
    border: 2px solid #000; /* Strong black border on the thumb itself */
    border-radius: 0; /* Sharp, unrounded corners for the thumb */
}

/* The track (the non-moving part) */
::-webkit-scrollbar-track {
    background-color: #fff; /* White track */
    border: 2px solid #000; /* Border for the track, matches the scrollbar border */
    border-radius: 0; /* Sharp corners for the track */
}

/* The top-most button in a scrollbar */
::-webkit-scrollbar-button {
    display: block; /* Make sure buttons are visible */
    width: 14px;
    height: 14px;
    background-color: #ff00ff; /* A vibrant, contrasting color for buttons */
    border: 2px solid #000; /* Black border for buttons */
    border-radius: 0;
}

/* The corner where vertical and horizontal scrollbars meet */
::-webkit-scrollbar-corner {
    background-color: #00ff00; /* Another vibrant, contrasting color for the corner */
    border: 2px solid #000; /* Black border for the corner */
}

/* On hover for the thumb */
::-webkit-scrollbar-thumb:hover {
    background-color: #555; /* Slightly darker on hover */
}

/* On hover for the track (less common, but can add detail) */
::-webkit-scrollbar-track:hover {
    background-color: #f0f0f0;
}

/* For Firefox */
html {
    scrollbar-width: thin; /* 'auto' or 'thin' or 'none' */
    scrollbar-color: #557 #112; /* thumb color track color */
}

/* Apply to a specific container if needed */
.neubrutal-container {
    overflow: auto; /* Required for scrollbars to appear */
    height: 300px; /* Example height for a scrollable area */
    width: 400px; /* Example width */
    background-color: #fff;
    border: 2px solid #000;
    padding: 10px;
    /* Firefox specific styling for this element */
    scrollbar-width: thin;
    scrollbar-color: #000 #fff;
}

/* Example content for the container */
.neubrutal-container p {
    font-family: 'Arial Black', sans-serif;
    color: #000;
    line-height: 1.6;
    margin-bottom: 1em;
}
      `}</style>
      <div className="w-full bg-gray-800 ps-5 pe-2">



        <div className="flex flex-wrap gap-1 mb-2 border-b-2 border-black pb-1 overflow-x-auto mt-4">
          {tabs.map(tab => (
            <div
              key={tab.id}
              draggable
              onDragStart={(e) => handleDragStart(e, tab.id)}
              onDragEnter={(e) => handleDragEnter(e, tab.id)}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, tab.id)}
              onDragEnd={handleDragEnd}
              onClick={() => setActiveTabId(tab.id)}
              className={`flex items-center px-2 border-2 border-black rounded-t-md cursor-pointer
                          ${activeTabId === tab.id ? 'bg-blue-600 shadow-[4px_4px_0px_rgba(0,0,0,1)]' : 'bg-gray-500 hover:bg-gray-300'}
                          transition-all duration-100 ease-in-out font-bold text-sm flex-shrink-0`}
            >
              <span className="truncate max-w-[120px]">{tab.title}</span>
              {tabs.length > 1 && (
                <button
                  onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
                  className="ml-2 w-5 h-5 flex items-center justify-center rounded-full bg-red-400 text-white font-extrabold text-xs leading-none
                             border border-black shadow-[1px_1px_0px_rgba(0,0,0,1)] hover:bg-red-500"
                >
                  X
                </button>
              )}
            </div>
          ))}
          <button
            onClick={() => addTab({ title: `New Tab ${nextTabIdRef.current}` })}
            className="px-2 py-1 border-2 border-black rounded-t-md bg-green-700 font-bold text-sm
                       shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]
                       transition-all duration-100 ease-in-out flex-shrink-0"
          >
            +
          </button>
        </div>



        <div className="mb-6">
          <label htmlFor="url-input" className="block text-lg font-bold mb-2">
            URL:
          </label>
          <div className="flex gap-2 mb-2">

            <select
              value={currentActiveTab.method}
              onChange={(e) => updateActiveTabContent('method', e.target.value)}
              className="px-2 py-1 border-2 border-black rounded-md bg-gray-500 font-bold
                         shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]
                         transition-all duration-100 ease-in-out
                         focus:outline-none focus:ring-2 focus:ring-blue-500
                         w-26 flex-shrink-0"
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
              <option value="PATCH">PATCH</option>
              <option value="HEAD">HEAD</option>
              <option value="OPTIONS">OPTIONS</option>
            </select>


            <input
              id="url-input"
              type="text"
              value={currentActiveTab.url || ''}
              onChange={(e) => updateActiveTabContent('url', e.target.value)}
              placeholder="Enter request URL (e.g., https://api.example.com/${VERSION}/users)"
              className="flex-grow px-2 py-1 border-2 border-black rounded-md bg-gray-500
                         shadow-[4px_4px_0px_rgba(0,0,0,1)] focus:outline-none focus:ring-2 focus:ring-blue-500"
            />


            <button
              onClick={handleSendRequest}
              disabled={isLoading}
              className={`px-2 py-1 border-2 border-black rounded-md font-bold text-lg
                          ${isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-700 hover:bg-green-400'}
                          shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]
                          transition-all duration-100 ease-in-out
                          focus:outline-none focus:ring-2 focus:ring-green-600
                          flex-shrink-0`}
            >
              {isLoading ? 'Sending...' : 'Send'}
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={clearAll}
              className="px-4 py-1 border-2 border-black rounded-md bg-red-500 font-bold
                         shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]
                         transition-all duration-100 ease-in-out
                         focus:outline-none focus:ring-2 focus:ring-red-600 flex-grow"
            >
              Clear All
            </button>
            <button
              onClick={handleSaveToCollection}
              className={`px-4 py-1 border-2 border-black rounded-md bg-orange-500 font-bold
                          hover:bg-orange-400
                          shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]
                          transition-all duration-100 ease-in-out
                          focus:outline-none focus:ring-2 focus:ring-orange-600 flex-grow`}
            >
              Save Request
            </button>
          </div>
        </div>


        <div className="flex mb-4 border-b-2 border-black overflow-x-auto pb-1">
          <button
            onClick={() => updateActiveTabContent('activeRequestTab', 'body')}
            className={`p-2 text-sm font-bold border-2 border-b-0 border-black rounded-t-md
                        ${currentActiveTab.activeRequestTab === 'body' ? 'bg-blue-600 shadow-[4px_4px_0px_rgba(0,0,0,1)]' : 'bg-gray-500 hover:bg-gray-300'}
                        transition-all duration-100 ease-in-out
                        focus:outline-none focus:ring-2 focus:ring-blue-500 flex-shrink-0`}
          >
            Request Body
          </button>
          <button
            onClick={() => updateActiveTabContent('activeRequestTab', 'headers')}
            className={`p-2 text-sm font-bold border-2 border-b-0 border-black rounded-t-md ml-2
                        ${currentActiveTab.activeRequestTab === 'headers' ? 'bg-blue-600 shadow-[4px_4px_0px_rgba(0,0,0,1)]' : 'bg-gray-500 hover:bg-gray-300'}
                        transition-all duration-100 ease-in-out
                        focus:outline-none focus:ring-2 focus:ring-blue-500 flex-shrink-0`}
          >
            Request Headers
          </button>
          <button
            onClick={() => updateActiveTabContent('activeRequestTab', 'params')}
            className={`p-2 text-sm font-bold border-2 border-b-0 border-black rounded-t-md ml-2
                        ${currentActiveTab.activeRequestTab === 'params' ? 'bg-blue-600 shadow-[4px_4px_0px_rgba(0,0,0,1)]' : 'bg-gray-500 hover:bg-gray-300'}
                        transition-all duration-100 ease-in-out
                        focus:outline-none focus:ring-2 focus:ring-blue-500 flex-shrink-0`}
          >
            Params
          </button>
          <button
            onClick={() => updateActiveTabContent('activeRequestTab', 'auth')}
            className={`p-2 text-sm font-bold border-2 border-b-0 border-black rounded-t-md ml-2
                        ${currentActiveTab.activeRequestTab === 'auth' ? 'bg-blue-600 shadow-[4px_4px_0px_rgba(0,0,0,1)]' : 'bg-gray-500 hover:bg-gray-300'}
                        transition-all duration-100 ease-in-out
                        focus:outline-none focus:ring-2 focus:ring-blue-500 flex-shrink-0`}
          >
            Auth
          </button>
          <button
            onClick={() => updateActiveTabContent('activeRequestTab', 'environments')}
            className={`p-2 text-sm font-bold border-2 border-b-0 border-black rounded-t-md ml-2
                        ${currentActiveTab.activeRequestTab === 'environments' ? 'bg-blue-600 shadow-[4px_4px_0px_rgba(0,0,0,1)]' : 'bg-green-700 hover:bg-gray-300'}
                        transition-all duration-100 ease-in-out
                        focus:outline-none focus:ring-2 focus:ring-blue-500 flex-shrink-0`}
          >
            Environments
          </button>
          <button
            onClick={() => updateActiveTabContent('activeRequestTab', 'history')}
            className={`p-2 text-sm font-bold border-2 border-b-0 border-black rounded-t-md ml-2
                        ${currentActiveTab.activeRequestTab === 'history' ? 'bg-blue-600 shadow-[4px_4px_0px_rgba(0,0,0,1)]' : 'bg-green-700 hover:bg-gray-300'}
                        transition-all duration-100 ease-in-out
                        focus:outline-none focus:ring-2 focus:ring-blue-500 flex-shrink-0`}
          >
            History
          </button>
          <button
            onClick={() => updateActiveTabContent('activeRequestTab', 'collections')}
            className={`p-2 text-sm font-bold border-2 border-b-0 border-black rounded-t-md ml-2
                        ${currentActiveTab.activeRequestTab === 'collections' ? 'bg-blue-600 shadow-[4px_4px_0px_rgba(0,0,0,1)]' : 'bg-green-700 hover:bg-gray-300'}
                        transition-all duration-100 ease-in-out
                        focus:outline-none focus:ring-2 focus:ring-blue-500 flex-shrink-0`}
          >
            Collections
          </button>
        </div>


        <div className="mb-6">
          {currentActiveTab.activeRequestTab === 'body' && (
            <div>
              <label htmlFor="request-body" className="block text-lg font-bold mb-2">
                Request Body (JSON):
              </label>
              <textarea
                id="request-body"
                value={currentActiveTab.requestBody}
                onChange={(e) => updateActiveTabContent('requestBody', e.target.value)}
                placeholder="Enter JSON request body here... (e.g., { 'name': '${USERNAME}' })"
                rows="8"
                className="w-full px-4 py-3 border-2 border-black rounded-md bg-gray-700 font-mono text-sm
                           shadow-[4px_4px_0px_rgba(0,0,0,1)] focus:outline-none focus:ring-2 focus:ring-blue-500"
              ></textarea>
            </div>
          )}

          {currentActiveTab.activeRequestTab === 'headers' && (
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-lg font-bold">Request Headers:</label>
                <button
                  onClick={() => addRow('requestHeaders', currentActiveTab.requestHeaders)}
                  className="px-2 py-1 border-2 border-black rounded-md bg-purple-300 font-bold
                             shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]
                             transition-all duration-100 ease-in-out
                             focus:outline-none focus:ring-2 focus:ring-purple-600"
                >
                  Add Header
                </button>
              </div>
              {currentActiveTab.requestHeaders.map(header => (
                <div key={header.id} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={header.key || ''}
                    onChange={(e) => updateRow('requestHeaders', currentActiveTab.requestHeaders, header.id, 'key', e.target.value)}
                    placeholder="Key (e.g., Authorization)"
                    className="flex-1 px-2 py-1 border-2 border-black rounded-md bg-gray-500
                               shadow-[2px_2px_0px_rgba(0,0,0,1)] focus:outline-none focus:ring-1 focus:ring-gray-500"
                  />
                  <input
                    type="text"
                    value={header.value || ''}
                    onChange={(e) => updateRow('requestHeaders', currentActiveTab.requestHeaders, header.id, 'value', e.target.value)}
                    placeholder="Value (e.g., Bearer ${TOKEN})"
                    className="flex-1 px-2 py-1 border-2 border-black rounded-md bg-gray-500
                               shadow-[2px_2px_0px_rgba(0,0,0,1)] focus:outline-none focus:ring-1 focus:ring-gray-500"
                  />
                  <button
                    onClick={() => removeRow('requestHeaders', currentActiveTab.requestHeaders, header.id)}
                    className="px-3 py-1 border-2 border-black rounded-md bg-red-500 font-bold
                               shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_rgba(0,0,0,1)]"
                  >
                    X
                  </button>
                </div>
              ))}
            </div>
          )}

          {currentActiveTab.activeRequestTab === 'params' && (
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-lg font-bold">Query Parameters:</label>
                <button
                  onClick={() => addRow('queryParams', currentActiveTab.queryParams)}
                  className="px-2 py-1 border-2 border-black rounded-md bg-purple-300 font-bold
                             shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]
                             transition-all duration-100 ease-in-out
                             focus:outline-none focus:ring-2 focus:ring-purple-600"
                >
                  Add Param
                </button>
              </div>
              {currentActiveTab.queryParams.map(param => (
                <div key={param.id} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={param.key || ''}
                    onChange={(e) => updateRow('queryParams', currentActiveTab.queryParams, param.id, 'key', e.target.value)}
                    placeholder="Key (e.g., userId)"
                    className="flex-1 px-2 py-1 border-2 border-black rounded-md bg-gray-500
                               shadow-[2px_2px_0px_rgba(0,0,0,1)] focus:outline-none focus:ring-1 focus:ring-gray-500"
                  />
                  <input
                    type="text"
                    value={param.value  || ''}
                    onChange={(e) => updateRow('queryParams', currentActiveTab.queryParams, param.id, 'value', e.target.value)}
                    placeholder="Value (e.g., ${USER_ID})"
                    className="flex-1 px-2 py-1 border-2 border-black rounded-md bg-gray-500
                               shadow-[2px_2px_0px_rgba(0,0,0,1)] focus:outline-none focus:ring-1 focus:ring-gray-500"
                  />
                  <button
                    onClick={() => removeRow('queryParams', currentActiveTab.queryParams, param.id)}
                    className="px-3 py-1 border-2 border-black rounded-md bg-red-500 font-bold
                               shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_rgba(0,0,0,1)]"
                  >
                    X
                  </button>
                </div>
              ))}
            </div>
          )}

          {currentActiveTab.activeRequestTab === 'auth' && (
            <div>
              <label htmlFor="auth-type" className="block text-lg font-bold mb-2">
                Authorization Type:
              </label>
              <select
                id="auth-type"
                value={currentActiveTab.authType}
                onChange={(e) => updateActiveTabContent('authType', e.target.value)}
                className="w-full px-2 py-1 border-2 border-black rounded-md bg-gray-800 font-bold mb-4
                           shadow-[4px_4px_0px_rgba(0,0,0,1)] focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="none">No Auth</option>
                <option value="bearer">Bearer Token</option>
                <option value="basic">Basic Auth</option>
              </select>

              {currentActiveTab.authType === 'bearer' && (
                <div>
                  <label htmlFor="bearer-token" className="block text-lg font-bold mb-2">
                    Bearer Token:
                  </label>
                  <input
                    id="bearer-token"
                    type="text"
                    value={currentActiveTab.bearerToken || ''}
                    onChange={(e) => updateActiveTabContent('bearerToken', e.target.value)}
                    placeholder="Enter Bearer Token (e.g., ${AUTH_TOKEN})"
                    className="w-full px-2 py-1 border-2 border-black rounded-md bg-gray-500
                               shadow-[4px_4px_0px_rgba(0,0,0,1)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {currentActiveTab.authType === 'basic' && (
                <div className="flex flex-col gap-4">
                  <div>
                    <label htmlFor="basic-username" className="block text-lg font-bold mb-2">
                      Username:
                    </label>
                    <input
                      id="basic-username"
                      type="text"
                      value={currentActiveTab.basicAuthUsername || ''}
                      onChange={(e) => updateActiveTabContent('basicAuthUsername', e.target.value)}
                      placeholder="Enter Username (e.g., ${BASIC_USERNAME})"
                      className="w-full px-2 py-1 border-2 border-black rounded-md bg-gray-500
                                 shadow-[4px_4px_0px_rgba(0,0,0,1)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="basic-password" className="block text-lg font-bold mb-2">
                      Password:
                    </label>
                    <input
                      id="basic-password"
                      type="password"
                      value={currentActiveTab.basicAuthPassword || ''}
                      onChange={(e) => updateActiveTabContent('basicAuthPassword', e.target.value)}
                      placeholder="Enter Password (e.g., ${BASIC_PASSWORD})"
                      className="w-full px-2 py-1 border-2 border-black rounded-md bg-gray-500
                                 shadow-[4px_4px_0px_rgba(0,0,0,1)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {currentActiveTab.activeRequestTab === 'environments' && (
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-lg font-bold">Environment Variables:</label>
                <button
                  onClick={addEnvironmentVariable}
                  className={`px-2 py-1 border-2 border-black rounded-md bg-purple-300 font-bold
                             hover:bg-purple-400
                             shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]
                             transition-all duration-100 ease-in-out
                             focus:outline-none focus:ring-2 focus:ring-purple-600`}
                >
                  Add Variable
                </button>
              </div>
              {environments.length === 0 ? (
                <p className="text-gray-600 text-center">No environment variables defined yet. Add one!</p>
              ) : (
                <ul className="space-y-3 max-h-80 overflow-y-auto pr-2">
                  {environments.map(env => (
                    <li key={env.id} className="flex gap-2 mb-2 items-center">
                      <input
                        type="text"
                        value={env.key || ''}
                        onChange={(e) => updateEnvironmentVariable(env.id, 'key', e.target.value)}
                        placeholder="Variable Name (e.g., VERSION)"
                        className="flex-1 px-2 py-1 border-2 border-black rounded-md bg-gray-500
                                   shadow-[2px_2px_0px_rgba(0,0,0,1)] focus:outline-none focus:ring-1 focus:ring-gray-500"
                      />
                      <input
                        type="text"
                        value={env.value || ''}
                        onChange={(e) => updateEnvironmentVariable(env.id, 'value', e.target.value)}
                        placeholder="Variable Value (e.g., v1)"
                        className="flex-1 px-3 py-1 border-2 border-black rounded-md bg-gray-500
                                   shadow-[2px_2px_0px_rgba(0,0,0,1)] focus:outline-none focus:ring-1 focus:ring-gray-500"
                      />
                      <button
                        onClick={() => removeEnvironmentVariable(env.id)}
                        className="px-3 py-1 border-2 border-black rounded-md bg-red-500 font-bold
                                   shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_rgba(0,0,0,1)]"
                      >
                        X
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {currentActiveTab.activeRequestTab === 'history' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">Request History</h3>
                <button
                  onClick={handleClearHistory}
                  disabled={history.length === 0}
                  className={`px-2 py-1 border-2 border-black rounded-md bg-red-500 font-bold
                              ${history.length === 0 ? 'bg-gray-400 cursor-not-allowed' : 'hover:bg-red-400'}
                              shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]
                              transition-all duration-100 ease-in-out
                              focus:outline-none focus:ring-2 focus:ring-red-600`}
                >
                  Clear History
                </button>
              </div>
              {history.length === 0 ? (
                <p className="text-gray-600 text-center">No history yet. Send a request to see it here!</p>
              ) : (
                <ul className="space-y-3 max-h-80 overflow-y-auto pr-2">
                  {history.map(item => (
                    <li
                      key={item.id}
                      className="flex justify-between items-center p-2 border-2 border-black rounded-md bg-gray-800
                                 shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]
                                 transition-all duration-100 ease-in-out cursor-pointer"
                    >
                      <div onClick={() => loadHistoryItem(item)} className="flex-grow">
                        <span className={`font-bold mr-2 ${item.method === 'GET' ? 'text-blue-600' : item.method === 'POST' ? 'text-green-600' : item.method === 'PUT' ? 'text-orange-600' : item.method === 'DELETE' ? 'text-red-600' : 'text-gray-600'}`}>
                          {item.method}
                        </span>
                        <span className="text-sm text-gray-800 break-all">{item.url}</span>
                        {item.statusCode && (
                          <span className={`ml-2 text-xs font-semibold px-2 py-1 rounded-full ${item.statusCode >= 200 && item.statusCode < 300 ? 'bg-green-500 text-green-800' : 'bg-red-500 text-red-800'}`}>
                            {item.statusCode}
                          </span>
                        )}
                        {item.responseTime && (
                          <span className="ml-2 text-xs text-gray-500">
                            {item.responseTime}ms
                          </span>
                        )}
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteHistoryItem(item.id); }}
                        className="ml-4 px-3 py-1 border-2 border-black rounded-md bg-red-500 font-bold text-sm
                                   shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_rgba(0,0,0,1)]"
                      >
                        Delete
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {currentActiveTab.activeRequestTab === 'collections' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">Collections</h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCollectionName || ''}
                    onChange={(e) => setNewCollectionName(e.target.value)}
                    placeholder="New Collection Name"
                    ref={newCollectionInputRef}
                    className="px-2 py-1 border-2 border-black rounded-md bg-gray-500 text-sm
                               shadow-[2px_2px_0px_rgba(0,0,0,1)] focus:outline-none focus:ring-1 focus:ring-gray-500"
                  />
                  <button
                    onClick={handleCreateCollection}
                    disabled={!newCollectionName.trim()}
                    className={`px-2 py-1 border-2 border-black rounded-md bg-blue-600 font-bold text-sm
                                ${!newCollectionName.trim() ? 'bg-gray-400 cursor-not-allowed' : 'hover:bg-blue-400'}
                                shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]
                                transition-all duration-100 ease-in-out
                                focus:outline-none focus:ring-2 focus:ring-blue-600`}
                  >
                    Create
                  </button>
                </div>
              </div>
              {collections.length === 0 ? (
                <p className="text-gray-600 text-center">No collections yet. Create one or save a request!</p>
              ) : (
                <ul className="space-y-4 max-h-80 overflow-y-auto pr-2">
                  {collections.map(collectionItem => (
                    <li key={collectionItem.id} className="border-2 border-black rounded-md bg-gray-800 shadow-[6px_6px_0px_rgba(0,0,0,1)] p-4">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="text-lg font-bold">{collectionItem.name}</h4>
                        <button
                          onClick={() => handleDeleteCollection(collectionItem.id)}
                          className="px-2 py-1 border-2 border-black rounded-md bg-red-500 font-bold text-sm
                                     shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_rgba(0,0,0,1)]"
                        >
                          Delete Collection
                        </button>
                      </div>
                      {collectionItem.requests && collectionItem.requests.length > 0 ? (
                        <ul className="space-y-2 pl-4 border-l-2 border-gray-300">
                          {collectionItem.requests.map((request, reqIndex) => (
                            <li
                              key={request.id}
                              className="flex justify-between items-center p-2 border border-gray-300 rounded-md bg-gray-50
                                         shadow-[2px_2px_0px_rgba(0,0,0,0.5)] hover:shadow-[1px_1px_0px_rgba(0,0,0,0.5)]
                                         transition-all duration-100 ease-in-out cursor-pointer"
                            >
                              <div onClick={() => loadCollectionRequest(request)} className="flex-grow">
                                <span className={`font-bold mr-2 ${request.method === 'GET' ? 'text-blue-600' : request.method === 'POST' ? 'text-green-600' : request.method === 'PUT' ? 'text-orange-600' : request.method === 'DELETE' ? 'text-red-600' : 'text-gray-600'}`}>
                                  {request.method}
                                </span>
                                <span className="text-sm text-gray-700 break-all">{request.url}</span>
                                {request.name && <span className="ml-2 text-xs text-gray-500">({request.name})</span>}
                              </div>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteRequestFromCollection(collectionItem.id, request.id); }}
                                className="ml-4 px-3 py-1 border-2 border-black rounded-md bg-red-500 font-bold text-xs
                                           shadow-[1px_1px_0px_rgba(0,0,0,0.5)] hover:shadow-[0px_0px_0px_rgba(0,0,0,0.5)]"
                              >
                                X
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-gray-500 text-sm text-center">No requests in this collection yet.</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>


        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-lg font-bold">Response:</label>
            <div className="flex gap-2">
              {statusCode && (
                <span className="text-sm font-bold bg-blue-500 px-3 py-2 rounded-md border border-black shadow-[2px_2px_0px_rgba(0,0,0,1)]">
                  Status: {statusCode}
                </span>
              )}
              {responseTime && (
                <span className="text-sm font-bold bg-blue-500 px-3 py-2 rounded-md border border-black shadow-[2px_2px_0px_rgba(0,0,0,1)]">
                  Time: {responseTime} ms
                </span>
              )}
              <button
                onClick={copyToClipboard}
                className="px-2 py-1 border-2 text-black border-black rounded-md bg-yellow-500 font-bold
                           shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]
                           transition-all duration-100 ease-in-out
                           focus:outline-none focus:ring-2 focus:ring-yellow-600"
              >
                Copy
              </button>
            </div>
          </div>


          <div className="flex mb-4 border-b-2 border-black">
            <button
              onClick={() => setActiveResponseTab('pretty')}
              className={`px-2 py-1 font-bold text-sm border-2 border-b-0 border-black rounded-t-md
                          ${activeResponseTab === 'pretty' ? 'bg-blue-600 shadow-[4px_4px_0px_rgba(0,0,0,1)]' : 'bg-gray-500 hover:bg-gray-300'}
                          transition-all duration-100 ease-in-out
                          focus:outline-none focus:ring-2 focus:ring-blue-500`}
            >
              Pretty
            </button>
            <button
              onClick={() => setActiveResponseTab('raw')}
              className={`px-2 py-1 font-bold text-sm border-2 border-b-0 border-black rounded-t-md ml-2
                          ${activeResponseTab === 'raw' ? 'bg-blue-600 shadow-[4px_4px_0px_rgba(0,0,0,1)]' : 'bg-gray-500 hover:bg-gray-300'}
                          transition-all duration-100 ease-in-out
                          focus:outline-none focus:ring-2 focus:ring-blue-500`}
            >
              Raw
            </button>
            <button
              onClick={() => setActiveResponseTab('headers')}
              className={`px-2 py-1 font-bold text-sm border-2 border-b-0 border-black rounded-t-md ml-2
                          ${activeResponseTab === 'headers' ? 'bg-blue-600 shadow-[4px_4px_0px_rgba(0,0,0,1)]' : 'bg-gray-500 hover:bg-gray-300'}
                          transition-all duration-100 ease-in-out
                          focus:outline-none focus:ring-2 focus:ring-blue-500`}
            >
              Headers
            </button>
            <button
              onClick={() => setActiveResponseTab('table')}
              className={`px-2 py-1 font-bold text-sm border-2 border-b-0 border-black rounded-t-md ml-2
                          ${activeResponseTab === 'table' ? 'bg-blue-600 shadow-[4px_4px_0px_rgba(0,0,0,1)]' : 'bg-gray-500 hover:bg-gray-300'}
                          transition-all duration-100 ease-in-out
                          focus:outline-none focus:ring-2 focus:ring-blue-500`}
            >
              Table
            </button>
          </div>


          {activeResponseTab === 'pretty' && (
            <textarea
              value={prettyResponseBody}
              readOnly
              rows="12"
              className="w-full px-4 py-3 border-2 border-black rounded-md bg-gray-900 text-green-500 font-mono text-sm
                         shadow-[4px_4px_0px_rgba(0,0,0,1)] focus:outline-none"
              placeholder={isLoading ? 'Loading response...' : 'Response will appear here...'}
            ></textarea>
          )}
          {activeResponseTab === 'raw' && (
            <textarea
              value={responseBody}
              readOnly
              rows="12"
              className="w-full px-4 py-3 border-2 border-black rounded-md bg-gray-900 text-green-500 font-mono text-sm
                         shadow-[4px_4px_0px_rgba(0,0,0,1)] focus:outline-none"
              placeholder={isLoading ? 'Loading raw response...' : 'Raw response will appear here...'}
            ></textarea>
          )}
          {activeResponseTab === 'headers' && (
            <textarea
              value={Object.entries(responseHeaders).map(([key, value]) => `${key}: ${value}`).join('\n')}
              readOnly
              rows="12"
              className="w-full px-4 py-3 border-2 border-black rounded-md bg-gray-900 text-green-500 font-mono text-sm
                         shadow-[4px_4px_0px_rgba(0,0,0,1)] focus:outline-none"
              placeholder={isLoading ? 'Loading response headers...' : 'Response headers will appear here...'}
            ></textarea>
          )}
          {activeResponseTab === 'table' && (
            <JsonTableViewer jsonData={prettyResponseBody} />
          )}
        </div>
      </div>


      {showSaveToCollectionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg border-2 border-black shadow-[8px_8px_0px_rgba(0,0,0,1)] w-96">
            <h2 className="text-2xl font-bold mb-4">Save Request to Collection</h2>
            <div className="mb-4">
              <label htmlFor="select-collection" className="block text-sm font-bold mb-2">
                Select Collection:
              </label>
              <select
                id="select-collection"
                value={selectedCollectionToSave}
                onChange={(e) => setSelectedCollectionToSave(e.target.value)}
                className="w-full px-2 py-1 border-2 border-black rounded-md bg-gray-800
                           shadow-[4px_4px_0px_rgba(0,0,0,1)] focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Select a Collection --</option>
                {collections.map(col => (
                  <option key={col.id} value={col.id}>{col.name}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowSaveToCollectionModal(false)}
                className="px-2 py-1 border-2 border-black rounded-md bg-gray-300 font-bold
                           shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]"
              >
                Cancel
              </button>
              <button
                onClick={handleAddRequestToCollection}
                disabled={!selectedCollectionToSave}
                className={`px-2 py-1 border-2 border-black rounded-md bg-green-700 font-bold
                            ${!selectedCollectionToSave ? 'bg-gray-400 cursor-not-allowed' : 'hover:bg-green-400'}
                            shadow-[4px_4%_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]`}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}


      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg border-2 border-black shadow-[8px_8px_0px_rgba(0,0,0,1)] w-96">
            <h2 className="text-xl font-bold mb-4">Confirm Action</h2>
            <p className="mb-6">{confirmModalMessage}</p>
            <div className="flex justify-end gap-4">
              <button
                onClick={handleCancelConfirm}
                className="px-2 py-1 border-2 border-black rounded-md bg-gray-300 font-bold
                           shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="px-2 py-1 border-2 border-black rounded-md bg-red-500 font-bold
                           shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
