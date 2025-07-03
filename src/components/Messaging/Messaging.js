import React, { useState, useEffect } from "react";
import { ref, onValue, push, set, get } from "firebase/database";
import { auth, db } from "../../firebase";
import "./Messaging.css";

const Messaging = () => {
  const [employers, setEmployers] = useState([]);
  const [freelancers, setFreelancers] = useState([]);
  const [selectedEmployer, setSelectedEmployer] = useState(null);
  const [selectedFreelancer, setSelectedFreelancer] = useState(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [userRole, setUserRole] = useState("");
  const [username, setUsername] = useState("");
  const [blockedUsers, setBlockedUsers] = useState({});
  const [allBlockedUsers, setAllBlockedUsers] = useState([]);
  const [showRelationshipModal, setShowRelationshipModal] = useState(false);

  const userId = auth.currentUser?.uid;

  useEffect(() => {
    const userRef = ref(db, `users/${userId}`);
    onValue(userRef, (snapshot) => {
      const userData = snapshot.val();
      if (userData) {
        setUserRole(userData.role);
        setUsername(userData.firstname + " " + userData.lastname)
      }
    });
  }, [userId]);

  useEffect(() => {
    const blockedUsersRef = ref(db, `users/${userId}/blockedUsers`);
    onValue(blockedUsersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) setBlockedUsers(data);
    });
  }, [userId]);

  useEffect(() => {
    const fetchBlockedUsersDetails = async () => {
      const blockedDetails = [];
      for (const blockedUserId in blockedUsers) {
        if (blockedUsers[blockedUserId]?.blocked) {
          const userRef = ref(db, `users/${blockedUserId}`);
          const snapshot = await get(userRef);
          if (snapshot.exists()) {
            const userData = snapshot.val();
            const userDetail = {
              userId: blockedUserId,
              name: `${userData.firstname || ""} ${userData.lastname || ""}`.trim() || userData.name || "Unknown User",
            };
  
            // Prevent duplicates
            if (!blockedDetails.some((user) => user.userId === blockedUserId)) {
              blockedDetails.push(userDetail);
            }
          }
        }
      }
      setAllBlockedUsers(blockedDetails);
    };
  
    if (Object.keys(blockedUsers).length > 0) {
      fetchBlockedUsersDetails();
    } else {
      setAllBlockedUsers([]);
    }
  }, [blockedUsers]);
  

  useEffect(() => {
    if (userRole === "Freelancer") {
      const freelancerRef = ref(db, `users/${userId}/linkedEmployers`);
      onValue(freelancerRef, (snapshot) => {
        const data = snapshot.val() || {};
        const filteredEmployers = Object.entries(data)
          .filter(([id]) => !(blockedUsers[id]?.blocked))
          .map(([id, employer]) => ({
            employerId: id,
            employerName:
              `${employer.firstname || ""} ${
                employer.lastname || ""
              }`.trim() || employer.name || "Employer",
          }));
        setEmployers(filteredEmployers);
      });
    } else if (userRole === "Employer") {
      const employerRef = ref(db, `users/${userId}/acceptedFreelancers`);
      onValue(employerRef, (snapshot) => {
        const data = snapshot.val() || {};
        const filteredFreelancers = Object.entries(data)
          .filter(([id]) => !(blockedUsers[id]?.blocked))
          .map(([id, freelancer]) => ({
            freelancerId: id,
            freelancerName:
              `${freelancer.firstname || ""} ${
                freelancer.lastname || ""
              }`.trim() || freelancer.name || "Freelancer",
          }));
        setFreelancers(filteredFreelancers);
      });
    }
  }, [userRole, userId, blockedUsers]);

  useEffect(() => {
    if (selectedEmployer || selectedFreelancer) {
      setMessages([]);
      const messagesRef =
        userRole === "Freelancer"
          ? ref(db, `messages/${selectedEmployer}/${userId}`)
          : ref(db, `messages/${userId}/${selectedFreelancer}`);

      onValue(messagesRef, (snapshot) => {
        const data = snapshot.val();
        if (data) setMessages(Object.values(data));
      });
    }
  }, [selectedEmployer, selectedFreelancer, userRole, userId]);

  const handleSendMessage = async () => {
    if (selectedEmployer || selectedFreelancer) {
      const recipientId =
        userRole === "Freelancer" ? selectedEmployer : selectedFreelancer;
  
      // Check if messaging is blocked
      const recipientBlockedByCurrentUser = blockedUsers[recipientId]?.blocked;
  
      let currentUserBlockedByRecipient = false;
      const recipientBlockedUsersRef = ref(db, `users/${recipientId}/blockedUsers/${userId}`);
      const snapshot = await get(recipientBlockedUsersRef);
      if (snapshot.exists()) {
        currentUserBlockedByRecipient = snapshot.val()?.blocked;
      }
  
      if (recipientBlockedByCurrentUser || currentUserBlockedByRecipient) {
        alert("You cannot send messages because one of you has blocked the other.");
        return;
      }
  
      const messageRef =
        userRole === "Freelancer"
          ? ref(db, `messages/${selectedEmployer}/${userId}`)
          : ref(db, `messages/${userId}/${selectedFreelancer}`);
      const notificationRef = userRole === "Freelancer" ? ref(db, `notifications/${selectedEmployer}`) : ref(db, `notifications/${selectedFreelancer}`)
      //const recipentName = userRole === "Employer" ? employers.find((employer)=> employer.employerId=== selectedEmployer).employerName: freelancers.find((freelancer)=> freelancer.freelancerId===selectedFreelancer).freelancerName
      const newMessage = {
        senderId: userId,
        text: message,
        timestamp: Date.now(),
      };
      const notification = {
        message: `New Message From: ${username}`,
        timestamp: Date.now(),
        type: "message",
        fromId: userId,
      };
      try {
        await push(messageRef, newMessage);
       await push(notificationRef, notification)

        setMessage("");
      } catch (error) {
        console.error("Error sending message:", error.message);
      }
    }
  };
  
  

  const handleBlockUser = async (otherUserId) => {
    try {
      const blockRef = ref(db, `users/${userId}/blockedUsers/${otherUserId}`);
      await set(blockRef, { blocked: true });
  
      // Fetch user details after blocking
      const userRef = ref(db, `users/${otherUserId}`);
      const snapshot = await get(userRef);
  
      if (snapshot.exists()) {
        const userData = snapshot.val();
  
        // Dynamically update the allBlockedUsers state
        setAllBlockedUsers((prevBlockedUsers) => [
          ...prevBlockedUsers.filter((user) => user.userId !== otherUserId), // Prevent duplicates
          {
            userId: otherUserId,
            name: `${userData.firstname || ""} ${userData.lastname || ""}`.trim() || userData.name || "Unknown User",
          },
        ]);
      }
  
      alert("User has been blocked successfully.");
    } catch (error) {
      console.error("Error blocking user:", error.message);
      alert("Failed to block the user. Please try again.");
    }
  };
  

  const handleUnblockUser = async (otherUserId) => {
    try {
      const blockRef = ref(db, `users/${userId}/blockedUsers/${otherUserId}`);
      await set(blockRef, { blocked: false });

      setAllBlockedUsers((prevBlockedUsers) =>
        prevBlockedUsers.filter((user) => user.userId !== otherUserId)
      );

      alert("User has been unblocked successfully.");
    } catch (error) {
      console.error("Error unblocking user:", error.message);
      alert("Failed to unblock the user. Please try again.");
    }
  };

  return (
    <div className="message-section">
      <h2 className="header">Inbox</h2>
      <div className="selection-section">
        {userRole === "Freelancer" && (
          <select
            onChange={(e) => setSelectedEmployer(e.target.value)}
            value={selectedEmployer || ""}
          >
            <option value="" disabled>
              Select Employer
            </option>
            {employers.map(({ employerId, employerName }) => (
              <option key={employerId} value={employerId}>
                {employerName}
              </option>
            ))}
          </select>
        )}
        {userRole === "Employer" && (
          <select
            onChange={(e) => setSelectedFreelancer(e.target.value)}
            value={selectedFreelancer || ""}
          >
            <option value="" disabled>
              Select Freelancer
            </option>
            {freelancers.map(({ freelancerId, freelancerName }) => (
              <option key={freelancerId} value={freelancerId}>
                {freelancerName}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="message-list">
        {messages.length > 0 ? (
          messages.map((msg, idx) => (
            <div key={idx} className={`message-item ${msg.senderId === userId ? "sent" : "received"}`}>
              <p>{msg.text}</p>
              <span className="timestamp">{new Date(msg.timestamp).toLocaleString()}</span>
            </div>
          ))
        ) : (
          <p>No messages yet.</p>
        )}
      </div>

      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type your message..."
      />
      <button onClick={handleSendMessage} disabled={!message}>
        Send
      </button>

      <button onClick={() => setShowRelationshipModal(true)}>
        Manage Relationships
      </button>

      {showRelationshipModal && (
  <div className="modal-overlay">
    <div className="modal-container neo-brutalism">
      <h3 className="modal-title">Relationship Management</h3>

      {/* Blocked Users */}
      <div className="modal-section">
        <h4 className="section-title">Blocked Users</h4>
        <ul className="user-list">
          {allBlockedUsers.length > 0 ? (
            allBlockedUsers.map((user) => (
              <li key={user.userId} className="user-item">
                <span className="user-avatar neo-avatar">{user.name.charAt(0)}</span>
                <span className="user-name">{user.name}</span>
                <button
                  className="action-button neo-unblock"
                  onClick={() => handleUnblockUser(user.userId)}
                >
                  Unblock
                </button>
              </li>
            ))
          ) : (
            <p className="empty-state">No blocked users.</p>
          )}
        </ul>
      </div>

      {/* Manage Other Relationships */}
      <div className="modal-section">
        <h4 className="section-title">Relationships</h4>
        <ul className="user-list">
          {(userRole === "Freelancer" ? employers : freelancers).map((user) => (
            <li key={user.employerId || user.freelancerId} className="user-item">
              <span className="user-avatar neo-avatar">
                {(user.employerName || user.freelancerName).charAt(0)}
              </span>
              <span className="user-name">{user.employerName || user.freelancerName}</span>
              {blockedUsers[user.employerId || user.freelancerId]?.blocked ? (
                <button
                  className="action-button neo-unblock"
                  onClick={() => handleUnblockUser(user.employerId || user.freelancerId)}
                >
                  Unblock
                </button>
              ) : (
                <button
                  className="action-button neo-block"
                  onClick={() => handleBlockUser(user.employerId || user.freelancerId)}
                >
                  Block
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>

      <button
        className="close-modal-button neo-close"
        onClick={() => setShowRelationshipModal(false)}
      >
        Close
      </button>
    </div>
  </div>
)}

    </div>
  );
};

export default Messaging;