let isUploaded = false;
let isProcessing = false;

// DOM Elements
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const uploadContent = document.getElementById('uploadContent');
const uploadingContent = document.getElementById('uploadingContent');
const uploadedContent = document.getElementById('uploadedContent');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const chatForm = document.getElementById('chatForm');
const chatMessages = document.getElementById('chatMessages');

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
});

function initializeEventListeners() {
    // File Upload Handling
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

    // Add user message
    addMessage(message, 'user');
    messageInput.value = '';

    // Add typing indicator
    const typingId = addTypingIndicator();
    
    // Add comparison response container and get its ID
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

        // Remove typing indicator once we start getting data
        removeTypingIndicator(typingId);

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop(); // Keep the last incomplete line in the buffer
            
            for (let line of lines) {
                if (line.trim() === '') continue;
                
                try {
                    console.log("Received chunk:", line);
                    const data = JSON.parse(line);
                    
                    // Debug what data looks like
                    console.log("Parsed data:", data);
                    
                    // Update the response with the new data
                    updateComparisonResponse(responseId, 
                                           data.plain || '', 
                                           data['re-ranked'] || '');
                } catch (err) {
                    console.error("Parse error:", err, "on line:", line);
                }
            }
        }

        // Process any remaining data in the buffer
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

    // Enable input when Enter is pressed
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
                    <div class="flex items-center mb-3">
                        <div class="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center mr-2">
                        </div>
                        <h4 class="font-semibold text-red-800">Plain Retrieval</h4>
                    </div>
                    <p class="text-gray-700 text-sm leading-relaxed plain-response">${plainResponse}</p>
                </div>
                <div class="comparison-card bg-green-50 border border-green-200 p-4 rounded-2xl">
                    <div class="flex items-center mb-3">
                        <div class="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mr-2">
                        </div>
                        <h4 class="font-semibold text-green-800">Re-Ranked Results</h4>
                    </div>
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