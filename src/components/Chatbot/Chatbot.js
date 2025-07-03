import React, { useState, useEffect, useRef } from "react";
import "./Chatbot.css";

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const messageEndRef = useRef(null); // Create a ref for scrolling

  const handleSendMessage = async () => {
    if (input.trim()) {
      // Add user message to the messages array
      setMessages([...messages, { user: true, text: input }]);
      setInput("");
  
      const API_KEY = process.env.REACT_APP_API_KEY; // Use environment variable
      const apiUrl = "https://api.openai.com/v1/chat/completions";
  
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      };
  
      const data = {
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: input }],
        temperature: 0.7,
      };
  
      try {
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: headers,
          body: JSON.stringify(data),
        });
  
        if (!response.ok) {
          throw new Error(`Server error: ${response.statusText}`);
        }
  
        const result = await response.json();
  
        if (!result.choices || result.choices.length === 0) {
          throw new Error("No response from the AI model");
        }
  
        const botResponse = result.choices[0].message.content.trim();
        setMessages((prevMessages) => [
          ...prevMessages,
          { user: false, text: botResponse },
        ]);
      } catch (error) {
        console.error("Error fetching data from OpenAI API:", error);
        setMessages((prevMessages) => [
          ...prevMessages,
          {
            user: false,
            text: "Something went wrong. Please try again later.",
          },
        ]);
      }
    }
  };  

  useEffect(() => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  return (
    <div className={`chatbot-container ${isOpen ? "open" : ""}`}>
      <div className="chatbot-toggle" onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? "Close" : "Chat"}
      </div>
      {isOpen && (
        <div className="chatbot-box">
          <div className="chatbot-messages">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={msg.user ? "user-message" : "bot-message"}
              >
                {msg.text}
              </div>
            ))}
            <div ref={messageEndRef} /> {/* Ref to scroll to the bottom */}
          </div>
          <div className="chatbot-input">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything..."
            />
            <button className="chatbot-send-btn" onClick={handleSendMessage}>
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chatbot;
