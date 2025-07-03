import React, { useState, useEffect } from "react";
import { set, ref, push, update, get, onValue, query, orderByChild, equalTo } from "firebase/database"; // Firebase DB functions
import { auth, db } from "../../firebase";
import "./JobBoard.css";
import { useNavigate } from "react-router-dom";
import { equal } from "assert";

const EmployerJobBoard = ({ jobs, setJobs }) => {
  const [newJob, setNewJob] = useState({
    title: "",
    description: "",
    payment: "",
    startDate: "",
    endDate: "",
  });
  const [currentJobId, setCurrentJobId] = useState(null);
  const [jobRequests, setJobRequests] = useState([]); // Store requested jobs
  const navigate = useNavigate();
  useEffect(() => {
    // Fetch jobs with "requested" status for review
    const jobRequestsRef = ref(db, "jobs/");
    onValue(jobRequestsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const requests = Object.entries(data).filter(
          ([id, job]) =>
            job.status === "requested" &&
            job.employerId === auth.currentUser?.uid
        );
        setJobRequests(requests);
      }
    });
  }, []);

  const handleAcceptRequest = async (jobId, freelancerId) => {
    const jobRef = ref(db, `jobs/${jobId}`);
    const employerId = auth.currentUser?.uid;

    try {
      // Update job status to accepted
      await update(jobRef, { status: "accepted" });

      // Update the specific request status to accepted under job requests
      const requestRef = ref(db, `jobs/${jobId}/requests/${freelancerId}`);
      await update(requestRef, { status: "accepted" });
      onValue(jobRef, snapshot =>{
        const data = snapshot.val()
        console.log(data)
       set(ref(db, `users/${freelancerId}/jobs/${jobId}`),{endDate: data.endDate, startDate: data.startDate})
      })
    

      // Fetch employer data for adding to freelancer's linkedEmployers
      const employerDataSnapshot = await get(ref(db, `users/${employerId}`));
      const employerData = employerDataSnapshot.val();
      const employerName =
        employerData.businessName ||
        `${employerData.firstname || ""} ${
          employerData.lastname || ""
        }`.trim() ||
        employerData.name ||
        "Unknown Employer";

      // Update freelancer's linked employers list with the current employer's info
      const freelancerRef = ref(
        db,
        `users/${freelancerId}/linkedEmployers/${employerId}`
      );
      await update(freelancerRef, { name: employerName, status: "accepted" });

      // Fetch freelancer data for adding to employer's acceptedFreelancers
      const freelancerDataSnapshot = await get(
        ref(db, `users/${freelancerId}`)
      );
      const freelancerData = freelancerDataSnapshot.val();
      const freelancerName =
        `${freelancerData.firstname || ""} ${
          freelancerData.lastname || ""
        }`.trim() ||
        freelancerData.name ||
        "Unknown Freelancer";

      // Update employer's accepted freelancers list with the freelancer's info
      const employerAcceptedFreelancersRef = ref(
        db,
        `users/${employerId}/acceptedFreelancers/${freelancerId}`
      );
      await update(employerAcceptedFreelancersRef, {
        name: freelancerName,
        status: "accepted",
      });

      alert("Job request accepted and relationship created.");
    } catch (error) {
      console.error("Error accepting request:", error);
      alert("Could not accept request. Please try again.");
    }
  };

  const handleDeclineRequest = async (jobId, freelancerId) => {
    const requestRef = ref(db, `jobs/${jobId}/requests/${freelancerId}`);
    try {
      await update(requestRef, { status: "rejected" });
      alert("Job request declined.");
    } catch (error) {
      console.error("Error declining job request:", error.message);
      alert("Error declining job request. Please try again.");
    }
  };

  const handleJobPost = async (e) => {
    e.preventDefault();
  
    const userId = auth.currentUser?.uid; // Employer's ID
    if (!userId) {
      alert("Only employers can post jobs.");
      return;
    }
  
    const jobRef = ref(db, "jobs/");
    const employerRef = ref(db, `users/${userId}`);
  
    try {
      // Fetch employer data including blockedUsers
      const snapshot = await get(employerRef);
      const employerData = snapshot.val();
  
      const blockedUsers = employerData.blockedUsers || {}; // Get blocked users
      console.log("Blocked users:", blockedUsers); // Debugging blocked users
  
      const newJobEntry = {
        ...newJob,
        employerId: userId,
        employerName: `${employerData.firstname} ${employerData.lastname}`,
        employerBusinessName: employerData.businessName,
        startDate: newJob.startDate,
        endDate: newJob.endDate,
        freelancerId: null,
        status: "open",
      };
  
      // Push the new job to the database
      await push(jobRef, newJobEntry);
      alert("Job posted successfully!");
  
      // Fetch all freelancers
      const usersRef = ref(db, "users");
      const freelancersSnapshot = await get(usersRef);
  
      if (freelancersSnapshot.exists()) {
        freelancersSnapshot.forEach((child) => {
          const freelancerId = child.key; // Freelancer's ID
          const freelancerData = child.val();
  
          // Skip sending notification if freelancer is blocked
          if (blockedUsers[freelancerId]?.blocked) {
            console.log(`Skipping notification for blocked freelancer: ${freelancerId}`);
            return;
          }
  
          // Only notify non-blocked freelancers
          if (freelancerData.role === "Freelancer") {
            const notificationRef = ref(db, `notifications/${freelancerId}`);
            const notification = {
              message: `New Job Posted: ${newJob.title}`,
              timestamp: Date.now(),
              type: "job",
              fromId: userId,
            };
  
            push(notificationRef, notification)
              .then(() =>
                console.log(`Notification sent to freelancer: ${freelancerId}`)
              )
              .catch((error) => {
                console.error(`Error sending notification to ${freelancerId}:`, error.message);
              });
          }
        });
      }
  
      // Reset job form
      setNewJob({
        title: "",
        description: "",
        payment: "",
        startDate: "",
        endDate: "",
      });
    } catch (error) {
      console.error("Error posting job:", error.message);
      alert("Error posting job. Please try again.");
    }
  };
  
  const handleEditClick = (jobId) => {
    setCurrentJobId((prevJobId) => (prevJobId === jobId ? null : jobId));
  };

  const handleEditJob = async (jobId) => {
    const jobRef = ref(db, `jobs/${jobId}`);
    const updates = Object.keys(newJob).reduce((change, key) => {
      if (newJob[key] !== "") {
        change[key] = newJob[key];
      }
      return change;
    }, {});
    try {
      await update(jobRef, updates);
      alert("Job updated successfully!");
      setCurrentJobId(null); // Close the edit view after saving
    } catch (error) {
      console.error("Error updating job:", error.message);
      alert("Error updating job. Please try again.");
    }
  };

  const handleViewProfile = (freelancerId) => {
    navigate(`/profile/${freelancerId}`); // Navigates to the profile page using the UID
  };

  return (
    <div>
      <h1>Manage Your Jobs</h1>
      <form onSubmit={handleJobPost} className="job-form">
        <input
          type="text"
          placeholder="Job Title"
          value={newJob.title}
          onChange={(e) => setNewJob({ ...newJob, title: e.target.value })}
          required
        />
        <textarea
          placeholder="Job Description"
          value={newJob.description}
          onChange={(e) =>
            setNewJob({ ...newJob, description: e.target.value })
          }
          required
        />
        <input
          type="number"
          placeholder="Hourly Rate ($)"
          value={newJob.payment}
          onChange={(e) => setNewJob({ ...newJob, payment: e.target.value })}
          required
        />
        <input
          type="date"
          placeholder="Start Date"
          value={newJob.startDate}
          onChange={(e) => setNewJob({ ...newJob, startDate: e.target.value })}
          required
        />
        <input
          type="date"
          placeholder="End Date"
          value={newJob.endDate}
          onChange={(e) => setNewJob({ ...newJob, endDate: e.target.value })}
          required
        />
        <button type="submit" className="submit-btn">
          Post Job
        </button>
      </form>

      <div className="job-list">
        {jobs.length > 0 ? (
          jobs
            .filter(
              ([id, job]) =>
                // new Date(job.endDate) >= new Date() &&
                job.employerId === auth.currentUser?.uid
            )
            .map(([id, job]) => (
              <div key={id} className="job-item">
                <h2>{job.title}</h2>
                <p>{job.description}</p>
                <p>Hourly Rate: ${job.payment}</p>
                <p>
                  Starts: {job.startDate} and Ends: {job.endDate}
                </p>
                <p className={`job-status ${job.status}`}>
                  Status:{" "}
                  {job.status === "open" ? "Open for Requests" : "Accepted"}
                </p>

                
              {/* Edit Job Section */}
              {job.employerId === auth.currentUser?.uid && (
                <>
                  <button onClick={() => handleEditClick(id)}>Edit Job</button>
                  {currentJobId === id && (
                    <div>
                      <input
                        type="text"
                        placeholder="Edit Job Title"
                        value={newJob.title}
                        onChange={(e) =>
                          setNewJob({ ...newJob, title: e.target.value })
                        }
                      />
                      <textarea
                        placeholder="Edit Job Description"
                        value={newJob.description}
                        onChange={(e) =>
                          setNewJob({ ...newJob, description: e.target.value })
                        }
                      />
                      <input
                        type="number"
                        placeholder="Edit Hourly Rate ($)"
                        value={newJob.payment}
                        onChange={(e) => setNewJob({ ...newJob, payment: e.target.value })}
                        required
                      />
                      <input
                        type="date"
                        placeholder="Edit Start Date"
                        value={newJob.startDate}
                        onChange={(e) => setNewJob({ ...newJob, startDate: e.target.value })}
                        required
                      />
                      <input
                        type="date"
                        placeholder="Edit End Date"
                        value={newJob.endDate}
                        onChange={(e) => setNewJob({ ...newJob, endDate: e.target.value })}
                        required
                      />
                      <button onClick={() => handleEditJob(id)}>
                        Save Changes
                      </button>
                    </div>
                  )}
                </>
              )}

                {/* Job Requests Section */}
                {job.requests && (
                  <div className="job-requests">
                    <h3>Job Requests</h3>
                    {Object.entries(job.requests).map(
                      ([freelancerId, request]) => (
                        <div key={freelancerId} className="request-item">
                          <p>Requested by: {request.freelancerName}</p>
                          <p>Request Status: {request.status}</p>
                          <button
                            onClick={() => handleViewProfile(freelancerId)}
                          >
                            View Profile
                          </button>
                          {request.status === "requested" &&
                            job.status === "open" && (
                              <>
                                <button
                                  onClick={() =>
                                    handleAcceptRequest(id, freelancerId)
                                  }
                                  className="accept-request-btn"
                                >
                                  Accept Request
                                </button>
                                <button
                                  onClick={() =>
                                    handleDeclineRequest(id, freelancerId)
                                  }
                                  className="decline-request-btn"
                                >
                                  Decline Request
                                </button>
                              </>
                            )}
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            ))
        ) : (
          <p>No jobs available at the moment.</p>
        )}
      </div>
    </div>
  );
};

export default EmployerJobBoard;
