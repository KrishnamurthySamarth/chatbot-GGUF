let isUploaded = false;
let isProcessing = false;

const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const uploadContent = document.getElementById('uploadContent');
const uploadingContent = document.getElementById('uploadingContent');
const uploadedContent = document.getElementById('uploadedContent');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const chatForm = document.getElementById('chatForm');
const chatMessages = document.getElementById('chatMessages');
const clearButton = document.getElementById('clearButton');

document.addEventListener('DOMContentLoaded', async function() {
    await checkDatabaseStatus();
    initializeEventListeners();
});

if (clearButton) {
    clearButton.addEventListener('click', async () => {
        if (confirm("Are you sure you want to clear the database?")) {
            try {
                const response = await fetch('/clear_vb', { method: 'POST' });

                if (response.ok) {
                    uploadedContent.classList.add('hidden');
                    uploadContent.classList.remove('hidden');
                    messageInput.disabled = true;
                    sendButton.disabled = true;
                    messageInput.placeholder = "Upload a PDF first to start chatting...";
                    chatMessages.innerHTML = '';

                    alert("Database cleared.");
                } else {
                    alert("Failed to clear database.");
                }
            } catch (err) {
                console.error("Clear error:", err);
                alert("An error occurred while clearing the database.");
            }
        }
    });
}

async function checkDatabaseStatus() {
    try {
        const response = await fetch('/vb_status');
        const data = await response.json();

        const indexSize = data.index_size || 0;

        if (indexSize > 0) {
            isUploaded = true;
            messageInput.disabled = false;
            sendButton.disabled = false;
            uploadContent.classList.add('hidden');
            uploadedContent.classList.remove('hidden');
            uploadedContent.querySelector('p').textContent = "Database Loaded.";
            messageInput.placeholder = "Ask me anything about your document...";
        } else {
            isUploaded = false;
            uploadContent.classList.remove('hidden');
            uploadedContent.classList.add('hidden');
        }
    } catch (err) {
        console.error("Failed to check VB status:", err);
        isUploaded = false;
        uploadContent.classList.remove('hidden');
        uploadedContent.classList.add('hidden');
    }
}

function initializeEventListeners() {
    uploadArea.addEventListener('click', () => {
        if (!isProcessing) {
            fileInput.click();
        }
    });

    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('bg-blue-50', 'border-blue-300');
    });

    uploadArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('bg-blue-50', 'border-blue-300');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('bg-blue-50', 'border-blue-300');
        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].type === 'application/pdf') {
            handleFileUpload(files[0]);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files[0]) {
            handleFileUpload(e.target.files[0]);
        }
    });

    chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const message = messageInput.value.trim();
    if (!message || !isUploaded) return;

    addMessage(message, 'user');
    messageInput.value = '';

    const typingId = addTypingIndicator();

    const responseId = addComparisonResponse('', '');
    
    try {
        const response = await fetch('/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: message })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body.getReader();
        let decoder = new TextDecoder();
        let buffer = '';

        removeTypingIndicator(typingId);

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop();
            
            for (let line of lines) {
                if (line.trim() === '') continue;
                
                try {
                    console.log("Received chunk:", line);
                    const data = JSON.parse(line);
                    
                    console.log("Parsed data:", data);
                    
                    updateComparisonResponse(responseId, 
                                           data.plain || '', 
                                           data['re-ranked'] || '');
                } catch (err) {
                    console.error("Parse error:", err, "on line:", line);
                }
            }
        }

        if (buffer.trim() !== '') {
            try {
                const data = JSON.parse(buffer);
                updateComparisonResponse(responseId, 
                                       data.plain || '', 
                                       data['re-ranked'] || '');
            } catch (err) {
                console.error("Parse error on final chunk:", err);
            }
        }

    } catch (error) {
        console.error("Fetch error:", error);
        updateComparisonResponse(responseId, 
                               'Sorry, there was an error processing your request.', 
                               'Error: ' + error.message);
        removeTypingIndicator(typingId);
    }
});

    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            chatForm.dispatchEvent(new Event('submit'));
        }
    });
}

