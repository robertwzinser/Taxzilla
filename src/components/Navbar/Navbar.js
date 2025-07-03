
import React, { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import GlobalNotification from "../../components/Notifications/GlobalNotification";
import { getDatabase, ref, remove, child, get } from "firebase/database";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import NotificationsRoundedIcon from "@mui/icons-material/NotificationsRounded";
import "./Navbar.css";
import "../Notifications/Notifications.css";

const Navbar = () => {
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [userId, setUserId]= useState ("")
  const navigate = useNavigate();
  const auth = getAuth();
  const db = getDatabase();
  const [userRole, setUserRole] = useState("");
  const userRoleRef = useRef();
  const [loading, setLoading] = useState(true);

  const updateShouldJobShowNotifications = () => {
    if (!userRoleRef.current) {
      setShowNotifications(false);
      return;
    }
  };

  const renderNotifications = () => {
    const displayNotifications = userRoleRef.current && userRoleRef.current.toLowerCase() === "employer"
      ? notifications.filter((notif) => notif.type !== "job")
      : notifications;
    
    if (displayNotifications.length === 0) {
      return <div className="no-notifications">No notifications</div>;
    }
  
    return displayNotifications.map((notif) => generateNotification(notif));
  };

  const handleNotificationsUpdate = (newNotifications) => {
    setNotifications(newNotifications);
    updateShouldJobShowNotifications();
  };

  // Handle notification click with redirection if redirectUrl is present
  const handleNotificationClick = (notification) => {
    console.log(notification)
  if(notification.type==="job"){
    navigate("/job-board")
  }
  if(notification.type==="message"){
    navigate("/inbox")
  }
    // If there's a redirect URL in the notification, navigate to it
    if (notification.redirectUrl) {
      navigate(notification.redirectUrl);
    }
  };

  // Dismiss a notification and remove it from Firebase

  const dismissNotification = (notificationId) => {
    const notificationRef = ref(
      db,
      `notifications/${auth.currentUser?.uid}/${notificationId}`
    );
    remove(notificationRef)
      .then(() => {
        setNotifications((prev) =>
          prev.filter((notif) => notif.id !== notificationId)
        );
      })
      .catch((error) => console.error("Error deleting notification:", error));
  };

  const formatTimestamp = (timestamp) => new Date(timestamp).toLocaleString();

  useEffect(() => {
    const dbRef = ref(getDatabase());

    const fetchUserRole = async (uid) => {
      try {
        const snapshot = await get(child(dbRef, `users/${uid}`));
        if (snapshot.exists()) {
          const data = snapshot.val();
          userRoleRef.current = data.role;
          setUserRole(data.role);
        } else {
          console.log("No user data available");
        }
        updateShouldJobShowNotifications();
      } catch (error) {
        console.error("Error fetching user role: ", error);
      } finally {
        setLoading(false);
      }
    };

    onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid); // Set the userId for the profile link
        fetchUserRole(user.uid);
      } else {
        userRoleRef.current = "";
        setUserRole("");
        setLoading(false);
      }
    });
  }, []);

  const generateNotification = (notif) => {
    if (notif.type === "job") {
      return (
        <div key={notif.id} onClick={() => navigate("/job-board")} className="notification-job-item">
          <div><strong>New Job</strong></div>
          <div>Title: {notif.title}</div>
          <div>Description: {notif.description}</div>
          <div>Pay: {notif.pay}</div>
          <div>Start Date: {notif.startDate}</div>
          <button
            onClick={(e) => {
              e.stopPropagation(); // Prevent navigation on dismiss click
              dismissNotification(notif.id);
            }}
            className="dismiss-job-notif-btn"
          >
            x
          </button>
        </div>
      );
    } else {
      return (
        <div key={notif.id} onClick={() => navigate("/inbox")} className="notification-item">
          <span>{notif.message}</span>
          <span className="timestamp">{formatTimestamp(notif.timestamp)}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              dismissNotification(notif.id);
            }}
            className="dismiss-btn"
          >
            x
          </button>
        </div>
      );
    }
  };

  return (
    <nav className="navbar">
      <div className="left-buttons">
        <Link to="/dashboard" className="nav-item left">
          Dashboard
        </Link>
      </div>

      <div className="right-buttons">
        {userId && (
          <Link to={`/profile/${userId}`} className="nav-item profile-btn">
            Profile
          </Link>
        )}

        <Link to="/user-settings" className="nav-item profile-btn">
          Settings
        </Link>

        <div className="dropdown">
          <Link
            to="#"
            className="notifications-btn"
            onClick={(e) => {
              e.preventDefault();
              setShowNotifications(!showNotifications);
            }}
          >
            <NotificationsRoundedIcon sx={{ fontSize: 24 }} />
            {userRoleRef.current &&
              notifications.filter((notif) =>
                userRoleRef.current.toLowerCase() !== "employer" || notif.type !== "job"
              ).length > 0 && (
                <span className="notification-count">
                  {notifications.filter((notif) =>
                    userRoleRef.current.toLowerCase() !== "employer" || notif.type !== "job"
                  ).length}
                </span>
              )}
          </Link>


          <div className={`notifications-dropdown ${showNotifications ? "show" : ""}`}>
            {/* {renderNotifications()} */}

            {notifications.length > 0 ? (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className="notification-item"
                  onClick={() => handleNotificationClick(notif)}
                >
                  <span>{notif.message}</span>
                  <span className="timestamp">
                    {formatTimestamp(notif.timestamp)}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent redirect when dismissing
                      dismissNotification(notif.id);
                    }}
                    className="dismiss-btn"
                  >
                    X
                  </button>
                </div>
              ))
            ) : (
              <div className="no-notifications">No notifications</div>
            )}
          </div>
        </div>
      </div>

      <GlobalNotification onNotificationsUpdate={handleNotificationsUpdate} />
      {/* <JobNotifications onNotificationsUpdate={handleNotificationsUpdate} /> */}
    </nav>
  );
};

export default Navbar;
