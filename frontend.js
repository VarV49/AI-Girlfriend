document.addEventListener('DOMContentLoaded', function() {
    const chatbox = document.getElementById('chatbox');
    const userInput = document.getElementById('user_input');
    const sendButton = document.getElementById('send_button');

    sendButton.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    function addMessageToChatbox(sender, message) {
        const p = document.createElement('p');
        p.textContent = `${sender}: ${message}`;
        chatbox.appendChild(p);
        chatbox.scrollTop = chatbox.scrollHeight; 
    }

    async function sendMessage() {
        const message = userInput.value.trim();
        if (message === '') return;

        addMessageToChatbox('You', message);
        userInput.value = '';

        try {
            const response = await fetch('http://localhost:5000/chat', { 
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ prompt: message })
            });
            const data = await response.json();
            addMessageToChatbox('Gemini', data.response);
        } catch (error) {
            console.error('Error fetching from backend:', error);
            addMessageToChatbox('System', 'Error connecting to the chatbot.');
        }
    }
});