function updateComparisonResponse(responseId, plainResponse, rerankedResponse) {
    const responseDiv = document.getElementById(responseId);
    if (responseDiv) {
        const plainElement = responseDiv.querySelector('.plain-response');
        const rerankedElement = responseDiv.querySelector('.reranked-response');
        
        if (plainElement) {
            plainElement.textContent = plainResponse;
        }
        if (rerankedElement) {
            rerankedElement.textContent = rerankedResponse;
        }
        
        scrollToBottom();
    }
}

async function handleFileUpload(file) {
    if (isProcessing) return;
    
    isProcessing = true;
    uploadContent.classList.add('hidden');
    uploadingContent.classList.remove('hidden');

    const formData = new FormData();
    formData.append('pdf_file', file);

    try {
        const response = await fetch('/process_pdf', {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            uploadingContent.classList.add('hidden');
            uploadedContent.classList.remove('hidden');
            isUploaded = true;
            messageInput.disabled = false;
            sendButton.disabled = false;
            messageInput.placeholder = "Ask me anything about your document...";
            messageInput.focus();
        } else {
            throw new Error('Upload failed');
        }
    } catch (error) {
        uploadingContent.classList.add('hidden');
        uploadContent.classList.remove('hidden');
        alert('Failed to upload PDF. Please try again.');
    } finally {
        isProcessing = false;
    }
}

function addMessage(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'flex items-start space-x-3';
    
    if (sender === 'user') {
        messageDiv.innerHTML = `
            <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 ml-auto order-2">
                <i class="fas fa-user text-white text-sm"></i>
            </div>
            <div class="message-bubble bg-blue-500 text-white p-4 rounded-2xl rounded-tr-md ml-auto">
                <p>${text}</p>
            </div>
        `;
        messageDiv.classList.add('flex-row-reverse');
    } else {
        messageDiv.innerHTML = `
            <div class="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center flex-shrink-0">
                <i class="fas fa-robot text-white text-sm"></i>
            </div>
            <div class="message-bubble bg-gray-100 p-4 rounded-2xl rounded-tl-md">
                <p class="text-gray-800">${text}</p>
            </div>
        `;
    }

    chatMessages.appendChild(messageDiv);
    scrollToBottom();
}

function addComparisonResponse(plainResponse, rerankedResponse) {
    const responseId = 'response-' + Date.now();
    const comparisonDiv = document.createElement('div');
    comparisonDiv.className = 'flex items-start space-x-3';
    comparisonDiv.id = responseId;
    
    comparisonDiv.innerHTML = `
    <div class="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center flex-shrink-0">
        <i class="fas fa-robot text-white text-sm"></i>
    </div>
    <div class="flex-1 space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="comparison-card bg-red-50 border border-red-200 p-4 rounded-2xl">
                <h4 class="text-center text-red-800 text-base font-semibold font-mono mb-2">
                    Plain Retrieval
                </h4>
                <p class="text-gray-700 text-sm leading-relaxed plain-response">${plainResponse}</p>
            </div>
            <div class="comparison-card bg-green-50 border border-green-200 p-4 rounded-2xl">
                <h4 class="text-center text-green-800 text-base font-semibold font-mono mb-2">
                    Re-Ranked Results
                </h4>
                <p class="text-gray-700 text-sm leading-relaxed reranked-response">${rerankedResponse}</p>
            </div>
        </div>
    </div>
`;

    chatMessages.appendChild(comparisonDiv);
    scrollToBottom();
    return responseId; 
}

function addTypingIndicator() {
    const typingDiv = document.createElement('div');
    const id = 'typing-' + Date.now();
    typingDiv.id = id;
    typingDiv.className = 'flex items-start space-x-3 typing-indicator active';
    
    typingDiv.innerHTML = `
        <div class="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center flex-shrink-0">
            <i class="fas fa-robot text-white text-sm"></i>
        </div>
        <div class="message-bubble bg-gray-100 p-4 rounded-2xl rounded-tl-md">
            <div class="flex space-x-2">
                <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
                <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
            </div>
        </div>
    `;

    chatMessages.appendChild(typingDiv);
    scrollToBottom();
    return id;
}

function removeTypingIndicator(id) {
    const element = document.getElementById(id);
    if (element) {
        element.remove();
    }
}

function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}